-- ============================================================
-- Phase 1: 핵심 DB 스키마 생성
-- ============================================================

-- ENUM 타입 정의
CREATE TYPE user_role AS ENUM ('PENDING', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE email_status AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE event_type AS ENUM ('ORDER_COMPLETE', 'SHIPPING_START', 'INQUIRY_REPLY', 'MARKETING');

-- ============================================================
-- 1. profiles 테이블
-- Supabase Auth 유저와 1:1 연결, RBAC 권한 관리
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  name        TEXT,
  role        user_role NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS '서비스 운영자 프로필 및 권한 테이블';
COMMENT ON COLUMN profiles.role IS 'PENDING: 승인 대기, ADMIN: 일반 관리자, SUPER_ADMIN: 슈퍼 관리자';

-- ============================================================
-- 2. customers 테이블
-- 쇼핑몰 고객 데이터 (타겟 마케팅 필터링 기반)
-- ============================================================
CREATE TABLE customers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                   TEXT NOT NULL UNIQUE,
  name                    TEXT NOT NULL,
  phone                   TEXT,
  total_purchase_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  purchase_count          INTEGER NOT NULL DEFAULT 0,
  last_purchased_at       TIMESTAMPTZ,
  tags                    TEXT[] DEFAULT '{}',
  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE customers IS '쇼핑몰 고객 데이터 테이블';
COMMENT ON COLUMN customers.tags IS '세그먼트 태그 (예: VIP, 재구매, 휴면)';
COMMENT ON COLUMN customers.metadata IS '추가 고객 데이터 (자유 형식 JSON)';

-- ============================================================
-- 3. email_templates 테이블
-- 이벤트별 이메일 템플릿, {{variable}} 치환 변수 지원
-- ============================================================
CREATE TABLE email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  event_type  event_type NOT NULL,
  subject     TEXT NOT NULL,
  html_body   TEXT NOT NULL,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_templates IS '이메일 템플릿 테이블. {{variable}} 형식의 치환 변수를 지원합니다.';
COMMENT ON COLUMN email_templates.event_type IS '이 템플릿이 사용될 이벤트 유형';
COMMENT ON COLUMN email_templates.html_body IS 'HTML 본문. {{user_name}}, {{order_id}} 등 변수 사용 가능';

-- ============================================================
-- 4. events 테이블
-- 비즈니스 이벤트 (주문, 배송, 문의). Webhook으로 이메일 발송 트리거
-- ============================================================
CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  event_type NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  processed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE events IS '이메일 발송을 트리거하는 비즈니스 이벤트 테이블';
COMMENT ON COLUMN events.payload IS '이벤트 상세 데이터 (주문번호, 송장번호 등). 템플릿 변수 치환에 사용됨';
COMMENT ON COLUMN events.processed IS '이메일 발송 처리 완료 여부';

-- ============================================================
-- 5. email_logs 테이블
-- 모든 이메일 발송 이력 (성공/실패 추적)
-- ============================================================
CREATE TABLE email_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name  TEXT,
  subject         TEXT NOT NULL,
  status          email_status NOT NULL DEFAULT 'PENDING',
  error_message   TEXT,
  resend_id       TEXT,
  triggered_by    TEXT,
  metadata        JSONB DEFAULT '{}',
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE email_logs IS '이메일 발송 히스토리 및 상태 로그 테이블';
COMMENT ON COLUMN email_logs.resend_id IS 'Resend API에서 반환된 메시지 ID';
COMMENT ON COLUMN email_logs.triggered_by IS '발송 트리거 소스 (이벤트 타입 또는 수동)';

-- ============================================================
-- 인덱스 생성 (조회 성능 최적화)
-- ============================================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_email_logs_template_id ON email_logs(template_id);
CREATE INDEX idx_events_processed ON events(processed);
CREATE INDEX idx_events_customer_id ON events(customer_id);
CREATE INDEX idx_customers_total_purchase ON customers(total_purchase_amount DESC);
CREATE INDEX idx_customers_email ON customers(email);
