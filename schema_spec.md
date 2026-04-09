# MailBrick 데이터베이스 스키마 명세서

> 프론트엔드 팀(Antigravity) 공유용 문서  
> 최종 업데이트: 2026-04-09

---

## 환경변수 (프론트엔드에서 필요한 항목)

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key (공개 가능) |

---

## ENUM 타입 정의

### `user_role`
| 값 | 설명 |
|----|------|
| `PENDING` | 가입 후 승인 대기 상태. 대시보드 접근 불가 |
| `ADMIN` | 승인된 일반 관리자. 모든 기능 사용 가능 |
| `SUPER_ADMIN` | 슈퍼 관리자. 유저 권한 관리 및 전체 삭제 권한 |

### `email_status`
| 값 | 설명 |
|----|------|
| `PENDING` | 발송 대기 중 |
| `SENT` | 발송 성공 |
| `FAILED` | 발송 실패 |

### `event_type`
| 값 | 설명 |
|----|------|
| `ORDER_COMPLETE` | 주문 완료 |
| `SHIPPING_START` | 배송 시작 |
| `INQUIRY_REPLY` | 문의 답변 |
| `MARKETING` | 타겟 마케팅 |

---

## 테이블 명세

### `profiles`
서비스 운영자 프로필 및 RBAC 권한 관리 테이블.  
Supabase Auth 유저와 1:1 연결됩니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` | Primary Key. `auth.users.id`와 동일 |
| `email` | `text` | 이메일 주소 |
| `name` | `text` | 표시 이름 |
| `role` | `user_role` | 권한 (기본값: `PENDING`) |
| `created_at` | `timestamptz` | 생성일시 |
| `updated_at` | `timestamptz` | 수정일시 (자동 갱신) |

**RLS 정책 요약:**
- 본인 데이터는 직접 조회/수정 가능 (단, role 필드는 SUPER_ADMIN만 변경 가능)
- SUPER_ADMIN은 전체 유저 목록 조회 및 role 변경 가능

**프론트엔드 사용 예시:**
```typescript
// 현재 로그인 유저의 프로필 조회
const { data } = await supabase
  .from('profiles')
  .select('id, email, name, role')
  .eq('id', session.user.id)
  .single()

// SUPER_ADMIN: 전체 유저 목록 조회
const { data } = await supabase
  .from('profiles')
  .select('id, email, name, role, created_at')
  .order('created_at', { ascending: false })

// SUPER_ADMIN: 유저 role 변경
const { error } = await supabase
  .from('profiles')
  .update({ role: 'ADMIN' })
  .eq('id', targetUserId)
```

---

### `customers`
쇼핑몰 고객 데이터 테이블. 타겟 마케팅 필터링에 활용됩니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` | Primary Key |
| `email` | `text` | 이메일 (unique) |
| `name` | `text` | 고객명 |
| `phone` | `text` | 전화번호 (optional) |
| `total_purchase_amount` | `numeric(12,2)` | 누적 구매액 |
| `purchase_count` | `integer` | 구매 횟수 |
| `last_purchased_at` | `timestamptz` | 최근 구매일시 |
| `tags` | `text[]` | 세그먼트 태그 (예: `['VIP', '재구매']`) |
| `metadata` | `jsonb` | 추가 고객 데이터 |
| `created_at` | `timestamptz` | 생성일시 |
| `updated_at` | `timestamptz` | 수정일시 (자동 갱신) |

**RLS 정책 요약:**
- ADMIN 이상만 조회/생성/수정 가능
- 삭제는 SUPER_ADMIN만 가능

**프론트엔드 사용 예시:**
```typescript
// 누적 구매액 20만원 이상 고객 필터링
const { data } = await supabase
  .from('customers')
  .select('id, email, name, total_purchase_amount, tags')
  .gte('total_purchase_amount', 200000)
  .order('total_purchase_amount', { ascending: false })

// VIP 태그 고객 조회
const { data } = await supabase
  .from('customers')
  .select('*')
  .contains('tags', ['VIP'])
```

---

### `email_templates`
이메일 템플릿 테이블. `{{variable}}` 형식의 치환 변수를 지원합니다.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` | Primary Key |
| `name` | `text` | 템플릿 이름 |
| `event_type` | `event_type` | 이 템플릿이 사용될 이벤트 유형 |
| `subject` | `text` | 이메일 제목 (변수 사용 가능) |
| `html_body` | `text` | HTML 본문 (변수 사용 가능) |
| `created_by` | `uuid` | 생성한 운영자 ID (profiles.id 참조) |
| `is_active` | `boolean` | 활성 여부 (기본값: true) |
| `created_at` | `timestamptz` | 생성일시 |
| `updated_at` | `timestamptz` | 수정일시 (자동 갱신) |

**사용 가능한 기본 변수:**

| 변수 | 설명 | 자동 주입 |
|------|------|-----------|
| `{{user_name}}` | 고객명 | 자동 (customers.name) |
| `{{user_email}}` | 고객 이메일 | 자동 (customers.email) |
| `{{order_id}}` | 주문 번호 | events.payload에서 전달 |
| `{{tracking_number}}` | 송장 번호 | events.payload에서 전달 |
| `{{inquiry_id}}` | 문의 번호 | events.payload에서 전달 |

> **주의:** `{{user_name}}`, `{{user_email}}`은 Edge Function에서 자동으로 주입됩니다.  
> 그 외 변수는 이벤트 생성 시 `payload` 필드에 포함해야 합니다.

**RLS 정책 요약:**
- ADMIN 이상만 조회/생성/수정 가능
- 삭제는 SUPER_ADMIN만 가능

---

### `events`
이메일 발송을 트리거하는 비즈니스 이벤트 테이블.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` | Primary Key |
| `event_type` | `event_type` | 이벤트 유형 |
| `customer_id` | `uuid` | 대상 고객 ID (customers.id 참조) |
| `payload` | `jsonb` | 이벤트 데이터 (템플릿 변수 치환에 사용) |
| `processed` | `boolean` | 이메일 발송 처리 완료 여부 |
| `created_at` | `timestamptz` | 생성일시 |

