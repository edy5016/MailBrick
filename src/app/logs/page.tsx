export default function LogsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">발송 내역</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="mb-4 flex gap-4">
          <input type="text" placeholder="수신자 이메일 검색..." className="border rounded-md px-3 py-2" />
          <select className="border rounded-md px-3 py-2">
            <option>전체 상태</option>
            <option>성공</option>
            <option>실패</option>
          </select>
        </div>
        <div className="min-h-[400px] border-t mt-4 pt-4">
          발송 로그 리스트 스켈레톤
        </div>
      </div>
    </div>
  );
}
