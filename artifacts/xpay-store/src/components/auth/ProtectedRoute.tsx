import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useStoreSettings } from "@/lib/store-settings-context";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  allowGuest?: boolean;
}

export function ProtectedRoute({ component: Component, allowGuest = false }: ProtectedRouteProps) {
  const { user, token, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const storeSettings = useStoreSettings();

  const isGuestModeEnabled = Boolean(
    storeSettings.guestPreviewEnabled ?? storeSettings.guest_preview_enabled
  );
  const isGuestAllowed = allowGuest && isGuestModeEnabled;
  const isAuthenticated = Boolean(user || token);

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
        <div className="w-10 h-10 border-3 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-700">جاري التحقق من الحساب...</p>
      </div>
    );
  }

  if (!isAuthenticated && !isGuestAllowed) {
    return null;
  }

  return <Component />;
}
