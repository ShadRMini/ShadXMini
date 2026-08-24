import { Link, useLocation } from "wouter";
import { Home, ListOrdered, History, HeadphonesIcon, Plus } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "الرئيسية", icon: Home },
    { href: "/orders", label: "طلباتي", icon: ListOrdered },
    { href: "/deposit", label: "شحن", icon: Plus, isFab: true },
    { href: "/deposits", label: "سجل الشحن", icon: History },
    { href: "/support", label: "اتصل بنا", icon: HeadphonesIcon },
  ];

  return (
    <div className="xpay-shell w-full min-h-[100dvh] relative pb-20">
      <div className="xpay-app-frame mx-auto w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl min-h-[100dvh] shadow-2xl relative overflow-hidden">
        <main className="min-h-[calc(100dvh-80px)]">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl bg-[#1A1A1A]/95 backdrop-blur-xl border-t border-[#C8A45C]/30 pb-safe z-50 shadow-[0_-12px_32px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-around px-2 h-16">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));

            if (item.isFab) {
              return (
                <Link key={item.href} href={item.href}>
                  <div className="relative -top-5 flex flex-col items-center justify-center cursor-pointer group">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                        isActive
                          ? "bg-[#C8A45C] text-white shadow-[#C8A45C]/40"
                          : "bg-[#C8A45C] text-white hover:bg-[#B8954A] shadow-[#C8A45C]/25"
                      }`}
                    >
                      <item.icon className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] mt-1 font-semibold text-[#C8A45C]">{item.label}</span>
                  </div>
                </Link>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <div className="flex flex-col items-center justify-center w-16 h-full cursor-pointer group">
                  <div
                    className={`p-1 rounded-xl transition-all duration-300 ${
                      isActive ? "bg-[#C8A45C]/15 text-[#C8A45C]" : "text-gray-400 group-hover:text-[#C8A45C]"
                    }`}
                  >
                    <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] mt-1 font-medium transition-colors ${isActive ? "text-[#C8A45C] font-bold" : "text-gray-400"}`}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
