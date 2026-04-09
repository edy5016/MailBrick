-- ============================================================
-- SUPER_ADMIN 초기 계정 설정 가이드
-- ============================================================
-- 사용 방법:
-- 1. Supabase 대시보드에서 대상 계정으로 먼저 이메일 회원가입
-- 2. Supabase > Table Editor > profiles 에서 해당 유저의 id 확인
-- 3. 아래 쿼리에서 'your-email@example.com' 을 실제 이메일로 교체
-- 4. Supabase > SQL Editor 에서 실행
-- ============================================================



  -- 1. 트리거 함수 임시 우회                                                                                         
  CREATE OR REPLACE FUNCTION protect_role_change()                                                                    
  RETURNS TRIGGER AS $$
  BEGIN
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

  -- 2. SUPER_ADMIN 설정
  UPDATE public.profiles
  SET role = 'SUPER_ADMIN'
  WHERE email = 'gamut5016@gmail.com';

  -- 3. 트리거 함수 원복 (auth.uid() NULL 허용 수정 포함)
  CREATE OR REPLACE FUNCTION protect_role_change()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF auth.uid() IS NOT NULL AND NOT is_super_admin() THEN
        RAISE EXCEPTION 'role 변경 권한이 없습니다. SUPER_ADMIN만 변경 가능합니다.';
      END IF;
      IF NEW.id = auth.uid() THEN
        RAISE EXCEPTION '자신의 role은 변경할 수 없습니다.';
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 방법 1: 이메일로 찾아 role 변경 (권장)
UPDATE public.profiles
SET role = 'SUPER_ADMIN'
WHERE email = 'your-email@example.com';

-- 방법 2: UUID로 직접 지정
-- UPDATE public.profiles
-- SET role = 'SUPER_ADMIN'
-- WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- 변경 결과 확인
SELECT id, email, name, role, created_at
FROM public.profiles
WHERE role = 'SUPER_ADMIN';

-- ============================================================
-- 주의사항
-- ============================================================
-- - 이 SQL은 Supabase SQL Editor (Service Role 권한)에서만 실행 가능합니다.
-- - RLS 정책상 일반 클라이언트에서는 role 변경이 차단됩니다.
-- - SUPER_ADMIN 계정은 최소 1개, 최대 2~3개 유지를 권장합니다.
-- - 해당 계정의 이메일/비밀번호는 별도로 안전하게 보관하세요.
-- ============================================================
