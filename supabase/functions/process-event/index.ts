/**
 * process-event Edge Function
 *
 * Supabase Webhook으로부터 events 테이블의 INSERT 이벤트를 수신하고
 * 해당 이벤트에 맞는 이메일 발송을 트리거합니다.
 *
 * Supabase Webhook 설정:
 * - Table: events
 * - Events: INSERT
 * - URL: {SUPABASE_URL}/functions/v1/process-event
 * - HTTP Headers: Authorization: Bearer {SUPABASE_ANON_KEY}
 *
 * Webhook Payload (Supabase 자동 생성):
 * {
 *   type: 'INSERT',
 *   table: 'events',
 *   record: { id, event_type, customer_id, payload, processed, created_at },
 *   schema: 'public'
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
// Webhook 요청 검증용 시크릿 (Supabase Webhook 설정에서 동일하게 지정)
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Webhook 시크릿 검증 (설정된 경우)
  if (WEBHOOK_SECRET) {
    const authHeader = req.headers.get('x-webhook-secret')
    if (authHeader !== WEBHOOK_SECRET) {
      console.warn('Webhook 시크릿 불일치 - 요청 거부')
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let webhookPayload: {
    type: string
    table: string
    record: {
      id: string
      event_type: string
      customer_id: string
      payload: Record<string, string>
      processed: boolean
    }
    schema: string
  }

  try {
    webhookPayload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // INSERT 이벤트이고 events 테이블인지 확인
  if (webhookPayload.type !== 'INSERT' || webhookPayload.table !== 'events') {
    return new Response('처리 대상 이벤트가 아닙니다.', { status: 200 })
  }

  const { id: event_id, event_type, customer_id, payload } = webhookPayload.record

  // 이미 처리된 이벤트는 건너뜀 (중복 방지)
  if (webhookPayload.record.processed) {
    console.log(`이미 처리된 이벤트: ${event_id}`)
    return new Response('이미 처리된 이벤트입니다.', { status: 200 })
  }

  console.log(`이벤트 처리 시작: ${event_type} (id: ${event_id}, customer: ${customer_id})`)

  try {
    // send-email Edge Function 호출
    const sendEmailResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_type,
          customer_id,
          event_id,
          variables: payload,
        }),
      },
    )

    const result = await sendEmailResponse.json()

    if (!sendEmailResponse.ok || !result.success) {
      console.error(`이메일 발송 실패 (event_id: ${event_id}):`, result.error)
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    console.log(`이벤트 처리 완료: ${event_id} → resend_id: ${result.resend_id}`)

    return new Response(
      JSON.stringify({ success: true, event_id, resend_id: result.resend_id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`process-event 오류 (event_id: ${event_id}):`, errorMessage)

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
