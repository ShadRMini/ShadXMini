import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RotateCcw,
  Send,
  Loader2,
  Info,
  Eye,
  X,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface VerificationRecord {
  id: number;
  user_id: number;
  full_name: string;
  id_front_image: string;
  id_back_image: string;
  selfie_image: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  reviewed_at?: string;
  created_at: string;
}

export default function IdentityVerification() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verification, setVerification] = useState<VerificationRecord | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [idFrontImage, setIdFrontImage] = useState<string>("");
  const [idBackImage, setIdBackImage] = useState<string>("");
  const [selfieImage, setSelfieImage] = useState<string>("");

  // Error & Toast State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Preview Image state
  const [previewModalImg, setPreviewModalImg] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const baseUrl = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const storedToken =
        token || (typeof window !== "undefined" ? localStorage.getItem("xpay_store_auth_token") : null);

      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }

      const tgInitData = (window as any)?.Telegram?.WebApp?.initData;
      if (tgInitData) {
        headers["x-telegram-init-data"] = tgInitData;
      }

      const response = await fetch(`${baseUrl}/api/me/identity-verification?_=${Date.now()}`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {};
      }

      const rec = data?.verification || data?.data;
      if (response.ok && rec) {
        setVerification(rec);
        if (rec.full_name) {
          setFullName(rec.full_name);
        }
      } else {
        setVerification(null);
        setShowForm(true);
      }
    } catch (err: any) {
      console.error("Error fetching verification status:", err);
      setShowForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>,
    setter: (val: string) => void
  ) => {
    e.preventDefault();
    let file: File | null = null;

    if ("files" in e.target && e.target.files && e.target.files[0]) {
      file = e.target.files[0];
    } else if ("dataTransfer" in e && e.dataTransfer.files && e.dataTransfer.files[0]) {
      file = e.dataTransfer.files[0];
    }

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP)");
      toast.error("يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP)");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setErrorMsg("حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 12 ميغابايت.");
      toast.error("حجم الصورة كبير جداً.");
      return;
    }

    setErrorMsg(null);

    // Compress & convert to Data URL with canvas
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          setter(dataUrl);
        } else {
          setter(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim() || fullName.trim().length < 3) {
      const msg = "يرجى كتابة الاسم الكامل كما يظهر بالهوية (3 أحرف على الأقل).";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    if (!idFrontImage) {
      const msg = "يرجى رفع صورة الوجه الأمامي للهوية.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    if (!idBackImage) {
      const msg = "يرجى رفع صورة الوجه الخلفي للهوية.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    if (!selfieImage) {
      const msg = "يرجى رفع صورة السيلفي مع الهوية.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        fullName: fullName.trim(),
        idFrontImage,
        idBackImage,
        selfieImage,
      };

      const baseUrl = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const storedToken =
        token || (typeof window !== "undefined" ? localStorage.getItem("xpay_store_auth_token") : null);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (storedToken) {
        headers["Authorization"] = `Bearer ${storedToken}`;
      }

      // Forward Telegram WebApp initData if available
      const tgInitData = (window as any)?.Telegram?.WebApp?.initData;
      if (tgInitData) {
        headers["x-telegram-init-data"] = tgInitData;
      }

      const response = await fetch(`${baseUrl}/api/me/identity-verification`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      // Safely read response as text first to handle empty or non-JSON bodies
      const text = await response.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        console.error("Failed to parse server JSON response:", text);
        throw new Error("استجابة غير صالحة من الخادم. يرجى المحاولة مرة أخرى.");
      }

      if (!response.ok || data.error || data.success === false) {
        throw new Error(data.error || `فشل إرسال طلب التوثيق (رمز الاستجابة: ${response.status})`);
      }

      toast.success("تم إرسال طلب التوثيق بنجاح وهو قيد المراجعة الآن.");
      setSuccessMsg("تم إرسال طلب توثيق الهوية بنجاح، وهو قيد المراجعة الآن.");
      const rec = data.verification || data.data;
      if (rec) {
        setVerification(rec);
      }
      setShowForm(false);
    } catch (err: any) {
      console.error("[IdentityVerification Submit Error]:", err);
      const msg = err.message || "حدث خطأ أثناء إرسال البيانات.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderDropzone = (
    label: string,
    sublabel: string,
    value: string,
    setter: (val: string) => void,
    inputId: string
  ) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#E5E7EB] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8A45C]" />
            <span>{label}</span>
            <span className="text-red-400">*</span>
          </label>
          {value && (
            <button
              type="button"
              onClick={() => setter("")}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              حذف الصورة
            </button>
          )}
        </div>

        {value ? (
          <div className="relative group border border-[#C8A45C]/50 rounded-2xl overflow-hidden bg-[#1A1A1A] h-44 flex items-center justify-center shadow-lg">
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewModalImg({ src: value, title: label })}
                className="px-3.5 py-2 bg-[#C8A45C] text-black text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-[#FDE68A] transition-colors shadow-md"
              >
                <Eye className="w-4 h-4" />
                معاينة
              </button>
              <button
                type="button"
                onClick={() => setter("")}
                className="px-3.5 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-rose-500 transition-colors shadow-md"
              >
                <X className="w-4 h-4" />
                استبدال
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleFileUpload(e, setter)}
            className="border-2 border-dashed border-[#C8A45C]/35 hover:border-[#C8A45C] bg-[#3D3D3D]/50 hover:bg-[#3D3D3D]/80 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] group shadow-inner"
            onClick={() => document.getElementById(inputId)?.click()}
          >
            <input
              type="file"
              id={inputId}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, setter)}
            />
            <div className="w-11 h-11 rounded-full bg-[#C8A45C]/15 group-hover:bg-[#C8A45C]/25 flex items-center justify-center mb-2.5 text-[#C8A45C] transition-colors">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-[#E5E7EB] group-hover:text-[#FDE68A] mb-1 transition-colors">
              اضغط هنا أو اسحب الصورة لإرفاقها
            </p>
            <p className="text-[11px] text-[#9CA3AF] max-w-xs">{sublabel}</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6" dir="rtl">
        <Loader2 className="w-10 h-10 text-[#C8A45C] animate-spin mb-3" />
        <p className="text-sm font-bold text-[#9CA3AF]">جاري تحميل بيانات التوثيق...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#E5E7EB] p-4 sm:p-6 pb-28 animate-in fade-in duration-300" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex items-center gap-3.5 bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-36 h-36 bg-[#C8A45C]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#C8A45C] to-[#8A6D3B] text-black flex items-center justify-center shadow-lg shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#C8A45C]">توثيق الهوية</h1>
            <p className="text-xs text-[#9CA3AF] font-medium mt-0.5">
              قم برفع بياناتك ووثائقك الشخصية لتأكيد هويتك وتفعيل مزايا الحساب المتقدمة.
            </p>
          </div>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="bg-rose-950/70 border border-rose-500/50 rounded-2xl p-4 flex items-start gap-3 text-rose-200 text-xs font-medium animate-in slide-in-from-top duration-200 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-4 flex items-start gap-3 text-emerald-200 text-xs font-medium animate-in slide-in-from-top duration-200 shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMsg}</div>
          </div>
        )}

        {/* Status Display Card (If record exists and not currently editing form) */}
        {verification && !showForm && (
          <div className="space-y-6">
            {/* PENDING STATUS */}
            {verification.status === "pending" && (
              <div className="bg-[#2D2D2D] border border-[#C8A45C]/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5">
                <div className="flex items-center gap-3.5 border-b border-[#C8A45C]/20 pb-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#C8A45C]/20 text-[#C8A45C] flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-[#C8A45C]/20 text-[#C8A45C] border border-[#C8A45C]/35 mb-1">
                      قيد المراجعة والتدقيق
                    </span>
                    <h2 className="text-base font-bold text-[#E5E7EB]">طلب توثيق الهوية قيد المراجعة</h2>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-[#E5E7EB] bg-[#1A1A1A]/70 p-4 rounded-2xl border border-white/5">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#9CA3AF]">الاسم الكامل:</span>
                    <span className="font-bold text-[#FDE68A]">{verification.full_name}</span>
                  </div>
                  <div className="flex justify-between pt-0.5">
                    <span className="text-[#9CA3AF]">تاريخ تقديم الطلب:</span>
                    <span className="font-medium text-gray-300">
                      {new Date(verification.created_at).toLocaleString("ar")}
                    </span>
                  </div>
                </div>

                {/* Photos Submitted Preview */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-[#C8A45C]">الصور المرفقة بالطلب:</span>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div
                      onClick={() => setPreviewModalImg({ src: verification.id_front_image, title: "الوجه الأمامي" })}
                      className="cursor-pointer group relative border border-white/10 hover:border-[#C8A45C] rounded-2xl overflow-hidden bg-black/40 h-24 transition-all"
                    >
                      <img src={verification.id_front_image} alt="front" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity">
                        الوجه الأمامي
                      </div>
                    </div>
                    <div
                      onClick={() => setPreviewModalImg({ src: verification.id_back_image, title: "الوجه الخلفي" })}
                      className="cursor-pointer group relative border border-white/10 hover:border-[#C8A45C] rounded-2xl overflow-hidden bg-black/40 h-24 transition-all"
                    >
                      <img src={verification.id_back_image} alt="back" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity">
                        الوجه الخلفي
                      </div>
                    </div>
                    <div
                      onClick={() => setPreviewModalImg({ src: verification.selfie_image, title: "سيلفي الهوية" })}
                      className="cursor-pointer group relative border border-white/10 hover:border-[#C8A45C] rounded-2xl overflow-hidden bg-black/40 h-24 transition-all"
                    >
                      <img src={verification.selfie_image} alt="selfie" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity">
                        السيلفي
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#3D3D3D]/40 border border-[#C8A45C]/25 rounded-2xl p-3.5 text-xs text-[#E5E7EB]/90 leading-relaxed flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-[#C8A45C] shrink-0 mt-0.5" />
                  <span>
                    يقوم فريق الإدارة بمراجعة وثائق الهوية والتحقق منها يدوياً لضمان الأمان. ستتلقى إشعاراً فورياً عند مراجعة الطلب.
                  </span>
                </div>
              </div>
            )}

            {/* APPROVED STATUS */}
            {verification.status === "approved" && (
              <div className="bg-[#2D2D2D] border border-emerald-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5">
                <div className="flex items-center gap-3.5 border-b border-emerald-500/20 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 mb-1">
                      حساب موثق رسمياً ✅
                    </span>
                    <h2 className="text-base font-bold text-white">تم توثيق هويتك بنجاح</h2>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-[#E5E7EB] bg-[#1A1A1A]/70 p-4 rounded-2xl border border-white/5">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-[#9CA3AF]">الاسم المعتمد:</span>
                    <span className="font-bold text-[#FDE68A]">{verification.full_name}</span>
                  </div>
                  {verification.reviewed_at && (
                    <div className="flex justify-between pt-0.5">
                      <span className="text-[#9CA3AF]">تاريخ الاعتماد:</span>
                      <span className="font-medium text-gray-300">
                        {new Date(verification.reviewed_at).toLocaleString("ar")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-200 leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    حسابك موثق بالكامل. يمكنك الآن الاستفادة من حدود الشحن المرتفعة والمعاملات السريعة بدون أي قيود.
                  </span>
                </div>
              </div>
            )}

            {/* REJECTED STATUS */}
            {verification.status === "rejected" && (
              <div className="bg-[#2D2D2D] border border-rose-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5">
                <div className="flex items-center gap-3.5 border-b border-rose-500/20 pb-4">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/35 mb-1">
                      طلب غير مقبول
                    </span>
                    <h2 className="text-base font-bold text-white">لم يتم قبول طلب التوثيق</h2>
                  </div>
                </div>

                <div className="bg-rose-950/50 border border-rose-500/40 rounded-2xl p-4 space-y-1.5">
                  <span className="text-xs font-bold text-rose-300 block">سبب الرفض:</span>
                  <p className="text-xs text-rose-100 font-medium leading-relaxed">
                    {verification.rejection_reason || "الصور المرفقة غير واضحة أو البيانات لا تطابق شروط التوثيق."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="w-full py-4 bg-[#C8A45C] hover:bg-[#b8934b] text-black font-black text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                >
                  <RotateCcw className="w-4 h-4" />
                  إعادة تقديم طلب توثيق جديد
                </button>
              </div>
            )}
          </div>
        )}

        {/* SUBMISSION FORM (When no request or when editing resubmission) */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-[#C8A45C]">نموذج توثيق الهوية</h2>
                <p className="text-xs text-[#9CA3AF]">يرجى تعبئة البيانات بدقة وإرفاق صور واضحة لوثائقك.</p>
              </div>
              {verification && verification.status === "rejected" && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-[#9CA3AF] hover:text-[#E5E7EB] underline"
                >
                  إلغاء والعودة
                </button>
              )}
            </div>

            {/* Instruction Banner */}
            <div className="bg-[#1A1A1A] border border-[#C8A45C]/25 rounded-2xl p-4 text-xs text-[#E5E7EB] space-y-2">
              <div className="font-bold text-[#C8A45C] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#C8A45C]" />
                شروط قبول وثائق الهوية:
              </div>
              <ul className="list-disc list-inside space-y-1 text-[#9CA3AF] text-[11px] leading-relaxed">
                <li>أن تكون بطاقة الهوية أو جواز السفر ساري المفعول وبأحرف واضحة.</li>
                <li>تجنب وجود انعكاسات ضوئية قوية أو تغبيش يُخفي البيانات.</li>
                <li>في صورة السيلفي، يجب أن يظهر وجهك كاملاً وأنت تحمل بطاقة الهوية بجانبه بوضوح.</li>
              </ul>
            </div>

            {/* Field 1: Full Name */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#E5E7EB] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8A45C]" />
                <span>الاسم الكامل كما يظهر بالهوية</span>
                <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل اسمك الثلاثي أو الرباعي كما في البطاقة..."
                required
                className="w-full bg-[#3D3D3D] border border-[#C8A45C]/30 focus:border-[#C8A45C] focus:ring-1 focus:ring-[#C8A45C] rounded-2xl px-4 py-3.5 text-xs text-[#E5E7EB] placeholder-gray-400 focus:outline-none transition-all shadow-inner"
              />
            </div>

            {/* File Uploaders Grid */}
            <div className="space-y-5">
              {renderDropzone(
                "صورة الوجه الأمامي للهوية",
                "صورة واضحة للجهة الأمامية من الهوية الشخصية أو جواز السفر",
                idFrontImage,
                setIdFrontImage,
                "front-id-input"
              )}

              {renderDropzone(
                "صورة الوجه الخلفي للهوية",
                "صورة واضحة للجهة الخلفية من الهوية الشخصية",
                idBackImage,
                setIdBackImage,
                "back-id-input"
              )}

              {renderDropzone(
                "صورة سيلفي وأنت تحمل الهوية",
                "صورة شخصية حديثة وأنت تمسك البطاقة بجانب وجهك بوضوح",
                selfieImage,
                setSelfieImage,
                "selfie-id-input"
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-[#C8A45C] hover:bg-[#b8934b] text-black font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري رفع الوثائق وإرسال الطلب...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  إرسال طلب التوثيق للمراجعة
                </>
              )}
            </button>
          </form>
        )}

      </div>

      {/* Lightbox / Preview Modal */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-[#2D2D2D] border border-[#C8A45C]/40 rounded-3xl overflow-hidden p-3 shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <span className="text-xs font-bold text-[#FDE68A]">{previewModalImg.title}</span>
              <button
                onClick={() => setPreviewModalImg(null)}
                className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-[80vh] flex items-center justify-center overflow-auto bg-black/70 rounded-2xl mt-2">
              <img src={previewModalImg.src} alt="Preview" className="max-h-[75vh] w-auto object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
