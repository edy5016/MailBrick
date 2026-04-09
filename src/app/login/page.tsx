export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-primary text-center">MailBrick 로그인</h1>
        <p className="text-center text-sm text-gray-500">
          쇼핑몰 업무 자동화 CRM 서비스에 오신 것을 환영합니다.
        </p>
        <div className="mt-8">
          {/* 로그인 폼 자리 */}
          <div className="h-40 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400">
            Login Form Skeleton
          </div>
        </div>
      </div>
    </div>
  );
}
