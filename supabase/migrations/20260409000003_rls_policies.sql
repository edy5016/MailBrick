-- ============================================================
-- Phase 2: RLS (Row Level Security) 정책 설정
-- ============================================================

-- ============================================================
-- RLS 활성화
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles 정책
-- ============================================================

-- 본인 프로필 조회
CREATE POLICY "profiles: 본인 조회" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- SUPER_ADMIN은 전체 유저 조회 가능 (승인 관리 목적)
CREATE POLICY "profiles: SUPER_ADMIN 전체 조회" ON profiles
  FOR SELECT
  USING (is_super_admin());

-- 본인 프로필 수정 가능 (role 변경은 protect_role_change 트리거가 차단)
CREATE POLICY "profiles: 본인 수정" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- SUPER_ADMIN은 다른 유저 프로필 수정 가능 (role 변경 포함)
CREATE POLICY "profiles: SUPER_ADMIN 전체 수정" ON profiles
  FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================
-- email_templates 정책
-- ============================================================

-- ADMIN 이상만 템플릿 조회 가능
CREATE POLICY "templates: ADMIN 이상 조회" ON email_templates
  FOR SELECT
  USING (is_admin_or_above());

-- ADMIN 이상만 템플릿 생성 가능
CREATE POLICY "templates: ADMIN 이상 생성" ON email_templates
  FOR INSERT
  WITH CHECK (is_admin_or_above());

-- ADMIN 이상만 템플릿 수정 가능
CREATE POLICY "templates: ADMIN 이상 수정" ON email_templates
  FOR UPDATE
  USING (is_admin_or_above())
  WITH CHECK (is_admin_or_above());

-- 삭제는 SUPER_ADMIN만 가능 (데이터 보호)
CREATE POLICY "templates: SUPER_ADMIN 삭제" ON email_templates
  FOR DELETE
  USING (is_super_admin());

-- ============================================================
-- email_logs 정책
-- ============================================================

-- ADMIN 이상만 발송 로그 조회 가능
CREATE POLICY "logs: ADMIN 이상 조회" ON email_logs
  FOR SELECT
  USING (is_admin_or_above());

-- 로그 INSERT는 Edge Function(Service Role)이 처리
-- 추가적으로 ADMIN 이상도 직접 삽입 허용 (수동 발송 대응)
CREATE POLICY "logs: ADMIN 이상 생성" ON email_logs
  FOR INSERT
  WITH CHECK (is_admin_or_above());

-- 로그 삭제는 SUPER_ADMIN만 가능
CREATE POLICY "logs: SUPER_ADMIN 삭제" ON email_logs
  FOR DELETE
  USING (is_super_admin());

-- ============================================================
-- customers 정책
-- ============================================================

-- ADMIN 이상만 고객 데이터 조회
CREATE POLICY "customers: ADMIN 이상 조회" ON customers
  FOR SELECT
  USING (is_admin_or_above());

-- ADMIN 이상만 고객 데이터 생성
CREATE POLICY "customers: ADMIN 이상 생성" ON customers
  FOR INSERT
  WITH CHECK (is_admin_or_above());

-- ADMIN 이상만 고객 데이터 수정
CREATE POLICY "customers: ADMIN 이상 수정" ON customers
  FOR UPDATE
  USING (is_admin_or_above())
  WITH CHECK (is_admin_or_above());

-- 삭제는 SUPER_ADMIN만 가능
CREATE POLICY "customers: SUPER_ADMIN 삭제" ON customers
  FOR DELETE
  USING (is_super_admin());

-- ============================================================
-- events 정책
-- ============================================================

-- ADMIN 이상만 이벤트 조회
CREATE POLICY "events: ADMIN 이상 조회" ON events
  FOR SELECT
  USING (is_admin_or_above());

-- ADMIN 이상만 이벤트 생성 (수동 트리거 포함)
CREATE POLICY "events: ADMIN 이상 생성" ON events
  FOR INSERT
  WITH CHECK (is_admin_or_above());

-- 이벤트 수정은 SUPER_ADMIN만 가능 (processed 플래그 등)
-- 단, Edge Function은 Service Role을 사용하므로 RLS 우회 가능
CREATE POLICY "events: SUPER_ADMIN 수정" ON events
  FOR UPDATE
  USING (is_super_admin());
