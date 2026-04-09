import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  // signOut() 이후 Supabase가 setAll로 내려주는 쿠키 변경사항을 수집
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy_key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) => pendingCookies.push(c));
        },
      },
    }
  );

  await supabase.auth.signOut();

  // 요청 origin 기반으로 리다이렉트 URL 생성
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  const response = NextResponse.redirect(redirectUrl);

  // 세션 쿠키 삭제 지시를 redirect 응답에 직접 적용
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  return response;
}
