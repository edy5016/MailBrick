"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle2, XCircle, Clock, AlertCircle, Search } from "lucide-react";

type EmailLog = {
  id: string;
  subject: string;
  recipient_email: string;
  recipient_name: string | null;
  triggered_by: string | null;
  status: "SENT" | "FAILED" | "PENDING";
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
};

type StatusFilter = "ALL" | "SENT" | "FAILED" | "PENDING";

export default function LogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const supabase = createClient();

  useEffect(() => {
    async function fetchLogs() {
      try {
        const { data, error } = await supabase
          .from("email_logs")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          if (error.code === "42P01") {
            setErrorMsg("데이터베이스에 'email_logs' 테이블이 존재하지 않습니다.");
          } else {
            setErrorMsg(`데이터 조회 오류: ${error.message}`);
          }
          return;
        }
        setLogs(data || []);
      } catch (e: any) {
        setErrorMsg(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, [supabase]);

  const filtered = logs.filter((log) => {
    const matchSearch = search
      ? log.recipient_email.toLowerCase().includes(search.toLowerCase())
      : true;
    const matchStatus = statusFilter === "ALL" ? true : log.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function StatusBadge({ log }: { log: EmailLog }) {
    if (log.status === "SENT") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-success/10 text-success">
          <CheckCircle2 className="w-3 h-3" /> 성공
        </span>
      );
    }
    if (log.status === "FAILED") {
      return (
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-danger/10 text-danger">
            <XCircle className="w-3 h-3" /> 실패
          </span>
          {log.error_message && (
            <p className="text-xs text-danger/70 mt-1 max-w-[200px] truncate" title={log.error_message}>
              {log.error_message}
            </p>
          )}
        </div>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-700">
        <Clock className="w-3 h-3" /> 처리 중
      </span>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">발송 내역</h1>
        <p className="text-gray-500 mt-2">전체 이메일 발송 기록을 확인합니다.</p>
      </div>

      {errorMsg ? (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-danger shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-danger">데이터를 불러오지 못했습니다</h3>
            <p className="text-sm text-danger/80 mt-1">{errorMsg}</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {/* 필터 영역 */}
          <div className="p-6 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="수신자 이메일 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="ALL">전체 상태</option>
              <option value="SENT">성공</option>
              <option value="FAILED">실패</option>
              <option value="PENDING">처리 중</option>
            </select>
            <span className="text-xs text-gray-400 font-medium">
              {isLoading ? "로딩 중..." : `총 ${filtered.length}건`}
            </span>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-gray-400 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">제목</th>
                  <th className="px-6 py-4">수신자</th>
                  <th className="px-6 py-4">트리거</th>
                  <th className="px-6 py-4">상태</th>
                  <th className="px-6 py-4 text-right">발송 시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                      <span className="animate-pulse">데이터를 불러오는 중입니다...</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                      {search || statusFilter !== "ALL"
                        ? "검색 조건에 맞는 발송 내역이 없습니다."
                        : "발송 내역이 존재하지 않습니다."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-700">{log.subject || "-"}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        <div>{log.recipient_email}</div>
                        {log.recipient_name && (
                          <div className="text-xs text-gray-400">{log.recipient_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {log.triggered_by || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge log={log} />
                      </td>
                      <td className="px-6 py-4 text-right text-gray-400 text-xs font-medium">
                        {new Date(log.sent_at ?? log.created_at).toLocaleString("ko-KR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
