import { Sidebar } from "@/components/layout/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F9FAFB] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full relative">
        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
        {children}
      </main>
    </div>
  );
}
