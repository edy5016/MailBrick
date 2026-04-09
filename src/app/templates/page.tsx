export default function TemplatesPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">이메일 템플릿 관리</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90">
          새 템플릿
        </button>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm min-h-[400px]">
        템플릿 리스트 스켈레톤
      </div>
    </div>
  );
}
