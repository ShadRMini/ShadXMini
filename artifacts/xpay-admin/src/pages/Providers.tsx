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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">المزودون</h1>
        <button
          onClick={openNewProviderModal}
          className="flex items-center gap-2 bg-slate-900 text-[#C8A45C] hover:bg-slate-800 px-4 py-2 rounded-xl font-bold transition shadow-sm"
        >
          <Plus size={18} /> إضافة جديد
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-medium border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {syncMessage && (
        <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium">
          {syncMessage}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="text-right px-4 py-3 font-semibold">#</th>
              <th className="text-right px-4 py-3 font-semibold">الاسم</th>
              <th className="text-right px-4 py-3 font-semibold">النوع</th>
              <th className="text-right px-4 py-3 font-semibold">مفعل</th>
              <th className="text-center px-4 py-3 font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">جاري التحميل...</td></tr>
            ) : providers.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">لا يوجد مزودون</td></tr>
            ) : (
              providers.map((p) => {
                return (
                  <tr key={p.id ?? Math.random()} className="border-t border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-500 font-mono">{p.id}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">{p.providerType}</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.active ? (
                        <span className="text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">نعم</span>
                      ) : (
                        <span className="text-slate-500 text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-md">لا</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-center">
                        <button
                          onClick={(e) => navigateToProducts(p, e)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium transition"
                        >
                          منتجات
                        </button>
                        <button
                          onClick={(e) => navigateToProducts(p, e, true)}
                          className="px-2.5 py-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-xs font-medium flex items-center gap-1 transition"
                        >
                          <Search size={12} /> بحث
                        </button>
                        <button
                          onClick={() => handleSync(p.id)}
                          disabled={syncing === p.id}
                          className="px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs font-medium transition"
                        >
                          {syncing === p.id ? "⏳ جاري..." : "مزامنة"}
                        </button>
                        <button
                          onClick={() => openEditProviderModal(p)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="تعديل"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="حذف"
                        >
                          <Trash2 size={15} />
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

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editing.id ? "تعديل بيانات المزود" : "إضافة مزود جديد"}</h2>
              <button
                type="button"
                onClick={() => !saving && setEditing(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">الاسم *</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                  value={editing.name || ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="مثال: متجر المزود الرئيسي"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">رابط API (API URL)</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                  value={editing.apiUrl || ""}
                  onChange={(e) => setEditing({ ...editing, apiUrl: e.target.value })}
                  placeholder="https://api.example.com/v2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">مفتاح API (API Key)</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                  value={editing.apiKey || ""}
                  onChange={(e) => setEditing({ ...editing, apiKey: e.target.value })}
                  placeholder="أدخل مفتاح API الخاص بالمزود"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">نوع المزود (Provider Type)</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    list="provider-types-list"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
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
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          (editing.providerType || "custom").toLowerCase() === t.id
                            ? "bg-[#C8A45C]/15 border-[#C8A45C] text-[#8C6D23] font-bold"
                            : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">إعدادات مسارات API المخصصة (Endpoints)</div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">مسار جلب المنتجات (Products Endpoint)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                    value={editing.productsEndpoint || ""}
                    onChange={(e) => setEditing({ ...editing, productsEndpoint: e.target.value })}
                    placeholder="/api/v2/products أو فارغ لاستخدام الافتراضي"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">مسار الملف الشخصي/الرصيد (Profile Endpoint)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                    value={editing.profileEndpoint || ""}
                    onChange={(e) => setEditing({ ...editing, profileEndpoint: e.target.value })}
                    placeholder="/api/v2/profile"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">مسار إنشاء الطلب (Order Endpoint)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                    value={editing.orderEndpoint || ""}
                    onChange={(e) => setEditing({ ...editing, orderEndpoint: e.target.value })}
                    placeholder="/api/v2/orders"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">مسار التحقق من حالة الطلب (Check Status Endpoint)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                    value={editing.checkEndpoint || ""}
                    onChange={(e) => setEditing({ ...editing, checkEndpoint: e.target.value })}
                    placeholder="/api/v2/orders/check"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">اسم ترويسة المفتاح (Token Header Name)</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                    value={editing.tokenHeader || ""}
                    onChange={(e) => setEditing({ ...editing, tokenHeader: e.target.value })}
                    placeholder="Authorization أو api-key أو X-API-KEY"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">ملاحظات</label>
                <textarea
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                  rows={3}
                  value={editing.notes || ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="أي معلومات أو تعليمات خاصة بهذا المزود..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">الأولوية (Priority)</label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A45C] focus:border-[#C8A45C]"
                  value={editing.priority ?? 0}
                  onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })}
                />
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="w-4 h-4 rounded text-slate-900 accent-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">مزود مفعّل</span>
              </label>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 bg-slate-900 text-[#C8A45C] hover:bg-slate-800 px-5 py-2.5 rounded-xl font-bold transition disabled:opacity-50 shadow-sm"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditing(null)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
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
