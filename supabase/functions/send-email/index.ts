/**
 * send-email Edge Function
 *
 * 직접 API 호출 방식으로 이메일을 발송합니다.
 * process-event Webhook 함수 또는 프론트엔드(수동 발송)에서 호출됩니다.
 *
 * Request Body:
 * {
 *   event_type: 'ORDER_COMPLETE' | 'SHIPPING_START' | 'INQUIRY_REPLY' | 'MARKETING'
 *   customer_id: string (UUID)
 *   event_id?: string (UUID) - 연결된 events 테이블 row
 *   variables?: Record<string, string> - 추가 템플릿 변수
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { renderTemplate } from '../_shared/template-engine.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// 발신 이메일 주소 (Resend에서 도메인 인증 필요)
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'noreply@mailbrick.io'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS Preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  // Service Role로 Supabase 클라이언트 생성 (RLS 우회하여 로그 저장)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  let payload: {
    event_type: string
    customer_id: string
    event_id?: string
    variables?: Record<string, string>
  }

  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Request body가 유효한 JSON이 아닙니다.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const { event_type, customer_id, event_id, variables = {} } = payload

  if (!event_type || !customer_id) {
    return new Response(
      JSON.stringify({ success: false, error: 'event_type과 customer_id는 필수입니다.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  let logId: string | null = null

  try {
    // 1. 해당 이벤트 타입의 활성 템플릿 조회
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('id, name, subject, html_body')
      .eq('event_type', event_type)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (templateError || !template) {
      throw new Error(`[${event_type}] 활성화된 이메일 템플릿을 찾을 수 없습니다.`)
    }

    // 2. 고객 정보 조회
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email, name')
      .eq('id', customer_id)
      .single()

    if (customerError || !customer) {
      throw new Error(`고객을 찾을 수 없습니다. customer_id: ${customer_id}`)
    }

    // 3. 템플릿 변수 병합 (기본 변수 + 전달된 추가 변수)
    const mergedVariables: Record<string, string> = {
      user_name: customer.name,
      user_email: customer.email,
      ...variables,
    }

    const renderedSubject = renderTemplate(template.subject, mergedVariables)
    const renderedHtml = renderTemplate(template.html_body, mergedVariables)

    // 4. email_logs 레코드 생성 (PENDING 상태로 먼저 삽입)
    const { data: log, error: logError } = await supabase
      .from('email_logs')
      .insert({
        template_id: template.id,
        event_id: event_id ?? null,
        recipient_email: customer.email,
        recipient_name: customer.name,
        subject: renderedSubject,
        status: 'PENDING',
        triggered_by: event_type,
        metadata: variables,
      })
      .select('id')
      .single()

    if (logError || !log) {
      // 로그 생성 실패는 치명적이지 않으므로 경고만 출력하고 계속 진행
      console.warn('email_logs 삽입 실패:', logError?.message)
    } else {
      logId = log.id
    }

    // 5. Resend API로 이메일 발송
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [customer.email],
        subject: renderedSubject,
        html: renderedHtml,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      throw new Error(
        `Resend API 오류 (${resendResponse.status}): ${resendData.message ?? JSON.stringify(resendData)}`,
      )
    }

    // 6. 발송 성공 → 로그 업데이트
    if (logId) {
      await supabase
        .from('email_logs')
        .update({
          status: 'SENT',
          resend_id: resendData.id,
          sent_at: new Date().toISOString(),
        })
        .eq('id', logId)
    }

    // 7. 연결된 event가 있으면 processed 마킹
    if (event_id) {
      await supabase
        .from('events')
        .update({ processed: true })
        .eq('id', event_id)
    }

    console.log(`이메일 발송 성공: ${customer.email} (resend_id: ${resendData.id})`)

    return new Response(
      JSON.stringify({ success: true, resend_id: resendData.id, log_id: logId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('send-email 오류:', errorMessage)

    // 발송 실패 → 로그 상태 업데이트
    if (logId) {
      await supabase
        .from('email_logs')
        .update({
          status: 'FAILED',
          error_message: errorMessage,
        })
        .eq('id', logId)
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
