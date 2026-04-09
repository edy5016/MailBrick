export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">발송 통계 요약</div>
        <div className="bg-white p-6 rounded-lg shadow-sm">성공률</div>
        <div className="bg-white p-6 rounded-lg shadow-sm">실패율</div>
      </div>
      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm h-64">
        최근 활동 내역 스켈레톤
      </div>
    </div>
  );
}
