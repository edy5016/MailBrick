"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ShieldCheck, UserCheck, UserX, Clock, Shield, AlertTriangle, ArrowUpCircle, AlertCircle } from "lucide-react";

type Role = "PENDING" | "ADMIN" | "SUPER_ADMIN";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  created_at: string;
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        // 현재 로그인 유저 ID 조회
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);

        // 전체 프로필 조회 (SUPER_ADMIN RLS 정책 적용)
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          setErrorMsg(`유저 목록 조회 실패: ${error.message}`);
          return;
        }
        setProfiles(data || []);
      } catch (e: any) {
        setErrorMsg(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const handleUpdateRole = async (id: string, newRole: Role) => {
    setActionError("");
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", id);

    if (error) {
      setActionError(`권한 변경 실패: ${error.message}`);
      return;
    }
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role: newRole } : p)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 유저를 목록에서 삭제하시겠습니까?")) return;
    setActionError("");

    const { error } = await supabase.from("profiles").delete().eq("id", id);

    if (error) {
      setActionError(`삭제 실패: ${error.message}`);
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  const RoleBadge = ({ role }: { role: Role }) => {
    switch (role) {
      case "SUPER_ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-danger/10 text-danger border border-danger/20">
            <ShieldCheck className="w-3.5 h-3.5" /> 최고 관리자
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <UserCheck className="w-3.5 h-3.5" /> 운영진
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
            <Clock className="w-3.5 h-3.5" /> 대기 중
          </span>
        );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-danger/10 rounded-xl text-danger">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">슈퍼 관리자 전용 센터</h1>
          <p className="text-sm text-gray-500 mt-1">플랫폼 전체 가입 유저 목록과 권한을 통제합니다.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-danger text-sm">데이터를 불러오지 못했습니다</h3>
            <p className="text-sm text-danger/80 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {actionError && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
          <p className="text-sm text-orange-700">{actionError}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            사용자 목록
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              {isLoading ? "..." : profiles.length}
            </span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">유저 정보 (이메일)</th>
                <th className="px-6 py-4 font-medium">현재 권한</th>
                <th className="px-6 py-4 font-medium">가입일</th>
                <th className="px-6 py-4 font-medium text-right">권한 승인 및 관리 액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-400">
                    <span className="animate-pulse">유저 목록을 불러오는 중입니다...</span>
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    존재하는 유저가 없습니다.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => {
                  const isSelf = profile.id === currentUserId;
                  return (
                    <tr key={profile.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div>{profile.email}</div>
                        {profile.name && (
                          <div className="text-xs text-gray-400 mt-0.5">{profile.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={profile.role} />
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(profile.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {isSelf ? (
                            <span className="text-xs text-gray-400 font-medium px-3 py-1.5">현재 계정</span>
                          ) : profile.role === "PENDING" ? (
                            <>
                              <button
                                onClick={() => handleUpdateRole(profile.id, "ADMIN")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-success hover:bg-success/90 rounded-md transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> 승인하기
                              </button>
                              <button
                                onClick={() => handleDelete(profile.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                              >
                                <UserX className="w-3.5 h-3.5" /> 거절
                              </button>
                            </>
                          ) : profile.role === "ADMIN" ? (
                            <>
                              <button
                                onClick={() => handleUpdateRole(profile.id, "SUPER_ADMIN")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-danger bg-danger/10 hover:bg-danger/20 border border-transparent rounded-md transition-colors"
                              >
                                <ArrowUpCircle className="w-3.5 h-3.5" /> 최고 관리자로 승급
                              </button>
                              <button
                                onClick={() => handleUpdateRole(profile.id, "PENDING")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> 권한 회수
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium px-3 py-1.5">변경 불가 (슈퍼 관리자)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
