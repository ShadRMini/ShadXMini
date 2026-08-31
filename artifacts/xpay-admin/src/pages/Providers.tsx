import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, del, post, put } from "../lib/api";
import { Plus, Edit2, Trash2, X, Save, Search, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { api } from "../lib/api";

interface Provider {
  id: number;
  name: string;
  apiUrl: string | null;
  apiKey: string | null;
  notes: string | null;
  priority: number;
  active: boolean;
  providerType: string;
  productsEndpoint?: string | null;
  profileEndpoint?: string | null;
  orderEndpoint?: string | null;
  checkEndpoint?: string | null;
  tokenHeader?: string | null;
}

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const navigate = useNavigate();

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const data = await get<Provider[]>("/providers");
      setProviders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Fetch providers error:", err);
      setFeedback({ text: err.message || "فشل تحميل قائمة المزودين", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleSync = async (id: number) => {
    setSyncing(id);
    setSyncMessage(null);
    try {
      const res = await api<any>(`/providers/${id}/sync`, { method: "POST" });
      setSyncMessage(`✅ ${res.message || "تمت المزامنة بنجاح"}`);
    } catch (err: any) {
      setSyncMessage(`❌ ${err.message || "فشلت المزامنة"}`);
    } finally {
      setSyncing(null);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المزود؟ سيتم حذف المنتجات المرتبطة به أيضاً.")) return;
    try {
      await del(`/providers/${id}`);
      setFeedback({ text: "تم حذف المزود بنجاح", type: "success" });
      await fetchProviders();
    } catch (err: any) {
      setFeedback({ text: err.message || "فشل حذف المزود", type: "error" });
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editing) return;

    // Client-side validation
    const name = String(editing.name || "").trim();
    if (!name) {
      setFormError("يرجى إدخال اسم المزود.");
      return;
    }

    const payload = {
      name,
      apiUrl: editing.apiUrl ? String(editing.apiUrl).trim() : null,
      apiKey: editing.apiKey ? String(editing.apiKey).trim() : null,
      notes: editing.notes ? String(editing.notes).trim() : null,
      priority: Number(editing.priority || 0),
      active: Boolean(editing.active),
      providerType: editing.providerType ? String(editing.providerType).trim() : "custom",
      productsEndpoint: editing.productsEndpoint ? String(editing.productsEndpoint).trim() : null,
      profileEndpoint: editing.profileEndpoint ? String(editing.profileEndpoint).trim() : null,
      orderEndpoint: editing.orderEndpoint ? String(editing.orderEndpoint).trim() : null,
      checkEndpoint: editing.checkEndpoint ? String(editing.checkEndpoint).trim() : null,
      tokenHeader: editing.tokenHeader ? String(editing.tokenHeader).trim() : null,
    };

    setSaving(true);
    setFormError(null);

    try {
      if (editing.id) {
        await put(`/providers/${editing.id}`, payload);
        setFeedback({ text: "تم تحديث بيانات المزود بنجاح", type: "success" });
      } else {
        await post("/providers", payload);
        setFeedback({ text: "تمت إضافة المزود بنجاح", type: "success" });
      }
      setEditing(null);
      await fetchProviders();
    } catch (err: any) {
      console.error("Save provider error:", err);
      setFormError(err.message || "حدث خطأ أثناء حفظ بيانات المزود. يرجى المحاولة مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  // دالة استخراج المعرف للتنقل إلى المنتجات
  const navigateToProducts = (p: any, event: React.MouseEvent, searchMode = false) => {
    let pid: any = p.id ?? (p as any).ID ?? (p as any).providerId ?? (p as any).provider_id;
    
    if (pid === undefined || pid === null || isNaN(Number(pid))) {
      const target = event.currentTarget as HTMLElement;
      const row = target.closest("tr") as HTMLTableRowElement | null;
      if (row) {
        const firstCell = row.cells[0]?.textContent?.trim();
        if (firstCell && !isNaN(Number(firstCell))) {
          pid = Number(firstCell);
        }
      }
    }
    
    if (pid === undefined || pid === null || isNaN(Number(pid))) {
      alert(`تعذر استخراج معرف المزود.`);
      return;
    }
    
    navigate(`/providers/${pid}/products${searchMode ? "?search=1" : ""}`);
  };

  const openNewProviderModal = () => {
    setFormError(null);
    setEditing({
      name: "",
      apiUrl: "",
      apiKey: "",
      notes: "",
      priority: 0,
      active: true,
      providerType: "custom",
      productsEndpoint: "",
      profileEndpoint: "",
      orderEndpoint: "",
      checkEndpoint: "",
      tokenHeader: "",
    });
  };

  const openEditProviderModal = (provider: Provider) => {
    setFormError(null);
    setEditing({ ...provider });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Card */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A]">إدارة المزودين</h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">إدارة مزودي API وربط بوابات التزويد ومزامنة المنتجات</p>
        </div>
        <button
          onClick={openNewProviderModal}
          className="flex items-center gap-2 bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] px-4 py-2.5 rounded-xl font-black transition shadow-md cursor-pointer text-xs sm:text-sm"
        >
          <Plus size={18} /> إضافة جديد
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm font-bold border shadow-lg ${
            feedback.type === "success"
              ? "bg-[#1A1A1A] text-[#FDE68A] border-[#C8A45C]/40"
              : "bg-rose-950/50 text-rose-300 border-rose-800/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? <CheckCircle2 size={18} className="text-[#C8A45C]" /> : <AlertCircle size={18} className="text-rose-400" />}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-white p-1 rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {syncMessage && (
        <div className="p-4 bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-2xl text-sm font-bold text-[#FDE68A] shadow-md">
          {syncMessage}
        </div>
      )}

      {/* Providers Data Table */}
      <div className="bg-[#2D2D2D] rounded-3xl shadow-xl border border-[#C8A45C]/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-right border-collapse">
            <thead className="bg-[#1A1A1A] text-[#FDE68A] border-b border-[#C8A45C]/30 select-none">
              <tr>
                <th className="px-5 py-4 font-black w-16 text-right">#</th>
                <th className="px-5 py-4 font-black text-right">الاسم</th>
                <th className="px-5 py-4 font-black text-right">النوع</th>
                <th className="px-5 py-4 font-black text-center w-24">مفعل</th>
                <th className="px-5 py-4 font-black text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 bg-[#242424] text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-[#C8A45C] border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-sm font-bold text-[#FDE68A]">جاري تحميل قائمة المزودين...</span>
                    </div>
                  </td>
                </tr>
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 bg-[#242424] text-zinc-400">
                    لا يوجد مزودون مسجلون حالياً
                  </td>
                </tr>
              ) : (
                providers.map((p, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? "bg-[#242424]" : "bg-[#2D2D2D]";

                  return (
                    <tr
                      key={p.id ?? Math.random()}
                      className={`${rowBg} border-b border-[#C8A45C]/10 hover:bg-[#353535] transition-colors`}
                    >
                      <td className="px-5 py-3.5 text-[#C8A45C] font-mono font-bold">{p.id}</td>
                      <td className="px-5 py-3.5 font-bold text-white text-sm">{p.name}</td>
                      <td className="px-5 py-3.5 text-xs">
                        <span className="bg-[#1A1A1A] text-[#FDE68A] border border-[#C8A45C]/30 px-2.5 py-1 rounded-lg font-mono font-semibold">
                          {p.providerType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {p.active ? (
                          <span className="text-[#FDE68A] text-xs font-bold bg-[#C8A45C]/20 border border-[#C8A45C]/40 px-2.5 py-1 rounded-lg inline-block">
                            نعم
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs font-bold bg-[#1A1A1A] border border-zinc-700 px-2.5 py-1 rounded-lg inline-block">
                            لا
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-center flex-wrap">
                          {/* Products Button: Gold Button */}
                          <button
                            onClick={(e) => navigateToProducts(p, e)}
                            className="px-3 py-1.5 bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
                          >
                            منتجات
                          </button>

                          {/* Search Button: Dark with Gold border */}
                          <button
                            onClick={(e) => navigateToProducts(p, e, true)}
                            className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Search size={12} className="text-[#C8A45C]" /> بحث
                          </button>

                          {/* Sync Button */}
                          <button
                            onClick={() => handleSync(p.id)}
                            disabled={syncing === p.id}
                            className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#383838] text-zinc-300 hover:text-white border border-[#C8A45C]/30 rounded-xl disabled:opacity-50 text-xs font-bold transition cursor-pointer"
                          >
                            {syncing === p.id ? "⏳ جاري..." : "مزامنة"}
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => openEditProviderModal(p)}
                            className="p-1.5 text-zinc-300 hover:text-[#FDE68A] bg-[#1A1A1A] hover:bg-[#383838] border border-[#C8A45C]/20 hover:border-[#C8A45C] rounded-xl transition cursor-pointer"
                            title="تعديل"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 bg-[#1A1A1A] hover:bg-rose-950/40 border border-rose-800/30 hover:border-rose-700 rounded-xl transition cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Provider Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#2D2D2D] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#C8A45C]/40 text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[#C8A45C]/30 bg-[#1A1A1A]">
              <h2 className="text-lg font-black text-[#FDE68A]">{editing.id ? "تعديل بيانات المزود" : "إضافة مزود جديد"}</h2>
              <button
                type="button"
                onClick={() => !saving && setEditing(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">الاسم *</label>
                <input
                  type="text"
                  className="w-full bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                  value={editing.name || ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="مثال: متجر المزود الرئيسي"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">رابط API (API URL)</label>
                <input
                  type="text"
                  className="w-full bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                  value={editing.apiUrl || ""}
                  onChange={(e) => setEditing({ ...editing, apiUrl: e.target.value })}
                  placeholder="https://api.example.com/v2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">مفتاح API (API Key)</label>
                <input
                  type="text"
                  className="w-full bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                  value={editing.apiKey || ""}
                  onChange={(e) => setEditing({ ...editing, apiKey: e.target.value })}
                  placeholder="أدخل مفتاح API الخاص بالمزود"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">نوع المزود (Provider Type)</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    list="provider-types-list"
                    className="w-full bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                    value={editing.providerType || "custom"}
                    onChange={(e) => setEditing({ ...editing, providerType: e.target.value })}
                    placeholder="custom"
                  />
                  <datalist id="provider-types-list">
                    <option value="custom">custom (مزود يدوي / مخصص)</option>
                    <option value="mersal">mersal (Mersal Card API)</option>
                    <option value="alkasr">alkasr (Alkasr Card API)</option>
                    <option value="gold">gold (Gold Card API)</option>
                    <option value="manual">manual (مزود يدوي بدون API)</option>
                  </datalist>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { id: "custom", label: "مخصص (Custom)" },
                      { id: "mersal", label: "Mersal API" },
                      { id: "alkasr", label: "Alkasr API" },
                      { id: "gold", label: "Gold API" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEditing({ ...editing, providerType: t.id })}
                        className={`text-xs px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                          (editing.providerType || "custom").toLowerCase() === t.id
                            ? "bg-[#C8A45C] border-[#C8A45C] text-[#1A1A1A] font-black"
                            : "bg-[#1A1A1A] border-[#C8A45C]/30 text-zinc-300 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-2xl space-y-3">
                <div className="text-xs font-black text-[#FDE68A] uppercase tracking-wider">إعدادات مسارات API المخصصة (Endpoints)</div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">مسار جلب المنتجات (Products Endpoint)</label>
                  <input
                    type="text"
                    className="w-full bg-[#242424] border border-[#C8A45C]/20 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C]"
                    value={editing.productsEndpoint || ""}
                    onChange={(e) => setEditing({ ...editing, productsEndpoint: e.target.value })}
                    placeholder="/api/v2/products أو فارغ للافتراضي"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">مسار الملف الشخصي/الرصيد (Profile Endpoint)</label>
                  <input
                    type="text"
                    className="w-full bg-[#242424] border border-[#C8A45C]/20 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C]"
                    value={editing.profileEndpoint || ""}
                    onChange={(e) => setEditing({ ...editing, profileEndpoint: e.target.value })}
                    placeholder="/api/v2/profile"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">مسار إنشاء الطلب (Order Endpoint)</label>
                  <input
                    type="text"
                    className="w-full bg-[#242424] border border-[#C8A45C]/20 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C]"
                    value={editing.orderEndpoint || ""}
                    onChange={(e) => setEditing({ ...editing, orderEndpoint: e.target.value })}
                    placeholder="/api/v2/orders"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">مسار التحقق من حالة الطلب (Check Status Endpoint)</label>
                  <input
                    type="text"
                    className="w-full bg-[#242424] border border-[#C8A45C]/20 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C]"
                    value={editing.checkEndpoint || ""}
                    onChange={(e) => setEditing({ ...editing, checkEndpoint: e.target.value })}
                    placeholder="/api/v2/orders/check"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">اسم ترويسة المفتاح (Token Header Name)</label>
                  <input
                    type="text"
                    className="w-full bg-[#242424] border border-[#C8A45C]/20 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C]"
                    value={editing.tokenHeader || ""}
                    onChange={(e) => setEditing({ ...editing, tokenHeader: e.target.value })}
                    placeholder="Authorization أو api-key أو X-API-KEY"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">ملاحظات</label>
                <textarea
                  className="w-full bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                  rows={3}
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="أي معلومات أو تعليمات خاصة بهذا المزود..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">الأولوية (Priority)</label>
                <input
                  type="number"
                  className="w-full bg-[#1A1A1A] border border-[#C8A45C]/30 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                  value={editing.priority ?? 0}
                  onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}
                />
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="w-4 h-4 rounded text-[#C8A45C] accent-[#C8A45C]"
                />
                <span className="text-sm font-bold text-zinc-200">مزود مفعّل</span>
              </label>

              <div className="flex items-center gap-3 pt-4 border-t border-[#C8A45C]/20">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] px-6 py-2.5 rounded-xl font-black transition disabled:opacity-50 shadow-md cursor-pointer text-sm"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditing(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-zinc-400 hover:text-white bg-[#1A1A1A] border border-[#C8A45C]/30 hover:bg-[#383838] transition disabled:opacity-50 text-sm cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
