import React, { useState, useEffect } from "react";
import { get, put } from "../lib/api";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import ColorPickerField from "../components/ColorPickerField";
import {
  QrCode,
  Wallet,
  Palette,
  Sliders,
  Sparkles,
  Save,
  RefreshCw,
  ShieldCheck,
  Eye,
  Check,
  Copy,
  AlertCircle,
  FileText,
  DollarSign
} from "lucide-react";

export default function ShamCashSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 12 Fields State
  const [walletAddress, setWalletAddress] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrSize, setQrSize] = useState<number>(280);
  const [showQr, setShowQr] = useState<boolean>(true);
  const [instructions, setInstructions] = useState(
    "يرجى التحويل إلى عنوان المحفظة ثم إدخال رقم العملية للتأكيد الفوري."
  );
  const [minAmount, setMinAmount] = useState<number>(1);

  // 6 Design Colors
  const [pageBg, setPageBg] = useState("#1A1A1A");
  const [cardBg, setCardBg] = useState("#2D2D2D");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [buttonBg, setButtonBg] = useState("#C8A45C");
  const [borderColor, setBorderColor] = useState("rgba(200, 164, 92, 0.25)");
  const [inputBg, setInputBg] = useState("#3D3D3D");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await get<any>("/admin/shamcash-settings");
      if (data) {
        setWalletAddress(data.wallet_address || "");
        setQrImageUrl(data.qr_image_url || "");
        setQrSize(Number(data.qr_size) || 280);
        setShowQr(data.show_qr !== undefined ? Boolean(data.show_qr) : true);
        setInstructions(data.instructions || "يرجى التحويل إلى عنوان المحفظة ثم إدخال رقم العملية للتأكيد الفوري.");
        setMinAmount(Number(data.min_amount) || 1);

        if (data.page_bg) setPageBg(data.page_bg);
        if (data.card_bg) setCardBg(data.card_bg);
        if (data.text_color) setTextColor(data.text_color);
        if (data.button_bg) setButtonBg(data.button_bg);
        if (data.border_color) setBorderColor(data.border_color);
        if (data.input_bg) setInputBg(data.input_bg);
      }
    } catch (err) {
      console.warn("Could not fetch shamcash settings:", err);
      toast.error("فشل جلب إعدادات محفظة شام كاش من السيرفر");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        wallet_address: walletAddress.trim(),
        qr_image_url: qrImageUrl.trim(),
        qr_size: qrSize,
        show_qr: showQr,
        instructions: instructions.trim(),
        min_amount: minAmount,
        page_bg: pageBg,
        card_bg: cardBg,
        text_color: textColor,
        button_bg: buttonBg,
        border_color: borderColor,
        input_bg: inputBg,
      };

      await put("/admin/shamcash-settings", payload);
      toast.success("تم حفظ إعدادات وتصميم محفظة شام كاش بنجاح!");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
        <span>جاري تحميل إعدادات شام كاش...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* Top Header & Save Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-card rounded-2xl border border-border shadow-xs">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <QrCode className="w-6 h-6 text-amber-500" />
            <span>إعدادات وتصميم محفظة شام كاش (ShamCash)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            التحكم الكامل بعنوان المحفظة، صورة الـ QR Code، ألوان الواجهة، والتعليمات.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md active:scale-95"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Wallet Data Settings */}
          <div className="p-6 bg-card rounded-2xl border border-border shadow-xs space-y-5">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Wallet className="w-5 h-5 text-amber-500" />
              <span>البيانات الأساسية للمحفظة</span>
            </h3>

            {/* Wallet Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                عنوان المحفظة / معرف الحساب (Wallet Address)
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="أدخل عنوان محفظة شام كاش..."
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background font-mono text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-muted-foreground">
                عنوان المحفظة الخاص بك في تطبيق شام كاش الذي سيظهر للمستخدمين للتحويل إليه.
              </p>
            </div>

            {/* QR Image URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                رابط صورة الـ QR Code المخصصة (اختياري)
              </label>
              <input
                type="text"
                value={qrImageUrl}
                onChange={(e) => setQrImageUrl(e.target.value)}
                placeholder="https://example.com/qr-code.png"
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[11px] text-muted-foreground">
                إذا تركت هذا الحقل فارغاً، سيتم توليد رمز QR متجاوب تلقائياً من عنوان المحفظة.
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                تعليمات الإيداع للمستخدم
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                placeholder="اكتب تعليمات الإيداع هنا..."
                className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Min Amount & Show QR Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  الحد أدنى للإيداع ($)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={minAmount}
                  onChange={(e) => setMinAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-sm font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground block">
                  عرض رمز الـ QR Code
                </label>
                <button
                  type="button"
                  onClick={() => setShowQr(!showQr)}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition cursor-pointer ${
                    showQr
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>{showQr ? "مفعّل (يظهر للعميل)" : "معطّل (مخفي)"}</span>
                </button>
              </div>
            </div>

            {/* QR Size Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xs font-bold text-foreground">
                <span>حجم أبعاد مربع الـ QR (بكسل):</span>
                <span className="font-mono text-amber-500">{qrSize}px</span>
              </div>
              <input
                type="range"
                min="180"
                max="480"
                step="10"
                value={qrSize}
                onChange={(e) => setQrSize(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Section 2: Design & Colors Settings */}
          <div className="p-6 bg-card rounded-2xl border border-border shadow-xs space-y-5">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Palette className="w-5 h-5 text-amber-500" />
              <span>تخصيص ألوان الصفحة والكروت (6 ألوان)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ColorPickerField
                label="خلفية الصفحة (Page BG)"
                value={pageBg}
                onChange={setPageBg}
              />
              <ColorPickerField
                label="خلفية البطاقة (Card BG)"
                value={cardBg}
                onChange={setCardBg}
              />
              <ColorPickerField
                label="لون النصوص الرئيسي (Text Color)"
                value={textColor}
                onChange={setTextColor}
              />
              <ColorPickerField
                label="لون الأزرار والـ Highlight"
                value={buttonBg}
                onChange={setButtonBg}
              />
              <ColorPickerField
                label="لون الحدود (Border Color)"
                value={borderColor}
                onChange={setBorderColor}
              />
              <ColorPickerField
                label="خلفية حقول الإدخال (Input BG)"
                value={inputBg}
                onChange={setInputBg}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="p-4 bg-card rounded-2xl border border-border mb-3 flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-2 text-foreground">
                <Eye className="w-4 h-4 text-amber-500" />
                <span>معاينة حية لشكل الصفحة للعميل</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono">
                Live Preview
              </span>
            </div>

            {/* Live Preview Screen Container */}
            <div
              className="p-6 rounded-3xl border shadow-xl space-y-6 transition-all text-center"
              style={{
                backgroundColor: cardBg,
                borderColor: borderColor,
                color: textColor,
              }}
            >
              <div className="space-y-1">
                <h4 className="font-bold text-base">إيداع شام كاش</h4>
                <p className="text-xs opacity-75">{instructions}</p>
              </div>

              {/* QR Preview Box */}
              {showQr && (
                <div className="flex justify-center my-2">
                  <div
                    className="p-3 bg-white rounded-2xl border flex items-center justify-center overflow-hidden shadow-md"
                    style={{
                      width: `${Math.min(qrSize, 260)}px`,
                      height: `${Math.min(qrSize, 260)}px`,
                    }}
                  >
                    {qrImageUrl ? (
                      <img
                        src={qrImageUrl}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : walletAddress ? (
                      <QRCodeSVG
                        value={walletAddress}
                        size={256}
                        level="M"
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="text-amber-600 font-bold text-xs p-2 text-center">
                        <AlertCircle className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                        <span>أدخل عنوان المحفظة لعرض الـ QR</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Wallet Address Preview */}
              <div className="space-y-2">
                <span className="text-xs opacity-80 block font-semibold">
                  عنوان المحفظة / معرف الحساب
                </span>
                <div
                  className="p-3 rounded-xl border text-xs font-mono font-bold break-all"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                    color: buttonBg,
                  }}
                >
                  {walletAddress || "يرجى التواصل مع الدعم"}
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-xs"
                  style={{
                    backgroundColor: buttonBg,
                    color: "#000000",
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ معرف المحفظة</span>
                </button>
              </div>

              {/* Input field mock */}
              <div className="pt-2 text-right">
                <label className="text-xs font-bold block mb-1">المبلغ المراد إيداعه ($)</label>
                <div
                  className="p-3 rounded-xl border text-sm font-bold text-right"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: borderColor,
                    color: textColor,
                  }}
                >
                  $10.00
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
