import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  RotateCcw,
  Send,
  Loader2,
  Info,
  Eye,
  X
} from "lucide-react";
import { getPublicJson } from "@/lib/public-api";
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
  const { user } = useAuth();
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
      const res = await getPublicJson("/me/identity-verification");
      if (res && res.verification) {
        setVerification(res.verification);
        // Pre-fill full name if user wants to resubmit
        if (res.verification.full_name) {
          setFullName(res.verification.full_name);
        }
      } else {
        setVerification(null);
        setShowForm(true);
      }
    } catch (err: any) {
      console.error("Error fetching verification status:", err);
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
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 8 ميغابايت.");
      return;
    }

    setErrorMsg(null);

    // Compress & convert to Data URL
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
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
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
      setErrorMsg("يرجى كتابة الاسم الكامل كما يظهر بالهوية (3 أحرف على الأقل).");
      return;
    }
    if (!idFrontImage) {
      setErrorMsg("يرجى رفع صورة الوجه الأمامي للهوية.");
      return;
    }
    if (!idBackImage) {
      setErrorMsg("يرجى رفع صورة الوجه الخلفي للهوية.");
      return;
    }
    if (!selfieImage) {
      setErrorMsg("يرجى رفع صورة السيلفي مع الهوية.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/me/identity-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          idFrontImage,
          idBackImage,
          selfieImage,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "فشل إرسال طلب التوثيق.");
      }

      setSuccessMsg("تم إرسال طلب توثيق الهوية بنجاح، وهو قيد المراجعة الآن.");
      setVerification(data.verification);
      setShowForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء إرسال البيانات.");
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
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[#E5E7EB] flex items-center justify-between">
          <span>{label} <span className="text-red-400">*</span></span>
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
        </label>

        {value ? (
          <div className="relative group border-2 border-[#C8A45C]/50 rounded-2xl overflow-hidden bg-[#111111] h-44 flex items-center justify-center">
            <img src={value} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewModalImg({ src: value, title: label })}
                className="px-3 py-1.5 bg-[#C8A45C] text-black text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-[#FDE68A] transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                تكبير
              </button>
              <button
                type="button"
                onClick={() => setter("")}
                className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-rose-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                تغيير
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleFileUpload(e, setter)}
            className="border-2 border-dashed border-[#C8A45C]/35 hover:border-[#C8A45C] bg-[#222222]/80 hover:bg-[#2A2A2A] rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px]"
            onClick={() => document.getElementById(inputId)?.click()}
          >
            <input
              type="file"
              id={inputId}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, setter)}
            />
            <div className="w-10 h-10 rounded-full bg-[#C8A45C]/15 flex items-center justify-center mb-2 text-[#C8A45C]">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-[#FDE68A] mb-1">اضغط هنا أو اسحب الصورة لإرفاقها</p>
            <p className="text-[11px] text-[#9CA3AF]">{sublabel}</p>
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
    <div className="min-h-screen bg-[#1A1A1A] text-white p-4 sm:p-6 pb-24 animate-in fade-in duration-300" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex items-center gap-3 bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#C8A45C]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#C8A45C] to-[#8A6D3B] text-black flex items-center justify-center shadow-lg shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#FDE68A]">توثيق الهوية والحساب</h1>
            <p className="text-xs text-[#9CA3AF] font-medium">
              تأكيد الهوية لرفع موثوقية حسابك وتفعيل كافة المزايا والعمليات المالية.
            </p>
          </div>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="bg-rose-950/70 border border-rose-500/50 rounded-2xl p-4 flex items-start gap-3 text-rose-200 text-xs font-medium animate-in slide-in-from-top duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-4 flex items-start gap-3 text-emerald-200 text-xs font-medium animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Status Display Card (If record exists and not currently editing form) */}
        {verification && !showForm && (
          <div className="space-y-6">
            {/* PENDING STATUS */}
            {verification.status === "pending" && (
              <div className="bg-[#2D2D2D] border border-amber-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5">
                <div className="flex items-center gap-3 border-b border-amber-500/20 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
                      قيد المراجعة
                    </span>
                    <h2 className="text-lg font-bold text-white">طلب التوثيق قيد التدقيق والمراجعة</h2>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[#E5E7EB]">
                  <div className="flex justify-between border-b border-white/5 py-1.5">
                    <span className="text-[#9CA3AF]">الاسم الكامل:</span>
                    <span className="font-bold text-[#FDE68A]">{verification.full_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 py-1.5">
                    <span className="text-[#9CA3AF]">تاريخ الإرسال:</span>
                    <span className="font-medium text-gray-300">
                      {new Date(verification.created_at).toLocaleString("ar")}
                    </span>
                  </div>
                </div>

                {/* Photos Submitted Preview */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#C8A45C]">الصور المرفقة بالطلب:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div
                      onClick={() => setPreviewModalImg({ src: verification.id_front_image, title: "الوجه الأمامي" })}
                      className="cursor-pointer group relative border border-white/10 hover:border-[#C8A45C] rounded-xl overflow-hidden bg-black/40 h-24"
                    >
                      <img src={verification.id_front_image} alt="front" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity">
                        الوجه الأمامي
                      </div>
                    </div>
                    <div
                      onClick={() => setPreviewModalImg({ src: verification.id_back_image, title: "الوجه الخلفي" })}
                      className="cursor-pointer group relative border border-white/10 hover:border-[#C8A45C] rounded-xl overflow-hidden bg-black/40 h-24"
                    >
                      <img src={verification.id_back_image} alt="back" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity">
                        الوجه الخلفي
                      </div>
                    </div>
                    <div
                      onClick={() => setPreviewModalImg({ src: verification.selfie_image, title: "سيلفي الهوية" })}
                      className="cursor-pointer group relative border border-white/10 hover:border-[#C8A45C] rounded-xl overflow-hidden bg-black/40 h-24"
                    >
                      <img src={verification.selfie_image} alt="selfie" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity">
                        السيلفي
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    يقوم فريق الإدارة بمراجعة وثائق الهوية والتحقق من طابقيتها لضمان الأمان. وسيصلك إشعار فوري في التطبيق فور اعتماد الطلب.
                  </span>
                </div>
              </div>
            )}

            {/* APPROVED STATUS */}
            {verification.status === "approved" && (
              <div className="bg-[#2D2D2D] border border-emerald-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5">
                <div className="flex items-center gap-3 border-b border-emerald-500/20 pb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1">
                      حساب موثق ومحتسب ✅
                    </span>
                    <h2 className="text-lg font-bold text-white">تم توثيق هويتك بنجاح</h2>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[#E5E7EB]">
                  <div className="flex justify-between border-b border-white/5 py-1.5">
                    <span className="text-[#9CA3AF]">الاسم المعتمد:</span>
                    <span className="font-bold text-[#FDE68A]">{verification.full_name}</span>
                  </div>
                  {verification.reviewed_at && (
                    <div className="flex justify-between border-b border-white/5 py-1.5">
                      <span className="text-[#9CA3AF]">تاريخ التوثيق:</span>
                      <span className="font-medium text-gray-300">
                        {new Date(verification.reviewed_at).toLocaleString("ar")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 text-xs text-emerald-200/90 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    هويتك موثقة بالكامل. يمكنك الآن الاستفادة من كافة الصلاحيات المتقدمة، حدود الشحن المرتفعة، والمعاملات الفورية السريعة.
                  </span>
                </div>
              </div>
            )}

            {/* REJECTED STATUS */}
            {verification.status === "rejected" && (
              <div className="bg-[#2D2D2D] border border-rose-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-5">
                <div className="flex items-center gap-3 border-b border-rose-500/20 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-1">
                      طلب مرفوض
                    </span>
                    <h2 className="text-lg font-bold text-white">لم يتم قبول طلب التوثيق السابق</h2>
                  </div>
                </div>

                <div className="bg-rose-950/50 border border-rose-500/40 rounded-2xl p-4 space-y-1">
                  <span className="text-xs font-bold text-rose-300 block">سبب عدم القبول:</span>
                  <p className="text-xs text-rose-100 font-medium leading-relaxed">
                    {verification.rejection_reason || "الصور غير واضحة أو البيانات لا تطابق شروط التوثيق."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-[#C8A45C] to-[#E2C280] text-black font-black text-xs rounded-2xl hover:brightness-110 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
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
          <form onSubmit={handleSubmit} className="bg-[#2D2D2D] border border-[#C8A45C]/35 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-[#FDE68A]">نموذج توثيق الهوية</h2>
                <p className="text-xs text-[#9CA3AF]">يرجى تعبئة البيانات بدقة وإرفاق صور حديثة وواضحة.</p>
              </div>
              {verification && verification.status === "rejected" && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs text-[#9CA3AF] hover:text-white underline"
                >
                  إلغاء وتراجع
                </button>
              )}
            </div>

            {/* Instruction Banner */}
            <div className="bg-[#1A1A1A] border border-[#C8A45C]/20 rounded-2xl p-3.5 text-xs text-[#E5E7EB] space-y-1.5">
              <div className="font-bold text-[#C8A45C] flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                شروط قبول وثائق الهوية:
              </div>
              <ul className="list-disc list-inside space-y-1 text-[#9CA3AF] text-[11px]">
                <li>أن تكون الهوية أو جواز السفر ساري المفعول وبخط واضح.</li>
                <li>تجنب وجود انعكاسات ضوئية قوية تُخفي البيانات.</li>
                <li>في صورة السيلفي، تأكد من إبراز وجهك وبطاقة الهوية بجانبه بوضوح.</li>
              </ul>
            </div>

            {/* Field 1: Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#E5E7EB]">
                الاسم الكامل كما يظهر بالهوية <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل اسمك الثلاثي أو الرباعي كما في البطاقة..."
                required
                className="w-full bg-[#1A1A1A] border border-white/15 focus:border-[#C8A45C] rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
              />
            </div>

            {/* File Uploaders Grid */}
            <div className="space-y-4">
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
              className="w-full py-4 bg-gradient-to-r from-[#C8A45C] to-[#E2C280] text-black font-black text-sm rounded-2xl hover:brightness-110 shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
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
          <div className="relative max-w-3xl w-full bg-[#2D2D2D] border border-[#C8A45C]/40 rounded-3xl overflow-hidden p-2 shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <span className="text-xs font-bold text-[#FDE68A]">{previewModalImg.title}</span>
              <button
                onClick={() => setPreviewModalImg(null)}
                className="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-[80vh] flex items-center justify-center overflow-auto bg-black/60 rounded-2xl mt-2">
              <img src={previewModalImg.src} alt="Preview" className="max-h-[75vh] w-auto object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
