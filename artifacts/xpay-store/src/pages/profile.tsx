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
      <div
        className="border rounded-3xl p-6 sm:p-8 text-center shadow-xl relative overflow-hidden"
        style={{
          backgroundColor: "var(--theme-card, #1E1E1E)",
          borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 30%, transparent)",
          color: "var(--theme-text-primary, #FFFFFF)",
        }}
      >
        <div
          className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{
            backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 15%, transparent)",
          }}
        />

        <div className="relative z-10">
          {/* Avatar Container */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-4">
            <div
              className="w-full h-full rounded-3xl overflow-hidden border-2 shadow-xl flex items-center justify-center"
              style={{
                backgroundColor: "var(--theme-background, #121212)",
                borderColor: "var(--theme-primary, #C8A45C)",
              }}
            >
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt={currentUsername}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-4xl font-black"
                  style={{ color: "var(--theme-primary, #C8A45C)" }}
                >
                  {currentUsername.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {vipLevel >= 2 && (
              <div
                className="absolute -top-2 -right-2 p-1.5 rounded-full shadow-md"
                style={{
                  backgroundColor: "var(--theme-accent, #DFBD69)",
                  color: "var(--theme-background, #121212)",
                }}
              >
                <Crown size={14} className="fill-current" />
              </div>
            )}
          </div>

          <h1
            className="text-2xl sm:text-3xl font-black mb-1"
            style={{ color: "var(--theme-text-primary, #FFFFFF)" }}
          >
            {currentUsername}
          </h1>
          {currentEmail && (
            <p
              className="text-xs font-medium mb-3 flex items-center justify-center gap-1.5"
              style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
            >
              <Mail size={13} style={{ color: "var(--theme-primary, #C8A45C)" }} />
              <span dir="ltr">{currentEmail}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs mb-2">
            <span
              className="px-3 py-1 rounded-full border font-mono"
              style={{
                backgroundColor: "var(--theme-input-bg, #2A2A2A)",
                borderColor: "var(--theme-border, #3A3A3A)",
                color: "var(--theme-text-secondary, #D4D4D8)",
              }}
            >
              المعرف:{" "}
              <strong style={{ color: "var(--theme-primary, #C8A45C)" }}>
                {currentDisplayId}
              </strong>
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                vipLevel < 2 ? "border" : ""
              }`}
              style={
                vipLevel >= 2
                  ? {
                      backgroundColor:
                        vipLevel >= 3
                          ? "var(--theme-accent, #DFBD69)"
                          : "var(--theme-primary, #C8A45C)",
                      color: "var(--theme-background, #121212)",
                    }
                  : {
                      backgroundColor: "var(--theme-input-bg, #2A2A2A)",
                      color: "var(--theme-text-secondary, #D4D4D8)",
                      borderColor: "var(--theme-border, #3A3A3A)",
                    }
              }
            >
              {vipBadgeName}
            </span>
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <span
                className="px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 20%, transparent)",
                  color: "var(--theme-primary, #C8A45C)",
                  borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 30%, transparent)",
                }}
              >
                <ShieldAlert className="w-3.5 h-3.5" /> مشرف
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div
        className="border rounded-3xl p-5 shadow-lg flex items-center justify-between"
        style={{
          backgroundColor: "var(--theme-card, #1E1E1E)",
          borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 35%, transparent)",
        }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl border flex items-center justify-center shadow-md"
            style={{
              backgroundColor: "var(--theme-background, #121212)",
              borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
              color: "var(--theme-primary, #C8A45C)",
            }}
          >
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div
              className="text-xs font-bold"
              style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
            >
              الرصيد المتاح بالمحفظة
            </div>
            <div
              className="text-2xl font-black"
              style={{ color: "var(--theme-accent, #DFBD69)" }}
            >
              ${Number(user?.balanceUsd || profile?.balanceUsd || 0).toFixed(2)}
            </div>
          </div>
        </div>

        <Link href="/deposit">
          <button
            className="px-4 py-2.5 hover:brightness-95 text-xs font-black rounded-xl shadow-md transition active:scale-95 cursor-pointer"
            style={{
              backgroundColor: "var(--theme-primary, #C8A45C)",
              color: "var(--theme-background, #121212)",
              boxShadow: "0 4px 12px color-mix(in srgb, var(--theme-primary, #C8A45C) 25%, transparent)",
            }}
          >
            + شحن الرصيد
          </button>
        </Link>
      </div>

      {/* Actions List */}
      <div
        className="border rounded-3xl overflow-hidden shadow-lg"
        style={{
          backgroundColor: "var(--theme-card, #1E1E1E)",
          borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 35%, transparent)",
        }}
      >
        {/* Account Settings / Edit Profile */}
        <Link href="/settings">
          <div className="p-4 flex items-center justify-between hover:bg-[var(--theme-input-bg)] cursor-pointer transition-colors group">
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-2xl border flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform"
                style={{
                  backgroundColor: "var(--theme-background, #121212)",
                  borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 30%, transparent)",
                  color: "var(--theme-primary, #C8A45C)",
                }}
              >
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <div
                  className="font-extrabold text-sm group-hover:text-[var(--theme-accent)] transition-colors"
                  style={{ color: "var(--theme-text-primary, #FFFFFF)" }}
                >
                  إعدادات الحساب وتعديل الملف
                </div>
                <div
                  className="text-xs font-medium"
                  style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                >
                  تعديل اسم المستخدم، البريد، الصورة، وكلمة المرور
                </div>
              </div>
            </div>
            <ChevronLeft
              className="w-5 h-5 group-hover:text-[var(--theme-primary)] transition-colors"
              style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
            />
          </div>
        </Link>

        {/* Logout */}
        <div
          onClick={logout}
          className="p-4 flex items-center justify-between hover:bg-red-950/30 cursor-pointer transition-colors group text-red-400 border-t"
          style={{ borderColor: "var(--theme-border, #3A3A3A)" }}
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
