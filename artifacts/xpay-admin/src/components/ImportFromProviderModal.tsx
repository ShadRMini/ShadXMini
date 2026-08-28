import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Search, Download, Server, Package, CheckCircle2, AlertTriangle, RefreshCw, Layers, DollarSign, Check } from "lucide-react";
import { get, post } from "../lib/api";

interface ImportFromProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: any[];
}

export default function ImportFromProviderModal({ isOpen, onClose, onSuccess, categories }: ImportFromProviderModalProps) {
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [remoteProducts, setRemoteProducts] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Load providers on open
  useEffect(() => {
    if (!isOpen) return;
    const fetchProviders = async () => {
      setLoadingProviders(true);
      try {
        const res = await get<any>("/admin/providers");
        if (Array.isArray(res)) {
          const active = res.filter((p: any) => p.active !== false);
          setProviders(active);
          if (active.length > 0 && !selectedProviderId) {
            setSelectedProviderId(String(active[0].id));
          }
        }
      } catch (err) {
        console.error("Failed to load providers:", err);
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
  }, [isOpen]);

  // Load products when selectedProviderId changes
  const fetchProductsForProvider = useCallback(async (provId: string) => {
    if (!provId) return;
    setLoadingProducts(true);
    setRemoteProducts([]);
    setSelectedIds({});
    try {
      const res = await get<any>(`/admin/provider-products/${provId}`);
      if (Array.isArray(res)) {
        setRemoteProducts(res);
        showToast(`تم جلب ${res.length} منتج من المزود بنجاح`);
      }
    } catch (err: any) {
      alert(err?.message || "فشل جلب منتجات المزود");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProviderId) {
      fetchProductsForProvider(selectedProviderId);
    }
  }, [selectedProviderId, fetchProductsForProvider]);

  const filteredProducts = useMemo(() => {
    return remoteProducts.filter((p) => {
      const q = search.toLowerCase();
      return (
        (p.name || "").toLowerCase().includes(q) ||
        String(p.id || "").toLowerCase().includes(q) ||
        String(p.externalServiceId || "").toLowerCase().includes(q)
      );
    });
  }, [remoteProducts, search]);

  const allSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedIds[p.id || p.externalServiceId]);
  }, [filteredProducts, selectedIds]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds({});
    } else {
      const next: Record<string, boolean> = {};
      filteredProducts.forEach((p) => {
        next[p.id || p.externalServiceId] = true;
      });
      setSelectedIds(next);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleImportSingle = async (item: any) => {
    try {
      await post("/admin/provider-products/import", {
        providerId: Number(selectedProviderId),
        name: item.name,
        price: item.price || item.priceUsd || 0,
        externalServiceId: item.externalServiceId || item.id,
        categoryId: defaultCategoryId ? Number(defaultCategoryId) : null,
      });
      showToast(`تم استيراد المنتج "${item.name}" بنجاح`);
      onSuccess();
    } catch (err: any) {
      alert(err?.message || "فشل استيراد المنتج");
    }
  };

  const handleImportSelected = async (itemsToImport: any[]) => {
    if (itemsToImport.length === 0) {
      alert("الرجاء تحديد منتج واحد على الأقل للاستيراد");
      return;
    }
    setImporting(true);
    setImportProgress({ current: 0, total: itemsToImport.length });
    let successCount = 0;

    try {
      for (let i = 0; i < itemsToImport.length; i++) {
        const item = itemsToImport[i];
        try {
          await post("/admin/provider-products/import", {
            providerId: Number(selectedProviderId),
            name: item.name,
            price: item.price || item.priceUsd || 0,
            externalServiceId: item.externalServiceId || item.id,
            categoryId: defaultCategoryId ? Number(defaultCategoryId) : null,
          });
          successCount++;
        } catch {
          // ignore duplicate or single fail
        }
        setImportProgress({ current: i + 1, total: itemsToImport.length });
      }

      showToast(`تم استيراد ${successCount} من أصل ${itemsToImport.length} منتج بنجاح`);
      onSuccess();
    } catch (err: any) {
      alert(`حدث خطأ أثناء الاستيراد: ${err.message}`);
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  if (!isOpen) return null;

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;
  const selectedItemsList = filteredProducts.filter((p) => selectedIds[p.id || p.externalServiceId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#C8A45C] text-[#1A1A1A] px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-2 border border-white/20 animate-bounce">
          <Sparkles size={18} />
          {toast}
        </div>
      )}

      <div className="bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#2D2D2D] p-5 border-b border-[#C8A45C]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
              <Download size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">استيراد المنتجات من مزود API (جدول متقدم)</h2>
              <p className="text-xs text-zinc-400">اختر المزود وحدد المنتجات لاستيرادها مباشرة إلى قاعدة بيانات المتجر</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 flex flex-col gap-5 overflow-hidden">
          {/* Controls Bar: Provider Selector & Category & Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#2D2D2D]/60 p-4 rounded-2xl border border-zinc-800">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Server size={14} className="text-[#C8A45C]" />
                اختر المزود الخارجي:
              </label>
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                disabled={loadingProviders}
                className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#C8A45C]"
              >
                {loadingProviders ? (
                  <option>جاري تحميل المزودين...</option>
                ) : providers.length === 0 ? (
                  <option value="">لا توجد مزودين نشطين</option>
                ) : (
                  providers.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name} ({p.type || "API"})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Layers size={14} className="text-[#C8A45C]" />
                الفئة الافتراضية للمنتجات المستوردة:
              </label>
              <select
                value={defaultCategoryId}
                onChange={(e) => setDefaultCategoryId(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#C8A45C]"
              >
                <option value="">بدون فئة (افتراضي)</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Search size={14} className="text-[#C8A45C]" />
                بحث سريع في منتجات المزود:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو المعرف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8A45C]"
                />
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center justify-between bg-[#2D2D2D]/30 px-4 py-3 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <span>إجمالي المنتجات: <strong className="text-[#FDE68A]">{remoteProducts.length}</strong></span>
              <span>•</span>
              <span>المحددة للاستيراد: <strong className="text-[#C8A45C]">{selectedCount}</strong></span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => selectedProviderId && fetchProductsForProvider(selectedProviderId)}
                disabled={loadingProducts || !selectedProviderId}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={loadingProducts ? "animate-spin text-[#C8A45C]" : ""} />
                إعادة جلب المنتجات
              </button>

              <button
                onClick={() => handleImportSelected(selectedItemsList)}
                disabled={importing || selectedCount === 0}
                className="px-4 py-2 rounded-xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] text-xs font-black transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                <Download size={14} />
                {importing ? "جاري الاستيراد..." : `استيراد المحددة (${selectedCount})`}
              </button>

              <button
                onClick={() => handleImportSelected(filteredProducts)}
                disabled={importing || filteredProducts.length === 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
              >
                <Package size={14} />
                {importing ? "جاري الاستيراد..." : `استيراد الكل المعروض (${filteredProducts.length})`}
              </button>
            </div>
          </div>

          {/* Progress Bar during batch import */}
          {importing && importProgress && (
            <div className="bg-[#2D2D2D] p-4 rounded-2xl border border-[#C8A45C]/40 space-y-2">
              <div className="flex justify-between text-xs font-bold text-zinc-300">
                <span>جاري استيراد المنتجات...</span>
                <span className="font-mono text-[#FDE68A]">{importProgress.current} / {importProgress.total}</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#C8A45C] h-2.5 transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Excel-like Products Table */}
          <div className="flex-1 overflow-auto border border-zinc-800 rounded-2xl bg-[#151515]">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#2D2D2D] text-zinc-300 sticky top-0 z-10 border-b border-zinc-700">
                <tr>
                  <th className="p-3.5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded accent-[#C8A45C] cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th className="p-3.5 font-semibold">المعرف الخارجي</th>
                  <th className="p-3.5 font-semibold">اسم المنتج</th>
                  <th className="p-3.5 font-semibold">السعر (USD)</th>
                  <th className="p-3.5 font-semibold text-center">الحالة</th>
                  <th className="p-3.5 font-semibold text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {loadingProducts ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-zinc-400 font-bold">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw size={36} className="animate-spin text-[#C8A45C]" />
                        <span>جاري جلب المنتجات من المزود الخارجي...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-zinc-500 font-bold">
                      <AlertTriangle size={36} className="mx-auto mb-2 opacity-40 text-[#C8A45C]" />
                      لا توجد منتجات مطابقة أو لم يتم اختيار مزود نشط.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p, idx) => {
                    const idKey = p.id || p.externalServiceId;
                    const isSelected = !!selectedIds[idKey];
                    return (
                      <tr
                        key={idKey || idx}
                        className={`hover:bg-zinc-800/40 transition ${isSelected ? "bg-[#C8A45C]/10" : ""}`}
                      >
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(idKey)}
                            className="rounded accent-[#C8A45C] cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td className="p-3.5 font-mono text-[#C8A45C] font-bold">
                          #{p.externalServiceId || p.id}
                        </td>
                        <td className="p-3.5 font-bold text-white">{p.name}</td>
                        <td className="p-3.5 font-mono font-black text-emerald-400">
                          ${Number(p.price || p.priceUsd || 0).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={12} /> متاح
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleImportSingle(p)}
                            className="px-3 py-1.5 rounded-xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] font-bold text-[11px] transition shadow-sm cursor-pointer flex items-center gap-1 mx-auto"
                          >
                            <Download size={12} /> استيراد
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#2D2D2D] p-4 border-t border-[#C8A45C]/30 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            يمكنك استيراد المنتجات المحددة دفعة واحدة أو الاستيراد الفردي لكل منتج
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-xs font-bold transition cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
