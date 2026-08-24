import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, token, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user && !token) {
      setLocation("/login");
    }
  }, [loading, user, token, setLocation]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3 p-6 text-center" dir="rtl">
        <div className="w-10 h-10 border-3 border-[#C8A45C] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-700">جاري التحقق من الحساب...</p>
      </div>
    );
  }

  if (!user && !token) {
    return null;
  }

  return <Component />;
}
