-- ============================================================
-- SUPER_ADMIN 초기 계정 설정 가이드
-- ============================================================
-- 사용 방법:
-- 1. Supabase 대시보드에서 대상 계정으로 먼저 이메일 회원가입
-- 2. Supabase > Table Editor > profiles 에서 해당 유저의 id 확인
-- 3. 아래 쿼리에서 'your-email@example.com' 을 실제 이메일로 교체
-- 4. Supabase > SQL Editor 에서 실행
-- ============================================================

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
