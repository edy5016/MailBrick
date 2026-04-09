"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CheckCircle2, XCircle, Clock, Mail, AlertCircle, ArrowUpRight } from "lucide-react";

export default function DashboardPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function fetchLogs() {
      try {
        const { data, error } = await supabase
          .from("email_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
          
        if (error) {
          if(error.code === '42P01') {
             setErrorMsg("🔥 백엔드 에러: 현재 데이터베이스에 'email_logs' 테이블이 생성되지 않았습니다.");
          } else {
             setErrorMsg(`데이터 연동 에러: ${error.message}`);
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

  const total = logs.length;
  // 임시로 SUCCESS나 FAILED 가 아닌 것도 에러 혹은 펜딩으로 처리 가능
  const successCount = logs.filter(l => l.status === "SENT").length;
  const failCount = logs.filter(l => l.status === "FAILED").length;
  const pendingCount = total - successCount - failCount;

  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

  const chartData = [
    { name: "발송 성공", value: successCount, fill: "#10B981" },
    { name: "발송 실패", value: failCount, fill: "#EF4444" },
    { name: "대기 중", value: pendingCount, fill: "#F59E0B" }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">대시보드</h1>
          <p className="text-gray-500 mt-2">최근 50건의 이메일 트리거 통계와 내역을 확인합니다.</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-white border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm"
        >
          데이터 새로고침
        </button>
      </div>

      {errorMsg ? (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-danger shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-danger">통계 데이터를 불러오지 못했습니다</h3>
            <p className="text-sm text-danger/80 mt-1">{errorMsg}</p>
            <p className="text-xs text-danger/60 mt-3">아직 실제 발송 데이터(Supabase Edge Function) 흐름이 백엔드에 구축되지 않은 상태일 수 있습니다.</p>
          </div>
        </div>
      ) : (
        <>
          {/* 주요 지표 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-gray-400">Total Tracking</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">총 발송 감지 건수</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-foreground">{isLoading ? "--" : total}</h3>
                  <span className="text-sm text-gray-400 font-medium">건</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-success/10 rounded-xl text-success">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="flex items-center text-xs font-semibold text-success bg-success/10 px-2 py-1 rounded-full">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> {isLoading ? 0 : successRate}%
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">성공률</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-foreground">{isLoading ? "--" : successCount}</h3>
                  <span className="text-sm text-gray-400 font-medium">건 성공</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-danger/10 rounded-xl text-danger">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">실패 건수 (Bounced)</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-foreground">{isLoading ? "--" : failCount}</h3>
                  <span className="text-sm text-danger font-medium">건 실패 확인</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 차트 영역 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1">
              <h3 className="text-lg font-bold mb-6 text-foreground">발송 상태 차트</h3>
              <div className="h-[250px] w-full">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-xl">
                    <span className="animate-pulse text-gray-400 font-medium">로딩 중...</span>
                  </div>
                ) : total === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 pb-4">
                    <BarChart className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm font-medium">데이터가 없습니다</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} 
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 최근 로그 테이블 영역 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                <h3 className="text-lg font-bold text-foreground">최근 이벤트 로그</h3>
                <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                  최대 5건 표시
                </span>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white text-gray-400 font-medium border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">유형/제목</th>
                      <th className="px-6 py-4">수신자</th>
                      <th className="px-6 py-4">상태</th>
                      <th className="px-6 py-4 text-right">발생 시각</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                          <span className="animate-pulse">데이터를 불러오는 중입니다...</span>
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                          발송 내역이 존재하지 않습니다.
                        </td>
                      </tr>
                    ) : (
                      logs.slice(0, 5).map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-gray-700">{log.subject || log.event_type || '알 수 없음'}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{log.recipient_email || '-'}</td>
                          <td className="px-6 py-4">
                            {log.status === "SENT" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-success/10 text-success">
                                <CheckCircle2 className="w-3 h-3" /> 성공
                              </span>
                            ) : log.status === "FAILED" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-danger/10 text-danger">
                                <XCircle className="w-3 h-3" /> 실패
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-100 text-orange-700">
                                <Clock className="w-3 h-3" /> 처리 중
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-400 font-medium text-xs">
                            {log.created_at ? new Date(log.created_at).toLocaleString('ko-KR') : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
