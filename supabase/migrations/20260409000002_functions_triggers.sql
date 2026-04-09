-- ============================================================
-- Phase 2: 트리거 함수 및 RBAC 헬퍼 함수 정의
-- ============================================================

-- ============================================================
-- updated_at 자동 갱신 함수
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 등록
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 신규 유저 가입 시 profiles 자동 생성 함수
-- auth.users INSERT → profiles INSERT (PENDING 상태)
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'PENDING'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RBAC 헬퍼 함수
-- RLS 정책 및 트리거에서 재사용
-- ============================================================

-- 현재 유저가 SUPER_ADMIN인지 확인
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- 현재 유저가 ADMIN 이상인지 확인 (ADMIN 또는 SUPER_ADMIN)
CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE;

-- ============================================================
-- role 무단 변경 방지 트리거
-- 규칙: SUPER_ADMIN만 role 변경 가능, 자신의 role은 변경 불가
-- ============================================================
CREATE OR REPLACE FUNCTION protect_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- role이 변경되는 경우에만 검사
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- SUPER_ADMIN이 아닌 경우 role 변경 차단
    -- auth.uid()가 NULL이면 서비스 롤(postgres/SQL Editor) 실행 → 허용
    IF auth.uid() IS NOT NULL AND NOT is_super_admin() THEN
      RAISE EXCEPTION 'role 변경 권한이 없습니다. SUPER_ADMIN만 변경 가능합니다.';
    END IF;

    -- SUPER_ADMIN도 자기 자신의 role은 변경 불가 (실수 방지)
    IF NEW.id = auth.uid() THEN
      RAISE EXCEPTION '자신의 role은 변경할 수 없습니다.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_protect_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_role_change();

-- ============================================================
-- 이벤트 처리 완료 마킹 함수
-- Edge Function에서 호출하여 events.processed = true 업데이트
-- ============================================================
CREATE OR REPLACE FUNCTION mark_event_processed(p_event_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.events
  SET processed = TRUE
  WHERE id = p_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
