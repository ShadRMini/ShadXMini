import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useStoreSettings } from "@/lib/store-settings-context";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  allowGuest?: boolean;
}

export function ProtectedRoute({ component: Component, allowGuest = false }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const storeSettings = useStoreSettings();

  const guestPreviewEnabled = Boolean(
    storeSettings.guestPreviewEnabled ?? storeSettings.guest_preview_enabled ?? true
  );
  const isGuestAllowed = allowGuest && guestPreviewEnabled;

  useEffect(() => {
    if (!loading && !isAuthenticated && !isGuestAllowed) {
      if (location && location !== "/login" && location !== "/register") {
        try {
          sessionStorage.setItem("redirect_after_login", location);
        } catch {
          // Ignore
        }
      }
      setLocation("/login");
    }
  }, [loading, isAuthenticated, isGuestAllowed, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3 p-6 text-center" dir="rtl">
        <div className="w-10 h-10 border-3 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-300">جاري التحميل...</p>
      </div>
    );
  }

  // إذا كان المستخدم مسجلاً، اعرض الصفحة
  if (isAuthenticated) {
    return <Component />;
  }

  // إذا كان زائراً والسماح بالزوار مفعل، اعرض الصفحة
  if (isGuestAllowed) {
    return <Component />;
  }

  // خلاف ذلك، لا تعرض المحتوى المحمي (سيتم إعادة التوجيه إلى /login)
  return null;
}
