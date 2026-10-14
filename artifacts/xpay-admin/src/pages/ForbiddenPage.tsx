import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldAlert, ArrowRight, Home, Lock } from "lucide-react";
import { usePermissions } from "../context/PermissionsContext";

interface ForbiddenPageProps {
  requiredSection?: string | null;
}

export default function ForbiddenPage({ requiredSection: propSection }: ForbiddenPageProps) {
  const { role } = usePermissions();
  const location = useLocation();

  // Try to read requiredSection from prop, location state, or fallback
  const stateSection = (location.state as any)?.requiredSection;
  const attemptedPath = (location.state as any)?.attemptedPath || location.pathname;
  const section = propSection || stateSection;

  return (
    <div
      dir="rtl"
      className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-lg bg-[#222222] border border-red-500/30 rounded-2xl p-8 sm:p-10 shadow-2xl text-center relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#C8A45C]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500 animate-pulse" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1A1A1A] border border-red-500/40 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-red-400" />
          </div>
        </div>

        {/* Code & Title */}
        <div className="inline-block px-3 py-1 mb-3 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-mono font-bold text-red-400 tracking-wider">
          ERROR 403 • FORBIDDEN
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          الوصول محظور
        </h1>

        {/* Description */}
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          عذراً، ليس لديك الصلاحية الكافية للوصول إلى هذه الصفحة في لوحة التحكم.
          تم تقييد الوصول وفقاً لقواعد أمان النظام (RBAC).
        </p>

        {/* Metadata info card */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl p-4 mb-6 text-right space-y-2 text-xs">
          {section && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">القسم المطلوب:</span>
              <span className="font-semibold text-[#C8A45C] bg-[#C8A45C]/10 px-2.5 py-0.5 rounded-md border border-[#C8A45C]/20">
                {section}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">دورك الحالي:</span>
            <span className="font-semibold text-zinc-300 bg-zinc-800 px-2.5 py-0.5 rounded-md">
              {role || "مشرف غير محدد"}
            </span>
          </div>
          {attemptedPath && attemptedPath !== "/403" && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">المسار المطلوب:</span>
              <span className="font-mono text-zinc-400 text-[11px] ltr" dir="ltr">
                {attemptedPath}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#C8A45C] hover:bg-[#d8b56d] text-black font-semibold text-sm transition-colors shadow-lg shadow-[#C8A45C]/20"
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-sm transition-colors border border-zinc-700"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الرجوع للخلف</span>
          </button>
        </div>
      </div>
    </div>
  );
}