**이벤트 생성 예시:**
```typescript
// 주문 완료 이벤트 생성 → Webhook으로 자동 이메일 발송
await supabase.from('events').insert({
  event_type: 'ORDER_COMPLETE',
  customer_id: '고객-UUID',
  payload: {
    order_id: 'ORD-20260409-001',
    order_amount: '85000',
    order_items: '니트 스웨터 외 2종',
  }
})

// 배송 시작 이벤트
await supabase.from('events').insert({
  event_type: 'SHIPPING_START',
  customer_id: '고객-UUID',
  payload: {
    order_id: 'ORD-20260409-001',
    tracking_number: '1234567890',
    courier: 'CJ대한통운',
  }
})
```

**RLS 정책 요약:**
- ADMIN 이상만 조회/생성 가능
- 수정은 SUPER_ADMIN만 가능 (Edge Function은 Service Role로 우회)

---

### `email_logs`
모든 이메일 발송 이력 및 상태 로그 테이블.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | `uuid` | Primary Key |
| `template_id` | `uuid` | 사용된 템플릿 ID |
| `event_id` | `uuid` | 연결된 이벤트 ID (optional) |
| `recipient_email` | `text` | 수신자 이메일 |
| `recipient_name` | `text` | 수신자 이름 |
| `subject` | `text` | 실제 발송된 제목 (변수 치환 완료본) |
| `status` | `email_status` | 발송 상태 |
| `error_message` | `text` | 실패 시 오류 메시지 |
| `resend_id` | `text` | Resend API 메시지 ID |
| `triggered_by` | `text` | 트리거 소스 (이벤트 타입) |
| `metadata` | `jsonb` | 추가 메타데이터 |
| `sent_at` | `timestamptz` | 실제 발송 시각 |
| `created_at` | `timestamptz` | 로그 생성일시 |

**프론트엔드 사용 예시:**
```typescript
// 발송 로그 조회 (최신순, 페이지네이션)
const { data, count } = await supabase
  .from('email_logs')
  .select('*, email_templates(name, event_type)', { count: 'exact' })
  .order('created_at', { ascending: false })
  .range(0, 19) // 페이지당 20개

// 상태별 필터
const { data } = await supabase
  .from('email_logs')
  .select('*')
  .eq('status', 'FAILED')
  .order('created_at', { ascending: false })

// 대시보드 통계
const { data } = await supabase
  .from('email_logs')
  .select('status, count(*)')
  .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
```

**RLS 정책 요약:**
- ADMIN 이상만 조회/생성 가능
- 삭제는 SUPER_ADMIN만 가능

---

## Edge Function 명세

### `POST /functions/v1/send-email`
직접 이메일 발송 (수동 마케팅 발송 등에 사용).

**인증:** `Authorization: Bearer {SUPABASE_ANON_KEY}` 헤더 필요

**Request Body:**
```json
{
  "event_type": "MARKETING",
  "customer_id": "uuid",
  "event_id": "uuid (optional)",
  "variables": {
    "discount_code": "VIP20",
    "benefit_description": "20% 할인 쿠폰"
  }
}
```

**Response (성공):**
```json
{
  "success": true,
  "resend_id": "re_xxxxxxxxxxxx",
  "log_id": "uuid"
}
```

**Response (실패):**
```json
{
  "success": false,
  "error": "오류 메시지"
}
```

---

### `POST /functions/v1/process-event` (Webhook 전용)
Supabase Webhook이 자동 호출하는 내부 함수. 프론트엔드에서 직접 호출하지 않음.

---

## Webhook 설정 방법

Supabase 대시보드 → **Database > Webhooks > Create Webhook**:

| 설정 | 값 |
|------|-----|
| Name | `events-email-trigger` |
| Table | `public.events` |
| Events | `INSERT` |
| Type | `HTTP Request` |
| URL | `{SUPABASE_URL}/functions/v1/process-event` |
| Header | `x-webhook-secret: {WEBHOOK_SECRET}` |

---

## 미들웨어 권한 체크 기준 (Next.js)

```typescript
// 페이지별 접근 권한 매핑
const routeGuard = {
  '/dashboard':            ['ADMIN', 'SUPER_ADMIN'],
  '/templates':            ['ADMIN', 'SUPER_ADMIN'],
  '/logs':                 ['ADMIN', 'SUPER_ADMIN'],
  '/customers':            ['ADMIN', 'SUPER_ADMIN'],
  '/admin/users':          ['SUPER_ADMIN'],
  '/auth/pending':         ['PENDING'],  // PENDING 전용 대기 페이지
}
```

---

## 기타 참고사항

- **Edge Function에서 이메일 발송 실패 시** `email_logs.status`가 `FAILED`로 업데이트됩니다. 프론트엔드에서는 이 상태를 실시간(Supabase Realtime) 또는 주기적 폴링으로 표시할 수 있습니다.
- **PENDING 유저**는 로그인 후 `/auth/pending` 페이지로 리다이렉트해야 합니다. 미들웨어에서 `profiles.role === 'PENDING'` 조건으로 처리하세요.
- **Resend 무료 티어 제한**: 일 100건. 초과 시 Edge Function에서 429 오류가 발생하며 `email_logs.status`가 `FAILED`로 기록됩니다.
