"use client";

import { ShieldAlert, Clock3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function PendingPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background-primary px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="flex justify-center mb-6">
          <div className="bg-orange-50 p-4 rounded-full text-orange-500">
            <ShieldAlert className="w-10 h-10" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-3 tracking-tight">승인 대기 중입니다</h1>
        
        <p className="text-gray-500 mb-6 leading-relaxed">
          회원가입이 성공적으로 접수되었습니다.<br/>
          정보 보호를 위해 MailBrick은 <strong>슈퍼 관리자의 승인</strong>이 완료된 후 사용하실 수 있습니다.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center gap-2 text-sm text-gray-600 mb-6">
          <Clock3 className="w-4 h-4 text-gray-400" />
          <span>관리자가 권한 검토를 진행하고 있습니다.</span>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="w-full py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          상태 새로고침
        </button>
        
        <button
          onClick={handleSignOut}
          className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 underline underline-offset-4 decoration-gray-300"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
