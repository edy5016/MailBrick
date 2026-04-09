import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 쿠키 기반 서버 클라이언트 생성 (환경변수 타입 안전성을 위해 Fallback 처리)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy_key",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 요청(request) 쿠키 업데이트
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          
          supabaseResponse = NextResponse.next({
            request,
          });
          
          // 응답(response) 쿠키에도 업데이트 적용
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 정보 확인 (쿠키 검증 및 리프레시 토큰 처리 역할 수행)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}
