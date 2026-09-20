import { Link } from "wouter";
import { useGetProfile } from "@workspace/api-client-react";
import { Wallet, Settings, LogOut, ShieldAlert, User as UserIcon, Crown, ChevronLeft, Mail } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";

export default function Profile() {
  const { data: profile, isLoading } = useGetProfile();
  const { user, logout } = useAuth();

  const currentUsername = user?.username || profile?.username || "عضو ShadMini";
  const currentAvatar = user?.avatarUrl || profile?.avatarUrl;
  const currentEmail = user?.email || profile?.email;
  const currentDisplayId = user?.displayId || profile?.displayId || "1001";
  const vipLevel = user?.vipLevel || profile?.vipLevel || 1;
  const vipBadgeName = user?.vipBadge?.name || (vipLevel >= 4 ? "SVIP" : vipLevel === 3 ? "VIP3" : vipLevel === 2 ? "VIP2" : "VIP1");

  if (isLoading && !user) {
    return (
      <div className="min-h-[70vh] p-4 pt-8 max-w-2xl mx-auto space-y-4">
        <Skeleton className="w-24 h-24 rounded-3xl mx-auto mb-4" />
        <Skeleton className="h-6 w-32 mx-auto mb-8" />
        <Skeleton className="h-32 w-full rounded-3xl mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 animate-in fade-in duration-300 space-y-6">
      {/* Header Profile Card */}
      <div className="bg-[var(--theme-background)] border border-[var(--theme-primary)]/30 text-white rounded-3xl p-6 sm:p-8 text-center shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-64 bg-[var(--theme-primary)]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Avatar Container */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-4">
            <div className="w-full h-full rounded-3xl overflow-hidden border-2 border-[var(--theme-primary)] shadow-xl bg-zinc-900 flex items-center justify-center">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={currentUsername}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-black text-[var(--theme-primary)]">
                  {currentUsername.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {vipLevel >= 2 && (
              <div className="absolute -top-2 -right-2 bg-amber-400 text-zinc-950 p-1.5 rounded-full shadow-md">
                <Crown size={14} className="fill-zinc-950" />
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">{currentUsername}</h1>
          {currentEmail && (
            <p className="text-xs text-zinc-400 font-medium mb-3 flex items-center justify-center gap-1.5">
              <Mail size={13} className="text-[var(--theme-primary)]" />
              <span dir="ltr">{currentEmail}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs mb-2">
            <span className="bg-zinc-800/90 text-zinc-200 px-3 py-1 rounded-full border border-zinc-700 font-mono">
              المعرف: <strong className="text-[var(--theme-primary)]">{currentDisplayId}</strong>
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                vipLevel >= 4
                  ? "bg-amber-400 text-zinc-950"
                  : vipLevel === 3
                  ? "bg-yellow-400 text-zinc-950"
                  : vipLevel === 2
                  ? "bg-blue-400 text-zinc-950"
                  : "bg-zinc-800 text-zinc-300 border border-zinc-700"
              }`}
            >
              {vipBadgeName}
            </span>
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <span className="bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] px-3 py-1 rounded-full border border-[var(--theme-primary)]/30 text-xs font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> مشرف
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-[var(--theme-card)] border border-[var(--theme-primary)]/35 rounded-3xl p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[var(--theme-background)] border border-[var(--theme-primary)]/40 text-[var(--theme-primary)] flex items-center justify-center shadow-md">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-zinc-400 font-bold">الرصيد المتاح بالمحفظة</div>
            <div className="text-2xl font-black text-[var(--theme-accent)]">
              ${Number(user?.balanceUsd || profile?.balanceUsd || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <Link href="/deposit">
          <button className="px-4 py-2.5 bg-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] text-[var(--theme-background)] text-xs font-black rounded-xl shadow-md shadow-[var(--theme-primary)]/20 transition active:scale-95 cursor-pointer">
            + شحن الرصيد
          </button>
        </Link>
      </div>

      {/* Actions List */}
      <div className="bg-[var(--theme-card)] border border-[var(--theme-primary)]/35 rounded-3xl overflow-hidden shadow-lg divide-y divide-zinc-800">
        {/* Account Settings / Edit Profile */}
        <Link href="/settings">
          <div className="p-4 flex items-center justify-between hover:bg-[var(--theme-input-bg)] cursor-pointer transition-colors group">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[var(--theme-background)] border border-[var(--theme-primary)]/30 text-[var(--theme-primary)] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-sm text-white group-hover:text-[var(--theme-accent)] transition-colors">
                  إعدادات الحساب وتعديل الملف
                </div>
                <div className="text-xs text-zinc-400 font-medium">
                  تعديل اسم المستخدم، البريد، الصورة، وكلمة المرور
                </div>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-zinc-500 group-hover:text-[var(--theme-primary)] transition-colors" />
          </div>
        </Link>

        {/* Logout */}
        <div
          onClick={logout}
          className="p-4 flex items-center justify-between hover:bg-red-950/30 cursor-pointer transition-colors group text-red-400"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-950/60 border border-red-900/40 text-red-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-red-400 group-hover:text-red-300">تسجيل الخروج</div>
              <div className="text-xs text-red-400/70 font-medium">إنهاء الجلسة على هذا المتصفح</div>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-red-500/60 group-hover:text-red-400 transition-colors" />
        </div>
      </div>
    </div>
  );
}
