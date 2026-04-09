# [PRD] 메일브릭 (MailBrick) - 쇼핑몰 자동화 CRM 서비스

## 1. 프로젝트 개요
- **이름:** 메일브릭 (MailBrick)
- **한 줄 설명:** 쇼핑몰 고객의 행동(주문, 문의 등)을 감지하여 최적의 타이밍에 맞춤형 이메일을 자동 발송하는 CRM 솔루션.
- **유형:** B2B 이커머스 운영 자동화 툴 (SaaS)
- **개발 난이도:** 중급 (DB Webhook, Edge Functions, RBAC 권한 로직 포함)

---

## 2. 사용자 시나리오
- **시나리오 1 (주문 완료):** 고객이 결제를 완료하면, 시스템이 이를 감지하여 주문 상세 내역이 담긴 감사 메일을 즉시 발송함.
- **시나리오 2 (배송 시작):** 관리자가 송장 번호를 입력하면, 고객에게 배송 추적 링크가 포함된 알림 메일을 발송함.
- **시나리오 3 (문의 대응):** 고객의 1:1 문의에 운영자가 답변을 등록하는 즉시 답변 완료 알림 메일을 발송하여 피드백 속도를 높임.
- **시나리오 4 (타겟 마케팅):** 특정 조건(예: 누적 구매액 20만 원 이상)을 충족하는 고객 그룹을 필터링하여 맞춤 혜택 메일을 발송함.

---

## 3. 핵심 기능 목록

### [필수 기능 - MVP]
1. **사용자 인증 및 권한 시스템 (Supabase Auth)**
   - 이메일 기반 회원가입/로그인.
   - 신규 가입 시 기본 상태는 `PENDING` (대시보드 접근 불가).
   - 슈퍼 관리자의 승인 후 `ADMIN` 권한 부여 시 서비스 이용 가능.
2. **슈퍼 관리자 전용 승인 페이지**
   - 가입 대기 유저 리스트 확인 및 승인/거절 기능.
   - 현재 활동 중인 운영진 권한 관리.
3. **데이터베이스 트리거 및 발송 엔진**
   - Supabase Webhook을 통한 `INSERT/UPDATE` 이벤트 감지.
   - Supabase Edge Functions + Resend API 연동 발송.
4. **이메일 템플릿 관리**
   - 이벤트별(주문/배송/문의) 템플릿 생성 및 편집.
   - 치환 변수 지원 (예: `{{user_name}}`, `{{order_id}}`).
5. **발송 히스토리 및 로그**
   - 수신자, 발송 시각, 성공 여부, 실패 사유 확인 가능한 대시보드.

### [선택 기능 - 고도화]
1. **수신 확인 트래킹:** 고객의 메일 개봉 여부 추적.
2. **드래그 앤 드롭 에디터:** HTML 없이 이메일 레이아웃 편집.
3. **예약 발송:** 특정 날짜와 시간에 마케팅 메일 예약.

---

## 4. 기술 스택
- **Frontend:** Next.js (App Router), Tailwind CSS
- **Language:** TypeScript
- **Backend/DB:** Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **Email:** Resend (React Email 라이브러리 활용)
- **Deployment:** Vercel

---

## 5. 화면 구성
1. **로그인/권한 신청:** 이메일 가입 및 승인 대기 안내 화면.
2. **메인 대시보드:** 발송 통계(성공률, 발송량) 및 최근 활동 요약.
3. **템플릿 관리:** 이메일 템플릿 목록 조회 및 에디터 화면.
4. **발송 로그:** 전체 발송 내역 상세 리스트 및 필터 검색.
5. **슈퍼 관리자 페이지:** 신규 운영진 승인 및 전체 유저 관리.
6. **고객 관리:** 쇼핑몰 유저 DB 조회 및 세그먼트 필터링.

---

## 6. 상세 기능 명세 (주요 로직)
- **RBAC (Role-Based Access Control):** - `profiles` 테이블의 `role` 컬럼에 따라 Next.js 미들웨어에서 페이지 접근 제한.
  - Supabase RLS 정책을 통해 비인가 유저의 DB Read/Write 원천 차단.
- **Variable Mapping:**
  - 발송 시 DB의 JSON 데이터를 파싱하여 템플릿 내의 `{{variable}}`을 실제 데이터로 치환.
- **Webhook Workflow:**
  - DB 변경 발생 -> Webhook 트리거 -> Edge Function 호출 -> Resend API 호출 -> 결과 전송 및 로그 저장.

---

## 7. 디자인 가이드
- **Concept:** Professional & Trustworthy (전문적이고 신뢰감 있는 관리자 도구)
- **Color Palette:**
  - Primary: `#3B82F6` (Trust Blue)
  - Success: `#10B981` (Success Green)
  - Danger: `#EF4444` (Alert Red)
  - Background: `#F9FAFB` (Neutral Gray)
- **Typography:** Pretendard (가독성 중심의 산세리프)

---

## 8. 제약 사항
- **발송 제한:** Resend 무료 티어의 일일 발송 한도 및 초당 API 요청 제한(Rate Limit) 준수.
- **데이터 보안:** 고객의 민감 정보(주소 등)는 발송 로그에 최소한으로 노출하며 마스킹 처리 고려.
- **성능:** 트리거가 동시에 대량 발생할 경우 Edge Function의 실행 제한 시간을 고려하여 큐(Queue) 처리 로직 필요 가능성 상존.