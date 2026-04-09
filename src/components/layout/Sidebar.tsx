"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileText, Send, Shield, LogOut, Building2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setIsSuperAdmin(data?.role === "SUPER_ADMIN");
    }
    fetchRole();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const menuItems = [
    { name: "대시보드", href: "/dashboard", icon: LayoutDashboard },
    { name: "템플릿 관리", href: "/templates", icon: FileText },
    { name: "발송 내역", href: "/logs", icon: Send },
    ...(isSuperAdmin ? [{ name: "슈퍼 관리자", href: "/admin", icon: Shield }] : []),
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full sticky top-0 hidden md:flex">
      <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0">
        <Building2 className="w-6 h-6 text-primary mr-2" />
        <span className="text-lg font-bold text-foreground tracking-tight">MailBrick</span>
      </div>
      
      <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.name} href={item.href}
              className={`flex items-center px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                isActive 
                  ? "bg-primary/10 text-primary shadow-sm" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-500"}`} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-100 shrink-0">
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center w-full px-3 py-2.5 text-sm font-medium text-gray-500 rounded-lg group hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2 text-gray-400 group-hover:text-danger/70 transition-colors" />
          시스템 로그아웃
        </button>
      </div>
    </aside>
  );
}
