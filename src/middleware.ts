import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Supabase 세션 및 클라이언트 객체 받아오기
  const { supabaseResponse, user, supabase } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // 인증 관련 페이지 (로그인, 회원가입, 매직링크 콜백, 비밀번호 재설정 등)
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/auth");

  // 미인증 유저 제어: 로그인/가입 관련 페이지 외의 모든 보호된 라우트 접근 시 로그인으로 이동
  if (!user && !isAuthPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // 인증된 사용자의 권한 및 상태 체크
  if (user) {
    let role = 'PENDING';
    
    // DB의 profiles 테이블에서 role 조회 시도
    // (만약 아직 profile 테이블에 데이터가 없는 막 가입된 상태라면 기본값 PENDING 처리)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role) {
      role = profile.role;
    }

    const isPendingPage = pathname === '/pending';

    // 1. 승인 대기 중(PENDING)인 유저는 /pending 이외의 서비스 페이지 접근 차단
    if (role === 'PENDING' && !isPendingPage && !pathname.startsWith("/auth")) {
      const pendingUrl = request.nextUrl.clone();
      pendingUrl.pathname = '/pending';
      return NextResponse.redirect(pendingUrl);
    }

    // 2. 이미 승인이 완료된(ADMIN/SUPER_ADMIN) 유저가 /pending 페이지 접속 시 대시보드로 이동
    if (role !== 'PENDING' && isPendingPage) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      return NextResponse.redirect(dashboardUrl);
    }

    // 3. 인증된 유저가 로그인 페이지 접속 시 (콜백 제외) 대시보드로 이동
    if (isAuthPage && !pathname.startsWith("/auth/callback")) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }

    // 4. 관리자 전용 메뉴 접근 차단
    if (pathname.startsWith("/admin") && role !== 'SUPER_ADMIN') {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
