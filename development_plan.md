# MailBrick (메일브릭) 병렬 개발 구현 계획

PRD의 요구사항을 바탕으로 프론트엔드(Antigravity)와 백엔드(ClaudeCode - Supabase MCP 사용)가 병렬로 개발을 진행하기 위한 구체적인 작업 단위와 페이즈(Phase)를 정의합니다.

## 개발 단계 및 역할 분담

프론트엔드는 Next.js + Tailwind CSS + Supabase JS Client를 활용하며, 백엔드는 Supabase (Webhooks, Edge Functions, RLS)와 Resend API를 구축합니다.

---

### Phase 1: 초기 설정 및 기반 구축 (Foundation)

#### [Frontend Tasks - Antigravity]
- Next.js (App Router), Tailwind CSS 초기 프로젝트 세팅
- PRD 디자인 가이드에 맞춘 공통 UI 디자인 시스템, 컬러 팔레트 연동 (Primary `#3B82F6`, Success `#10B981`, Danger `#EF4444`, Background `#F9FAFB`)
- Pretendard 폰트 글로벌 적용 및 반응형 레이아웃 뼈대 구축
- 주요 라우팅 페이지(로그인, 메인 대시보드, 템플릿 관리, 발송 로그, 유저 승인 페이지 등) 스켈레톤 구현

#### [Backend Tasks - ClaudeCode]
- Supabase 프로젝트 생성 및 초기 구조 세팅
- 핵심 DB 스키마 설계 및 생성 (`profiles`, `email_templates`, `email_logs`, `customers`, `events` 테이블 등)
- 데이터베이스 스키마 명세서 작성 및 프론트엔드 팀 공유
- 이메일 기반 Auth 기능 활성화

---

### Phase 2: 사용자 인증 및 권한 (RBAC) 시스템 도입

#### [Frontend Tasks - Antigravity]
- 이메일(비밀번호 포함/매직링크) 로그인 및 회원가입 UI 구축
- Next.js 미들웨어(Middleware) 기반의 페이지별 접근 제한(Route Guard) 구현
- 프로필 조회 후 권한(Role)에 따른 뷰 리다이렉트 (PENDING 상태 시 승인 대기 화면 표시)
- 슈퍼 관리자용 사용자 관리 UI (리스트업, 승인/거절 액션 토글 구현)

#### [Backend Tasks - ClaudeCode]
- `profiles` 테이블 RLS (Row Level Security) 설정 및 트리거 구현 (auth.user 생성 시 PENDING 상태의 profiles 데이터 자동 삽입)
- 인가되지 않은 권한 변경을 방지하기 위한 DB 함수 작성 (SUPER_ADMIN만 Role 변경 가능)
- 권한 기반의 테이블 접근 RLS 정책 강화

---

### Phase 3: 핵심 비즈니스 로직 및 발송 엔진 구축 (MVP Core)

#### [Frontend Tasks - Antigravity]
- 이메일 템플릿 관리 UI (생성/수정/삭제 및 `{{variable}}` 치환 대응 에디터) 구현
- 발송 로그 조회용 리스트 UI 작성 (날짜, 상태, 템플릿 종류 기반 필터링 및 페이지네이션)
- 메인 대시보드 통계 UI (Mock 데이터 우선 연동 후 실제 데이터로 교체)
- 타겟 마케팅을 위한 고객 필터링 화면 개발

#### [Backend Tasks - ClaudeCode]
- 특정 테이블(`events` 또는 `orders` 등)의 INSERT/UPDATE 감지용 Supabase Webhook 연결
- Resend API를 통한 이메일 발송용 Supabase Edge Function 개발
- Edge Function 내부 변수 템플릿 매핑 엔진 구현 (JSON Payload -> 템플릿 치환)
- 이메일 발송 성공/실패 여부를 `email_logs` 테이블에 남기는 후처리 기능 개발

---

### Phase 4: 통합 테스트 및 폴리싱 (Deployment)

#### [Collaborative Tasks]
- 프론트엔드가 생성한 폼 데이터와 백엔드 DB 간의 통합(E2E) 흐름 테스트 (가입 -> 관리자 승인 -> 템플릿 작성 -> 트리거 발송 -> 로그 조회)
- Resend API Limit 대응 구조 재점검 및 엣지 케이스 처리 (큐 도입 필요 여부 판단)
- Vercel 배포 진행 및 운영 환경용 브랜치/환경변수 적용

---

## 사전 협의 필요 사항 (Open Questions)
- **초기 슈퍼 관리자 계정**: 첫 번째 `SUPER_ADMIN` 권한을 가진 계정은 백엔드에서 초기 데이터(Seed)로 수동 삽입하는 방식을 취할지 여부 결정.
- **API / 마이크로서비스 계약**: 프론트엔드와 백엔드의 원활한 병렬 작업을 위해 Supabase 테이블 스키마 및 Edge Function의 스펙명세를 백엔드 쪽에서 먼저 정리하여 공유할 필요가 있습니다.
- **데이터 통합**: 기존 운영 중인 데이터의 마이그레이션이 Phase 1에 필요한지에 대한 확인.
