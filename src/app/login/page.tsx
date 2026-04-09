"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Mail, Lock, ArrowRight, Wand2, Building2 } from "lucide-react";

type AuthMode = "LOGIN" | "SIGNUP" | "MAGIC_LINK";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<AuthMode>("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (mode === "SIGNUP") {
        let score = 0;
        if (password.length >= 12) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        if (score < 5) {
          alert("비밀번호는 최소 12자 이상이어야 하며, 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다.");
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("회원가입이 완료되었습니다! 슈퍼 관리자의 승인을 기다려주세요.");
        router.push("/pending");
        router.refresh();
      } else if (mode === "LOGIN") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else if (mode === "MAGIC_LINK") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
        });
        if (error) throw error;
        alert("매직 링크가 이메일로 전송되었습니다. 이메일함을 확인해주세요!");
      }
    } catch (error: any) {
      const msg: string = error.message ?? "";
      if (msg.toLowerCase().includes("email rate limit") || msg.toLowerCase().includes("rate limit")) {
        alert("이메일 발송 한도를 초과했습니다.\n잠시 후 다시 시도해주세요. (Supabase 무료 플랜 제한)");
      } else if (msg.toLowerCase().includes("invalid login credentials")) {
        alert("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        alert("이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해주세요.");
      } else {
        alert("요청 중 오류가 발생했습니다: " + msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background-primary px-4 sm:px-6 relative overflow-hidden">
      {/* 장식용 배경 요소 (Glassmorphism Effect) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] rounded-full bg-primary/10 blur-3xl opacity-60" />
      </div>

      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10 z-10 transition-all duration-500 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
        <div className="flex justify-center mb-8">
          <div className="bg-primary/10 p-4 rounded-2xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">MailBrick</h1>
          <p className="text-sm text-gray-500 font-medium">쇼핑몰 비즈니스 파트너 CRM 리모트</p>
        </div>

        {/* 탭 인터페이스 */}
        <div className="flex bg-gray-100/80 p-1 rounded-lg mb-8 relative">
          <button
            type="button"
            onClick={() => { setMode("LOGIN"); setPassword(""); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
              (mode === "LOGIN" || mode === "MAGIC_LINK") ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => { setMode("SIGNUP"); setPassword(""); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
              mode === "SIGNUP" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
              이메일 주소
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <input
                id="email"
                type="email"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                placeholder="admin@yourshop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {mode !== "MAGIC_LINK" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">
                {mode === "SIGNUP" ? "비밀번호 설정" : "비밀번호"}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white/50 focus:bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  placeholder={mode === "SIGNUP" ? "최소 12자 이상, 대/소문자, 숫자, 특수문자 포함" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              {mode === "SIGNUP" && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  {(() => {
                    let score = 0;
                    if (password.length >= 12) score += 1;
                    if (/[A-Z]/.test(password)) score += 1;
                    if (/[a-z]/.test(password)) score += 1;
                    if (/[0-9]/.test(password)) score += 1;
                    if (/[^A-Za-z0-9]/.test(password)) score += 1;
                    
                    let label = "Weak";
                    let color = "bg-danger";
                    
                    if (score > 2 && score <= 3) { label = "Medium"; color = "bg-orange-400"; }
                    else if (score === 4) { label = "Strong"; color = "bg-primary"; }
                    else if (score === 5) { label = "Very Strong"; color = "bg-success"; }

                    return (
                      <>
                        <div className="flex h-1.5 w-full gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div key={level} className={`h-full flex-1 rounded-full ${score >= level ? color : "bg-gray-200"}`} />
                          ))}
                        </div>
                        <p className={`text-xs font-semibold mt-1.5 ${score === 5 ? "text-success" : "text-gray-500"}`}>
                          보안 강도: {label}
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : mode === "LOGIN" ? (
              "로그인"
            ) : mode === "SIGNUP" ? (
              "가입 신청하기"
            ) : (
              "매직 링크로 계속하기"
            )}
            {!isLoading && <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />}
          </button>
          
          {mode === "LOGIN" && (
            <div className="mt-4 pt-1 text-center border-t border-transparent">
              <button
                type="button"
                onClick={() => setMode("MAGIC_LINK")}
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary transition-colors"
              >
                <Wand2 className="mr-1.5 h-4 w-4" />
                비밀번호 없이 매직 링크로 로그인
              </button>
            </div>
          )}
          
          {mode === "MAGIC_LINK" && (
            <div className="mt-4 pt-1 text-center">
              <button
                type="button"
                onClick={() => setMode("LOGIN")}
                className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary transition-colors"
              >
                비밀번호로 로그인하기 돌아가기
              </button>
            </div>
          )}
        </form>

        {mode === "SIGNUP" && (
          <div className="mt-6 border-t border-gray-100 pt-6 animate-in">
            <div className="bg-primary/5 rounded-lg p-4 text-sm text-primary flex gap-3 items-start shadow-sm border border-primary/10">
              <div className="mt-0.5 mt-[2px] bg-white rounded-full p-[2px]">
                <ArrowRight className="h-3 w-3" />
              </div>
              <p className="leading-snug">가입 후 슈퍼 관리자(SUPER_ADMIN)의 <strong>승인이 완료되어야</strong> 서비스 대시보드 접근이 가능합니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
