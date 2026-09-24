/*
 * ⚠️ DISABLED (2026-09-25) — Task #2 Phase 1
 * هذه الميزة كانت زخرفية (Mock) ولا تُفحص عند تسجيل الدخول.
 * أُخفيت من الواجهة بموجب قاعدة "الوظائف الزخرفية ممنوعة".
 * التنفيذ الحقيقي (otplib + backup codes + replay prevention)
 * مجدول كمهمة مستقلة قبل الإطلاق النهائي.
 */

import { useState, useEffect } from "react";
import { get, post } from "../lib/api";
import { ShieldCheck, ShieldAlert, Copy, CheckCircle2, QrCode, Key, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface TwoFactorProps {
  me?: any;
}

export default function TwoFactor({ me }: TwoFactorProps) {
  const [enabled, setEnabled] = useState(false);
  const [code, setCode] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>(me?.email || me?.username || "admin");

  // التحقق من حالة 2FA عند فتح الصفحة
  useEffect(() => {
    async function checkStatus() {
      try {
        const adminData = await get("/me");
        if (adminData) {
          setEnabled(!!adminData.twoFactorEnabled);
          setUserEmail(adminData.email || adminData.username || "admin");
        }
      } catch (err) {
        console.error("[2FA] Error loading admin status:", err);
      } finally {
        setLoading(false);
      }
    }
    checkStatus();
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const r = await post("/2fa/enable");
      const s = r?.secret || "";
      setSecret(s);
      
      const email = userEmail || "admin";
      const generatedUrl = r?.otpauthUrl || `otpauth://totp/XPayStore:${encodeURIComponent(email)}?secret=${s}&issuer=XPayStore`;
      setOtpauthUrl(generatedUrl);
      toast.info("امسح رمز QR بتطبيق Google Authenticator ثم أدخل الكود لتأكيد التفعيل");
    } catch (e: any) {
      toast.error(e?.message || "فشل تهيئة التحقق الثنائي");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    try {
      await post("/2fa/verify", { code });
      setEnabled(true);
      setSecret(null);
      setOtpauthUrl(null);
      setCode("");
      toast.success("✅ تم تفعيل التحقق الثنائي (2FA) بنجاح وحماية حسابك!");
    } catch (e: any) {
      toast.error(e?.message || "رمز التحقق غير صحيح، يرجى المحاولة مجدداً");
    } finally {
      setBusy(false);
    }
  };

  const disable2fa = async () => {
    if (!confirm("هل أنت متأكد من رغبتك في إلغاء تفعيل التحقق الثنائي لحسابك؟")) return;
    setBusy(true);
    try {
      await post("/2fa/disable");
      setEnabled(false);
      setSecret(null);
      setOtpauthUrl(null);
      setCode("");
      toast.success("تم إلغاء تفعيل التحقق الثنائي بنجاح");
    } catch (e: any) {
      toast.error(e?.message || "فشل إلغاء التفعيل");
    } finally {
      setBusy(false);
    }
  };

  const copySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    toast.success("✅ تم نسخ المفتاح السري للحافظة");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-400 space-y-3" dir="rtl">
        <Loader2 size={32} className="animate-spin text-[#C8A45C]" />
        <p className="text-sm">جاري التحقق من إعدادات الأمان...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A]">التحقق الثنائي (Two-Factor Authentication)</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            حماية حساب الإدارة بطبقة أمان إضافية عبر تطبيق Google Authenticator أو Authy
          </p>
        </div>
      </div>

      {/* الحالة 1: 2FA مفعّل بالفعل */}
      {enabled && (
        <div className="bg-[#2D2D2D] border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-400">التحقق الثنائي (2FA) مفعّل ونشط</h3>
              <p className="text-xs text-zinc-300 mt-0.5">
                حسابك محمي حالياً بواسطة كود التحقق المتجدد من تطبيق المصادقة عند تسجيل الدخول.
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-5 flex items-center justify-between">
            <span className="text-xs text-zinc-400">إذا أردت إيقاف الحماية أو تغيير الجهاز:</span>
            <button
              onClick={disable2fa}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <ShieldAlert size={14} />
              {busy ? "جاري الإلغاء..." : "إلغاء تفعيل 2FA"}
            </button>
          </div>
        </div>
      )}

      {/* الحالة 2: 2FA غير مفعّل ولم يتم البدء بالتهيئة */}
      {!enabled && !secret && (
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#FDE68A]">لماذا يُنصح بتفعيل التحقق الثنائي؟</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              يوفر التحقق الثنائي طبقة أمان لا يمكن اختراقها بكلمة المرور وحدها. في كل مرة تسجل الدخول إلى لوحة التحكم،
              سيطلب منك النظام إدخال رمز مؤقت يتجدد كل 30 ثانية على هاتفك الذكي.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-[#1A1A1A] rounded-2xl border border-zinc-800 space-y-2">
              <div className="text-xs font-bold text-[#C8A45C]">1. حمّل التطبيق</div>
              <p className="text-xs text-zinc-400">Google Authenticator أو 1Password أو Authy من متجر التطبيقات.</p>
            </div>
            <div className="p-4 bg-[#1A1A1A] rounded-2xl border border-zinc-800 space-y-2">
              <div className="text-xs font-bold text-[#C8A45C]">2. امسح رمز QR</div>
              <p className="text-xs text-zinc-400">افتح التطبيق واستخدم الكاميرا لمسح الرمز المرئي المولد لحسابك.</p>
            </div>
            <div className="p-4 bg-[#1A1A1A] rounded-2xl border border-zinc-800 space-y-2">
              <div className="text-xs font-bold text-[#C8A45C]">3. أدخل رمز التأكيد</div>
              <p className="text-xs text-zinc-400">اكتب الرمز المكون من 6 أرقام لتأكيد الربط بنجاح وبدء الحماية.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end">
            <button
              onClick={enable}
              disabled={busy}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] font-bold text-sm rounded-2xl shadow-xl transition cursor-pointer disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> جاري التوليد...
                </>
              ) : (
                <>
                  <QrCode size={16} /> بدء تفعيل التحقق الثنائي
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* الحالة 3: تم توليد الـ QR السري وجاري انتظار إدخال كود التأكيد */}
      {!enabled && secret && (
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#FDE68A]">خطوات إكمال التفعيل</h2>
              <p className="text-xs text-zinc-400 mt-0.5">امسح رمز الاستجابة السريعة أو أدخل المفتاح يدوياً</p>
            </div>
            <button
              onClick={() => {
                setSecret(null);
                setOtpauthUrl(null);
                setCode("");
              }}
              className="text-xs text-zinc-400 hover:text-white transition cursor-pointer"
            >
              إلغاء
            </button>
          </div>

          {/* بطاقة عرض الـ QR Code */}
          <div className="flex flex-col items-center justify-center p-6 bg-[#1A1A1A] rounded-2xl border border-[#C8A45C]/30 space-y-4">
            <div className="p-4 bg-white rounded-2xl shadow-lg">
              {otpauthUrl && (
                <QRCodeSVG
                  value={otpauthUrl}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              )}
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-zinc-200">
                امسح الرمز بواسطة تطبيق Google Authenticator على هاتفك
              </p>
              <p className="text-[11px] text-zinc-400">
                الحساب: <span className="font-mono text-[#FDE68A]">{userEmail}</span>
              </p>
            </div>
          </div>

          {/* إدخال يدوي كبديل */}
          <div className="space-y-2 bg-[#1A1A1A] p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#FDE68A]">
              <Key size={14} />
              <span>أو أدخل المفتاح السري يدوياً في التطبيق:</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2.5 bg-[#0A0A0A] border border-zinc-800 rounded-xl text-sm font-mono text-[#FDE68A] select-all tracking-wider text-center">
                {secret}
              </code>
              <button
                onClick={copySecret}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] text-xs font-bold rounded-xl transition cursor-pointer"
                title="نسخ المفتاح"
              >
                <Copy size={14} />
                <span>نسخ</span>
              </button>
            </div>
          </div>

          {/* حقل إدخال الكود للتأكيد */}
          <div className="space-y-3 bg-[#1A1A1A] p-6 rounded-2xl border border-[#C8A45C]/30">
            <label className="block text-xs font-bold text-center text-zinc-300">
              أدخل الرمز المكوّن من 6 أرقام الظاهر في هاتفك الآن للتأكيد:
            </label>
            <div className="max-w-xs mx-auto">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
                className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#C8A45C]/50 focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20 rounded-2xl text-center font-mono text-2xl tracking-[0.4em] text-white outline-none transition shadow-inner"
              />
            </div>
            <p className="text-[11px] text-zinc-400 text-center flex items-center justify-center gap-1">
              <AlertCircle size={12} className="text-[#C8A45C]" /> يتغير هذا الرمز كل 30 ثانية في تطبيقك
            </p>
          </div>

          {/* زر التأكيد والحفظ */}
          <button
            onClick={verify}
            disabled={busy || code.length !== 6}
            className="w-full py-3.5 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] font-black text-sm rounded-2xl shadow-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" /> جاري التحقق...
              </>
            ) : (
              <>
                <ShieldCheck size={16} /> تأكيد وتفعيل التحقق الثنائي
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
