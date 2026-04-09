import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MailBrick (메일브릭)",
  description: "쇼핑몰 고객의 행동을 감지하여 최적의 타이밍에 맞춤형 이메일을 자동 발송하는 CRM 솔루션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
