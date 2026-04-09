"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, X, Pencil, Trash2, ChevronLeft, RotateCcw } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────
type EventType =
  | "SIGNUP" | "EMAIL_VERIFIED" | "ORDER_COMPLETE" | "PAYMENT_FAILED"
  | "SHIPPING_START" | "SHIPPING_COMPLETE" | "REFUND_REQUEST" | "REFUND_COMPLETE"
  | "CART_ABANDONED" | "INQUIRY_CREATED" | "INQUIRY_REPLY" | "MARKETING";

interface Template {
  id: string;
  name: string;
  event_type: EventType;
  subject: string;
  html_body: string;
  is_active: boolean;
  created_at: string;
}

interface FormState {
  name: string;
  subject: string;
  html_body: string;   // 항상 HTML로 저장 (DB 저장값)
  text_body: string;   // 일반 텍스트 모드 편집용 (UI 전용)
  body_mode: "html" | "text";
  is_active: boolean;
}

// ─────────────────────────────────────────────────────────────
// 텍스트 ↔ HTML 변환 유틸리티
// ─────────────────────────────────────────────────────────────

/** 일반 텍스트 → 이메일용 HTML 변환 */
function textToHtml(text: string): string {
  // HTML 특수문자 이스케이프 ({{변수}} 중괄호는 건드리지 않음)
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 빈 줄(두 번 개행) 기준으로 단락 분리
  const paragraphs = escaped.split(/\n\n+/).filter((p) => p.trim());
  const bodyContent = paragraphs
    .map(
      (p) =>
        `<p style="font-size:15px;line-height:1.8;color:#444;margin:0 0 18px;">${p.replace(/\n/g, "<br />")}</p>`
    )
    .join("\n  ");

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;color:#333;">
  ${bodyContent || '<p style="font-size:15px;line-height:1.8;color:#444;margin:0;"></p>'}
  <hr style="border:none;border-top:1px solid #eee;margin:36px 0;" />
  <p style="font-size:12px;color:#aaa;margin:0;">본 메일은 발신 전용입니다.</p>
</div>`;
}

/** 이메일 HTML → 일반 텍스트 추출 */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/p>/gi, "")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<h[1-6][^>]*>/gi, "")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<hr[^>]*/gi, "")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type ModalState =
  | { open: false }
  | { open: true; mode: "create"; step: "type" }
  | { open: true; mode: "create"; step: "form"; event_type: EventType; form: FormState }
  | { open: true; mode: "edit"; template: Template; form: FormState };

// ─────────────────────────────────────────────────────────────
// 이벤트 유형 메타데이터
// ─────────────────────────────────────────────────────────────
const EVENT_TYPE_META: Record<EventType, { label: string; description: string; icon: string; color: string }> = {
  SIGNUP:           { label: "회원가입",      description: "신규 회원 가입 시",   icon: "👋", color: "bg-blue-50 border-blue-200 text-blue-700" },
  EMAIL_VERIFIED:   { label: "이메일 인증",   description: "이메일 인증 완료 시", icon: "✅", color: "bg-green-50 border-green-200 text-green-700" },
  ORDER_COMPLETE:   { label: "주문 완료",     description: "주문 완료 시",        icon: "🛍️", color: "bg-purple-50 border-purple-200 text-purple-700" },
  PAYMENT_FAILED:   { label: "결제 실패",     description: "결제 실패 시",        icon: "❌", color: "bg-red-50 border-red-200 text-red-700" },
  SHIPPING_START:   { label: "배송 시작",     description: "배송 출발 시",        icon: "🚚", color: "bg-orange-50 border-orange-200 text-orange-700" },
  SHIPPING_COMPLETE:{ label: "배송 완료",     description: "배송 완료 시",        icon: "📦", color: "bg-teal-50 border-teal-200 text-teal-700" },
  REFUND_REQUEST:   { label: "환불 요청",     description: "환불 요청 접수 시",   icon: "↩️", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  REFUND_COMPLETE:  { label: "환불 완료",     description: "환불 처리 완료 시",   icon: "💰", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  CART_ABANDONED:   { label: "장바구니 이탈", description: "장바구니 이탈 시",    icon: "🛒", color: "bg-pink-50 border-pink-200 text-pink-700" },
  INQUIRY_CREATED:  { label: "문의 접수",     description: "고객 문의 접수 시",   icon: "💬", color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  INQUIRY_REPLY:    { label: "문의 답변",     description: "문의 답변 등록 시",   icon: "📨", color: "bg-cyan-50 border-cyan-200 text-cyan-700" },
  MARKETING:        { label: "마케팅",        description: "마케팅 발송",          icon: "📢", color: "bg-rose-50 border-rose-200 text-rose-700" },
};

// ─────────────────────────────────────────────────────────────
// 이벤트 유형별 사용 가능한 변수
// ─────────────────────────────────────────────────────────────
const EVENT_VARIABLES: Record<EventType, string[]> = {
  SIGNUP:            ["{{user_name}}", "{{user_email}}", "{{shop_url}}"],
  EMAIL_VERIFIED:    ["{{user_name}}", "{{user_email}}"],
  ORDER_COMPLETE:    ["{{user_name}}", "{{order_id}}", "{{order_amount}}", "{{order_items}}", "{{shop_url}}"],
  PAYMENT_FAILED:    ["{{user_name}}", "{{order_id}}", "{{order_amount}}", "{{payment_method}}"],
  SHIPPING_START:    ["{{user_name}}", "{{order_id}}", "{{tracking_number}}", "{{courier_name}}"],
  SHIPPING_COMPLETE: ["{{user_name}}", "{{order_id}}", "{{tracking_number}}"],
  REFUND_REQUEST:    ["{{user_name}}", "{{order_id}}", "{{refund_amount}}", "{{reason}}"],
  REFUND_COMPLETE:   ["{{user_name}}", "{{order_id}}", "{{refund_amount}}"],
  CART_ABANDONED:    ["{{user_name}}", "{{cart_items}}", "{{cart_total}}", "{{shop_url}}"],
  INQUIRY_CREATED:   ["{{user_name}}", "{{inquiry_id}}", "{{inquiry_content}}"],
  INQUIRY_REPLY:     ["{{user_name}}", "{{inquiry_id}}", "{{reply_content}}"],
  MARKETING:         ["{{user_name}}", "{{user_email}}", "{{promotion_title}}", "{{promotion_url}}"],
};

// ─────────────────────────────────────────────────────────────
// 이벤트 유형별 예시 콘텐츠
// ─────────────────────────────────────────────────────────────
const BASE_STYLE = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; color: #333;`;
const H2_STYLE  = `font-size: 22px; font-weight: 700; margin: 0 0 12px;`;
const P_STYLE   = `font-size: 15px; line-height: 1.7; color: #555; margin: 0 0 20px;`;
const BOX_STYLE = `background: #f5f5f5; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px;`;
const BTN_STYLE = `display: inline-block; padding: 13px 28px; background: #3B82F6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;`;
const HR_STYLE  = `border: none; border-top: 1px solid #eee; margin: 36px 0;`;
const FOOT_STYLE= `font-size: 12px; color: #aaa; margin: 0;`;

const EVENT_EXAMPLES: Record<EventType, { name: string; subject: string; html_body: string }> = {
  SIGNUP: {
    name: "회원가입 환영 메일",
    subject: "{{user_name}}님, 오신 것을 환영합니다! 🎉",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">{{user_name}}님, 환영합니다! 👋</h2>
  <p style="${P_STYLE}">회원가입을 완료해 주셔서 감사합니다.<br />이제 다양한 상품을 만나보세요!</p>
  <a href="{{shop_url}}" style="${BTN_STYLE}">쇼핑 시작하기</a>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">본 메일은 발신 전용입니다.</p>
</div>`,
  },
  EMAIL_VERIFIED: {
    name: "이메일 인증 완료 안내",
    subject: "{{user_name}}님, 이메일 인증이 완료되었습니다",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">이메일 인증 완료 ✅</h2>
  <p style="${P_STYLE}">{{user_name}}님의 이메일 주소(<strong>{{user_email}}</strong>)가 성공적으로 인증되었습니다.</p>
  <p style="${P_STYLE}">이제 모든 서비스를 정상적으로 이용하실 수 있습니다.</p>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">본 메일은 발신 전용입니다.</p>
</div>`,
  },
  ORDER_COMPLETE: {
    name: "주문 완료 확인 메일",
    subject: "{{user_name}}님의 주문({{order_id}})이 완료되었습니다",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">주문이 완료되었습니다 🛍️</h2>
  <p style="${P_STYLE}">{{user_name}}님, 주문해 주셔서 감사합니다.</p>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">주문 번호</p>
    <p style="margin:0; font-size:17px; font-weight:700;">{{order_id}}</p>
  </div>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">결제 금액</p>
    <p style="margin:0; font-size:17px; font-weight:700;">{{order_amount}}원</p>
  </div>
  <p style="${P_STYLE}">배송이 시작되면 별도로 안내드리겠습니다.</p>
  <a href="{{shop_url}}" style="${BTN_STYLE}">주문 내역 확인</a>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">본 메일은 발신 전용입니다.</p>
</div>`,
  },
  PAYMENT_FAILED: {
    name: "결제 실패 안내",
    subject: "⚠️ {{user_name}}님, 결제가 실패했습니다 — 확인이 필요합니다",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">결제가 실패했습니다 ❌</h2>
  <p style="${P_STYLE}">{{user_name}}님, 주문({{order_id}}) 결제 처리 중 문제가 발생했습니다.</p>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">결제 수단</p>
    <p style="margin:0; font-weight:600;">{{payment_method}}</p>
  </div>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">결제 시도 금액</p>
    <p style="margin:0; font-weight:600;">{{order_amount}}원</p>
  </div>
  <p style="${P_STYLE}">카드사 또는 결제 수단을 확인 후 다시 시도해 주세요.</p>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">문제가 지속되면 고객센터로 문의해 주세요.</p>
</div>`,
  },
  SHIPPING_START: {
    name: "배송 시작 안내",
    subject: "{{user_name}}님의 주문이 출발했습니다 🚚",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">배송이 시작되었습니다 🚚</h2>
  <p style="${P_STYLE}">{{user_name}}님의 주문 상품이 출발했습니다!</p>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">주문 번호</p>
    <p style="margin:0; font-weight:600;">{{order_id}}</p>
  </div>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">택배사 / 운송장 번호</p>
    <p style="margin:0; font-weight:600;">{{courier_name}} / {{tracking_number}}</p>
  </div>
  <p style="${P_STYLE}">곧 만나요! 배송 완료 후 별도 안내드립니다.</p>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">본 메일은 발신 전용입니다.</p>
</div>`,
  },
  SHIPPING_COMPLETE: {
    name: "배송 완료 안내",
    subject: "{{user_name}}님, 주문하신 상품이 도착했습니다 📦",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">배송이 완료되었습니다 📦</h2>
  <p style="${P_STYLE}">{{user_name}}님, 주문하신 상품이 도착했습니다. 마음에 드셨으면 좋겠습니다!</p>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">주문 번호</p>
    <p style="margin:0; font-weight:600;">{{order_id}}</p>
  </div>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">운송장 번호</p>
    <p style="margin:0; font-weight:600;">{{tracking_number}}</p>
  </div>
  <p style="${P_STYLE}">상품에 문제가 있으시면 고객센터로 연락 주세요.</p>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">본 메일은 발신 전용입니다.</p>
</div>`,
  },
  REFUND_REQUEST: {
    name: "환불 요청 접수 안내",
    subject: "{{user_name}}님의 환불 요청이 접수되었습니다",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">환불 요청이 접수되었습니다 ↩️</h2>
  <p style="${P_STYLE}">{{user_name}}님의 환불 요청을 접수했습니다. 검토 후 처리하겠습니다.</p>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">주문 번호</p>
    <p style="margin:0; font-weight:600;">{{order_id}}</p>
  </div>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">환불 요청 금액</p>
    <p style="margin:0; font-weight:600;">{{refund_amount}}원</p>
  </div>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">사유</p>
    <p style="margin:0;">{{reason}}</p>
  </div>
  <p style="${P_STYLE}">처리 완료 시 별도로 안내드리겠습니다.</p>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">본 메일은 발신 전용입니다.</p>
</div>`,
  },
  REFUND_COMPLETE: {
    name: "환불 완료 안내",
    subject: "{{user_name}}님, 환불이 완료되었습니다 💰",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">환불이 완료되었습니다 💰</h2>
  <p style="${P_STYLE}">{{user_name}}님의 환불 처리가 완료되었습니다.</p>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">주문 번호</p>
    <p style="margin:0; font-weight:600;">{{order_id}}</p>
  </div>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">환불 금액</p>
    <p style="margin:0; font-size:18px; font-weight:700; color:#10B981;">{{refund_amount}}원</p>
  </div>
  <p style="${P_STYLE}">카드사 환불의 경우 영업일 기준 3~5일 소요될 수 있습니다.</p>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">본 메일은 발신 전용입니다.</p>
</div>`,
  },
  CART_ABANDONED: {
    name: "장바구니 이탈 리마인더",
    subject: "{{user_name}}님, 장바구니에 담아두신 상품이 있어요 🛒",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">혹시 잊으셨나요? 🛒</h2>
  <p style="${P_STYLE}">{{user_name}}님, 장바구니에 담아두신 상품이 아직 남아 있어요!</p>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">장바구니 상품</p>
    <p style="margin:0;">{{cart_items}}</p>
  </div>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">합계 금액</p>
    <p style="margin:0; font-size:18px; font-weight:700;">{{cart_total}}원</p>
  </div>
  <p style="${P_STYLE}">지금 바로 구매하고 혜택을 누려보세요!</p>
  <a href="{{shop_url}}" style="${BTN_STYLE}">장바구니 바로가기</a>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">본 메일은 발신 전용입니다.</p>
</div>`,
  },
  INQUIRY_CREATED: {
    name: "문의 접수 확인 메일",
    subject: "{{user_name}}님의 문의가 접수되었습니다 ({{inquiry_id}})",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">문의가 접수되었습니다 💬</h2>
  <p style="${P_STYLE}">{{user_name}}님의 문의를 접수했습니다. 빠른 시일 내에 답변드리겠습니다.</p>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">문의 번호</p>
    <p style="margin:0; font-weight:600;">{{inquiry_id}}</p>
  </div>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 4px; font-size:12px; color:#888;">문의 내용</p>
    <p style="margin:0;">{{inquiry_content}}</p>
  </div>
  <p style="${P_STYLE}">답변 등록 시 별도 이메일로 안내드리겠습니다.</p>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">본 메일은 발신 전용입니다.</p>
</div>`,
  },
  INQUIRY_REPLY: {
    name: "문의 답변 알림",
    subject: "{{user_name}}님, 문의하신 내용에 답변이 등록되었습니다 📨",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">문의 답변이 등록되었습니다 📨</h2>
  <p style="${P_STYLE}">{{user_name}}님이 남기신 문의({{inquiry_id}})에 답변이 달렸습니다.</p>
  <div style="${BOX_STYLE}">
    <p style="margin:0 0 8px; font-size:12px; color:#888;">답변 내용</p>
    <p style="margin:0; line-height:1.7;">{{reply_content}}</p>
  </div>
  <p style="${P_STYLE}">추가 문의사항이 있으시면 언제든지 문의해 주세요.</p>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">본 메일은 발신 전용입니다.</p>
</div>`,
  },
  MARKETING: {
    name: "마케팅 이메일",
    subject: "{{user_name}}님을 위한 특별 혜택을 준비했습니다 📢",
    html_body:
`<div style="${BASE_STYLE}">
  <h2 style="${H2_STYLE}">{{promotion_title}} 📢</h2>
  <p style="${P_STYLE}">{{user_name}}님, 특별히 준비한 혜택을 확인해 보세요!</p>
  <p style="${P_STYLE}">이번 기회를 놓치지 마세요. 기간 한정 특가입니다.</p>
  <a href="{{promotion_url}}" style="${BTN_STYLE}">혜택 확인하기</a>
  <hr style="${HR_STYLE}" />
  <p style="${FOOT_STYLE}">
    수신을 원하지 않으시면 설정에서 마케팅 수신을 해제해 주세요.<br />
    이메일: {{user_email}}
  </p>
</div>`,
  },
};

// ─────────────────────────────────────────────────────────────
// 헬퍼: 모달에서 현재 form / event_type 꺼내기
// ─────────────────────────────────────────────────────────────
function getModalForm(modal: ModalState): FormState | null {
  if (!modal.open) return null;
  if (modal.mode === "create" && modal.step === "form") return modal.form;
  if (modal.mode === "edit") return modal.form;
  return null;
}
function getModalEventType(modal: ModalState): EventType | null {
  if (!modal.open) return null;
  if (modal.mode === "create" && modal.step === "form") return modal.event_type;
  if (modal.mode === "edit") return modal.template.event_type;
  return null;
}

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [modal, setModal]         = useState<ModalState>({ open: false });

  const supabase = createClient();

  // 템플릿 목록 조회
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setTemplates((data as Template[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // 모달 열기/닫기
  const openCreate = () => setModal({ open: true, mode: "create", step: "type" });
  const openEdit   = (t: Template) =>
    setModal({ open: true, mode: "edit", template: t,
      form: { name: t.name, subject: t.subject, html_body: t.html_body,
              text_body: htmlToText(t.html_body), body_mode: "html", is_active: t.is_active } });
  const closeModal = () => setModal({ open: false });

  // 이벤트 유형 선택 (생성 플로우 step 2로 이동)
  const selectEventType = (et: EventType) => {
    const ex = EVENT_EXAMPLES[et];
    setModal({ open: true, mode: "create", step: "form", event_type: et,
      form: { name: ex.name, subject: ex.subject, html_body: ex.html_body,
              text_body: htmlToText(ex.html_body), body_mode: "html", is_active: true } });
  };

  // form 필드 업데이트
  const updateForm = (field: keyof FormState, value: string | boolean) => {
    const form = getModalForm(modal);
    if (!form || !modal.open) return;
    const updated = { ...form, [field]: value };
    if (modal.mode === "create" && modal.step === "form")
      setModal({ ...modal, form: updated });
    else if (modal.mode === "edit")
      setModal({ ...modal, form: updated });
  };

  // 본문 편집 모드 전환 (text ↔ html)
  const switchBodyMode = (nextMode: "html" | "text") => {
    const form = getModalForm(modal);
    if (!form || !modal.open || form.body_mode === nextMode) return;

    let updated: FormState;
    if (nextMode === "html") {
      // 일반 텍스트 → HTML 변환
      updated = { ...form, body_mode: "html", html_body: textToHtml(form.text_body) };
    } else {
      // HTML → 일반 텍스트 추출
      updated = { ...form, body_mode: "text", text_body: htmlToText(form.html_body) };
    }

    if (modal.mode === "create" && modal.step === "form")
      setModal({ ...modal, form: updated });
    else if (modal.mode === "edit")
      setModal({ ...modal, form: updated });
  };

  // 예시 내용 다시 적용
  const applyExample = () => {
    const et = getModalEventType(modal);
    const form = getModalForm(modal);
    if (!et || !form || !modal.open) return;
    const ex = EVENT_EXAMPLES[et];
    const updated: FormState = {
      ...form,
      name: ex.name,
      subject: ex.subject,
      html_body: ex.html_body,
      text_body: htmlToText(ex.html_body),
      // 현재 모드 유지
    };
    if (modal.mode === "create" && modal.step === "form")
      setModal({ ...modal, form: updated });
    else if (modal.mode === "edit")
      setModal({ ...modal, form: updated });
  };

  // 저장 (생성 또는 수정)
  const handleSave = async () => {
    const form = getModalForm(modal);
    const et   = getModalEventType(modal);
    if (!form || !et || !modal.open) return;
    setSaving(true);
    setError(null);

    // 일반 텍스트 모드라면 저장 직전에 HTML로 변환
    const finalHtml = form.body_mode === "text"
      ? textToHtml(form.text_body)
      : form.html_body;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (modal.mode === "create") {
        const { error } = await supabase.from("email_templates").insert({
          name: form.name, event_type: et, subject: form.subject,
          html_body: finalHtml, is_active: form.is_active, created_by: user?.id,
        });
        if (error) throw error;
      } else if (modal.mode === "edit") {
        const { error } = await supabase.from("email_templates")
          .update({ name: form.name, subject: form.subject, html_body: finalHtml, is_active: form.is_active })
          .eq("id", modal.template.id);
        if (error) throw error;
      }
      closeModal();
      fetchTemplates();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 활성/비활성 토글
  const handleToggleActive = async (t: Template) => {
    const { error } = await supabase.from("email_templates")
      .update({ is_active: !t.is_active }).eq("id", t.id);
    if (!error) fetchTemplates();
  };

  // 삭제 (SUPER_ADMIN만 성공 — RLS 적용)
  const handleDelete = async (id: string) => {
    if (!confirm("이 템플릿을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) setError(error.message);
    else fetchTemplates();
  };

  // 현재 modal form / eventType
  const modalForm      = getModalForm(modal);
  const modalEventType = getModalEventType(modal);

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">이메일 템플릿 관리</h1>
          <p className="text-sm text-gray-500 mt-1">이벤트별 자동 발송 이메일 템플릿을 관리합니다</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          새 템플릿
        </button>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 템플릿 목록 */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm p-10 text-center text-gray-400 text-sm">불러오는 중...</div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-20 text-center">
          <p className="text-gray-400 text-sm mb-3">등록된 템플릿이 없습니다</p>
          <button onClick={openCreate} className="text-primary text-sm hover:underline font-medium">첫 번째 템플릿 추가하기 →</button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left font-medium text-gray-500 text-xs px-6 py-3">이벤트 유형</th>
                <th className="text-left font-medium text-gray-500 text-xs px-6 py-3">템플릿 이름</th>
                <th className="text-left font-medium text-gray-500 text-xs px-6 py-3">제목</th>
                <th className="text-left font-medium text-gray-500 text-xs px-6 py-3">상태</th>
                <th className="text-right font-medium text-gray-500 text-xs px-6 py-3">관리</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const meta = EVENT_TYPE_META[t.event_type];
                return (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.color}`}>
                        <span>{meta.icon}</span>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{t.name}</td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs">
                      <span className="block truncate">{t.subject}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(t)}
                        className="flex items-center gap-1.5 text-xs cursor-pointer group"
                        title={t.is_active ? "클릭하여 비활성화" : "클릭하여 활성화"}
                      >
                        <span className={`w-2 h-2 rounded-full ${t.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                        <span className={t.is_active ? "text-green-600" : "text-gray-400"}>
                          {t.is_active ? "활성" : "비활성"}
                        </span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="수정"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── 모달 ─── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 배경 오버레이 */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

          {/* 모달 패널 */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                {modal.mode === "create" && modal.step === "form" && (
                  <button
                    onClick={() => setModal({ open: true, mode: "create", step: "type" })}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="text-base font-semibold">
                  {modal.mode === "create"
                    ? modal.step === "type" ? "이벤트 유형 선택" : "새 템플릿 만들기"
                    : "템플릿 수정"}
                </h2>
              </div>
              <button onClick={closeModal} className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="overflow-y-auto flex-1">
              <div className="p-6">

                {/* ── Step 1: 이벤트 유형 선택 ── */}
                {modal.mode === "create" && modal.step === "type" && (
                  <div>
                    <p className="text-sm text-gray-500 mb-4">이 템플릿이 사용될 이벤트 유형을 선택하세요.</p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {(Object.entries(EVENT_TYPE_META) as [EventType, typeof EVENT_TYPE_META[EventType]][]).map(([et, meta]) => (
                        <button
                          key={et}
                          onClick={() => selectEventType(et)}
                          className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.99] ${meta.color}`}
                        >
                          <span className="text-xl">{meta.icon}</span>
                          <span className="font-semibold text-sm">{meta.label}</span>
                          <span className="text-xs opacity-70 leading-tight">{meta.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 2 / 수정: 템플릿 폼 ── */}
                {modalForm && modalEventType && (
                  <div className="space-y-5">
                    {/* 이벤트 유형 배지 + 예시 적용 버튼 */}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border ${EVENT_TYPE_META[modalEventType].color}`}>
                        <span>{EVENT_TYPE_META[modalEventType].icon}</span>
                        {EVENT_TYPE_META[modalEventType].label}
                      </span>
                      <button
                        onClick={applyExample}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors"
                        title="예시 내용으로 초기화"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        예시 내용 적용
                      </button>
                    </div>

                    {/* 사용 가능한 변수 안내 */}
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700 leading-relaxed">
                      <span className="font-semibold">사용 가능한 변수: </span>
                      {EVENT_VARIABLES[modalEventType].join("  ")}
                    </div>

                    {/* 템플릿 이름 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">템플릿 이름</label>
                      <input
                        type="text"
                        value={modalForm.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        placeholder="예: 주문 완료 확인 메일"
                      />
                    </div>

                    {/* 이메일 제목 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일 제목</label>
                      <input
                        type="text"
                        value={modalForm.subject}
                        onChange={(e) => updateForm("subject", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        placeholder="예: {{user_name}}님의 주문이 완료되었습니다"
                      />
                    </div>

                    {/* 이메일 본문 */}
                    <div>
                      {/* 레이블 + 모드 토글 */}
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-medium text-gray-700">이메일 본문</label>
                        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 text-xs">
                          <button
                            type="button"
                            onClick={() => switchBodyMode("text")}
                            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                              modalForm.body_mode === "text"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            일반 텍스트
                          </button>
                          <button
                            type="button"
                            onClick={() => switchBodyMode("html")}
                            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                              modalForm.body_mode === "html"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            HTML
                          </button>
                        </div>
                      </div>

                      {/* 일반 텍스트 모드 */}
                      {modalForm.body_mode === "text" && (
                        <>
                          <p className="text-xs text-gray-400 mb-2">
                            일반 텍스트로 작성하면 저장 시 자동으로 이메일 HTML로 변환됩니다.
                            빈 줄로 문단을 구분하고, <code className="bg-gray-100 px-1 rounded">{"{{변수}}"}</code>는 그대로 사용하세요.
                          </p>
                          <textarea
                            value={modalForm.text_body}
                            onChange={(e) => updateForm("text_body", e.target.value)}
                            rows={14}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y leading-relaxed"
                            placeholder={`예시:\n{{user_name}}님, 환영합니다!\n\n회원가입을 완료해 주셔서 감사합니다.\n이제 다양한 혜택을 누려보세요.\n\n문의사항은 고객센터로 연락해 주세요.`}
                          />
                        </>
                      )}

                      {/* HTML 모드 */}
                      {modalForm.body_mode === "html" && (
                        <>
                          <p className="text-xs text-gray-400 mb-2">
                            HTML을 직접 입력합니다. 인라인 스타일을 사용하면 이메일 클라이언트 호환성이 높아집니다.
                          </p>
                          <textarea
                            value={modalForm.html_body}
                            onChange={(e) => updateForm("html_body", e.target.value)}
                            rows={14}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-y leading-relaxed"
                            placeholder="HTML 본문을 입력하세요 ({{변수}} 형식으로 치환 가능)"
                          />
                        </>
                      )}
                    </div>

                    {/* 활성 토글 */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateForm("is_active", !modalForm.is_active)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${modalForm.is_active ? "bg-primary" : "bg-gray-200"}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${modalForm.is_active ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                      <span className="text-sm text-gray-600">
                        {modalForm.is_active ? "활성화됨 — 이벤트 발생 시 자동 발송" : "비활성화 — 이벤트 발생 시 발송 안 됨"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 모달 푸터 (폼 단계에서만 표시) */}
            {modalForm && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50 rounded-b-2xl">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !modalForm.name.trim() || !modalForm.subject.trim() ||
                    (modalForm.body_mode === "html" ? !modalForm.html_body.trim() : !modalForm.text_body.trim())}
                  className="px-6 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {saving ? "저장 중..." : modal.mode === "edit" ? "수정 완료" : "템플릿 저장"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
