import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package, Server, Search, Filter, Download, RefreshCw,
  Eye, CheckCircle2, AlertTriangle, Layers, DollarSign, Sparkles, X,
  Copy, Check, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, FileSpreadsheet, FileText, Edit3, Tag, Info,
  Sliders, ExternalLink, Plus, ArrowUpDown, ShieldCheck, CheckSquare, Square
} from "lucide-react";
import { get, post } from "../lib/api";

interface ProviderProductItem {
  id: number | string;
  name: string;
  price: number | string;
  basePrice?: number | string;
  providerUnitPrice?: number | string;
  category?: string;
  categoryName?: string;
  categoryImage?: string;
  image?: string;
  available: boolean;
  externalServiceId: string;
  minQty?: number;
  maxQty?: number | null;
  quantityType?: "fixed" | "range" | "list";
  quantityValues?: any[] | null;
  productType?: "amount" | "package";
  params?: string[];
  description?: string;
  providerId?: number;
  providerName?: string;
  providerType?: string;
  isImported?: boolean;
  localProduct?: any;
  rawData?: any;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

export default function ApiProductsNew() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  
  // Data
  const [remoteProducts, setRemoteProducts] = useState<ProviderProductItem[]>([]);
  const [fetchingRemote, setFetchingRemote] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [importStatusFilter, setImportStatusFilter] = useState("all");
  const [productTypeFilter, setProductTypeFilter] = useState("all");
  const [quantityTypeFilter, setQuantityTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // UI state
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detailProduct, setDetailProduct] = useState<ProviderProductItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);
  const [importingBatch, setImportingBatch] = useState(false);
  const [batchMarkupPercent, setBatchMarkupPercent] = useState("15");
  const [batchTargetCategoryId, setBatchTargetCategoryId] = useState("");

  // Column Visibility Config
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: "select", label: "تحديد", visible: true },
    { key: "id", label: "المعرف (ID)", visible: true },
    { key: "image", label: "الصورة", visible: true },
    { key: "name", label: "اسم المنتج", visible: true },
    { key: "category", label: "الفئة / التصنيف", visible: true },
    { key: "costPrice", label: "سعر التكلفة (USD)", visible: true },
    { key: "basePrice", label: "السعر الأساسي", visible: false },
    { key: "suggestedPrice", label: "سعر البيع المقترح", visible: true },
    { key: "status", label: "الحالة", visible: true },
    { key: "quantityType", label: "نوع الكمية", visible: true },
    { key: "limits", label: "الحدود (أدنى/أقصى)", visible: true },
    { key: "quantityValues", label: "قيم الكميات", visible: false },
    { key: "params", label: "المعلمات المطلوبة", visible: true },
    { key: "productType", label: "نوع المنتج", visible: false },
    { key: "importStatus", label: "حالة الاستيراد", visible: true },
    { key: "actions", label: "الإجراءات", visible: true },
  ]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`تم نسخ "${text}" إلى الحافظة`, "info");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Initial Load of Providers and Categories
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, catRes, groupRes] = await Promise.all([
        get("/admin/providers").catch(() => []),
        get("/admin/categories").catch(() => []),
        get("/admin/product-groups").catch(() => []),
      ]);

      if (Array.isArray(provRes)) {
        setProviders(provRes);
        if (provRes.length > 0 && !selectedProvider) {
          setSelectedProvider(String(provRes[0].id));
        }
      }
      if (Array.isArray(catRes)) setCategories(catRes);
      if (Array.isArray(groupRes)) setProductGroups(groupRes);
    } catch {
      showToast("فشل تحميل المزودين والبيانات الأساسية", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedProvider]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Fetch Products From Selected Provider
  const fetchProviderProducts = useCallback(async (provId: string) => {
    if (!provId) return;
    setFetchingRemote(true);
    setSelectedIds(new Set());
    try {
      const res = await get(`/admin/provider-products/${provId}`);
      if (Array.isArray(res)) {
        setRemoteProducts(res);
        showToast(`تم جلب ${res.length} منتج بنجاح من المزود`, "success");
      } else {
        setRemoteProducts([]);
      }
    } catch (err: any) {
      showToast(err?.message || "فشل جلب المنتجات من مزود API", "error");
      setRemoteProducts([]);
    } finally {
      setFetchingRemote(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      fetchProviderProducts(selectedProvider);
    }
  }, [selectedProvider, fetchProviderProducts]);

  // Unique Categories from Remote Data
  const remoteCategories = useMemo(() => {
    const set = new Set<string>();
    remoteProducts.forEach((p) => {
      if (p.category) set.add(p.category);
      else if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [remoteProducts]);

  // Filter and Sort Logic
  const filteredProducts = useMemo(() => {
    return remoteProducts
      .filter((p) => {
        const pName = (p.name || "").toLowerCase();
        const pId = String(p.id || "");
        const pExtId = String(p.externalServiceId || "");
        const pCat = (p.category || p.categoryName || "").toLowerCase();
        const s = search.toLowerCase().trim();

        const matchesSearch = !s || pName.includes(s) || pId.includes(s) || pExtId.includes(s) || pCat.includes(s);
        const matchesCategory = selectedCategory === "all" || (p.category || p.categoryName) === selectedCategory;
        const matchesStatus = statusFilter === "all" || (statusFilter === "available" ? p.available !== false : p.available === false);
        const matchesImportStatus = importStatusFilter === "all" || (importStatusFilter === "imported" ? p.isImported : !p.isImported);
        const matchesProductType = productTypeFilter === "all" || (p.productType || "amount") === productTypeFilter;
        const matchesQuantityType = quantityTypeFilter === "all" || (p.quantityType || "fixed") === quantityTypeFilter;

        return matchesSearch && matchesCategory && matchesStatus && matchesImportStatus && matchesProductType && matchesQuantityType;
      })
      .sort((a, b) => {
        const priceA = Number(a.providerUnitPrice ?? a.price ?? 0);
        const priceB = Number(b.providerUnitPrice ?? b.price ?? 0);
        const nameA = a.name || "";
        const nameB = b.name || "";
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;

        switch (sortBy) {
          case "name-asc":
            return nameA.localeCompare(nameB);
          case "name-desc":
            return nameB.localeCompare(nameA);
          case "price-asc":
            return priceA - priceB;
          case "price-desc":
            return priceB - priceA;
          case "id-asc":
            return idA - idB;
          case "id-desc":
            return idB - idA;
          default:
            return 0;
        }
      });
  }, [remoteProducts, search, selectedCategory, statusFilter, importStatusFilter, productTypeFilter, quantityTypeFilter, sortBy]);

  // Paginated Slices
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Selection handlers
  const handleSelectAllInPage = () => {
    const newSet = new Set(selectedIds);
    const allInPageSelected = paginatedProducts.every((p) => newSet.has(String(p.id)));
    if (allInPageSelected) {
      paginatedProducts.forEach((p) => newSet.delete(String(p.id)));
    } else {
      paginatedProducts.forEach((p) => newSet.add(String(p.id)));
    }
    setSelectedIds(newSet);
  };

  const handleSelectAllInFilter = () => {
    const newSet = new Set(selectedIds);
    const allFilteredSelected = filteredProducts.every((p) => newSet.has(String(p.id)));
    if (allFilteredSelected) {
      filteredProducts.forEach((p) => newSet.delete(String(p.id)));
    } else {
      filteredProducts.forEach((p) => newSet.add(String(p.id)));
    }
    setSelectedIds(newSet);
  };

  const handleToggleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setStatusFilter("all");
    setImportStatusFilter("all");
    setProductTypeFilter("all");
    setQuantityTypeFilter("all");
    setSortBy("name-asc");
    setSelectedIds(new Set());
    setPage(1);
    showToast("تم إعادة ضبط الفلاتر والبحث", "info");
  };

  // Single Quick Import
  const handleQuickImport = async (item: ProviderProductItem) => {
    try {
      const cost = Number(item.providerUnitPrice ?? item.basePrice ?? item.price ?? 0);
      const suggestedFinal = (cost * 1.15).toFixed(4);
      const profit = (cost * 0.15).toFixed(4);

      await post("/admin/provider-products/import", {
        providerId: Number(selectedProvider),
        name: item.name,
        price: suggestedFinal,
        priceUsd: suggestedFinal,
        finalUnitPrice: suggestedFinal,
        providerUnitPrice: cost.toFixed(4),
        basePriceUsd: cost.toFixed(4),
        storeProfitPerUnit: profit,
        externalServiceId: item.externalServiceId || item.id,
        category: item.category || item.categoryName || "عام",
        categoryImage: item.categoryImage || item.image || "",
        minQty: item.minQty ?? 1,
        maxQty: item.maxQty ?? null,
        quantityType: item.quantityType || "fixed",
        quantityValues: item.quantityValues || null,
        productType: item.productType || "amount",
        description: item.description || (item.params ? item.params.join(", ") : ""),
        available: item.available !== false,
      });

      showToast(`تم استيراد المنتج "${item.name}" بنجاح!`, "success");
      // Update local state to show imported badge
      setRemoteProducts((prev) =>
        prev.map((p) => (String(p.id) === String(item.id) ? { ...p, isImported: true } : p))
      );
    } catch (err: any) {
      showToast(err?.message || "فشل استيراد المنتج", "error");
    }
  };

  // Open Edit Modal Before Import
  const handleOpenEditModal = (item: ProviderProductItem) => {
    const cost = Number(item.providerUnitPrice ?? item.basePrice ?? item.price ?? 0);
    const suggestedFinal = Number((cost * 1.15).toFixed(4));
    const profit = Number((suggestedFinal - cost).toFixed(4));

    // Match category
    let catId = "";
    const matchedCat = categories.find(
      (c) => c.name.trim().toLowerCase() === (item.category || item.categoryName || "").trim().toLowerCase()
    );
    if (matchedCat) catId = String(matchedCat.id);

    setEditingProduct({
      id: item.id,
      name: item.name,
      providerId: Number(selectedProvider),
      externalServiceId: item.externalServiceId || item.id,
      categoryId: catId,
      newCategoryName: !catId ? (item.category || item.categoryName || "") : "",
      groupId: "",
      providerUnitPrice: cost,
      finalUnitPrice: suggestedFinal,
      storeProfitPerUnit: profit,
      minQty: item.minQty ?? 1,
      maxQty: item.maxQty ?? "",
      quantityType: item.quantityType || "fixed",
      quantityValues: item.quantityValues ? JSON.stringify(item.quantityValues) : "",
      productType: item.productType || "amount",
      params: item.params || [],
      description: item.description || (item.params ? item.params.join(", ") : ""),
      image: item.image || item.categoryImage || "",
      available: item.available !== false,
    });
  };

  // Save Product from Edit Modal
  const handleSaveEditedProduct = async () => {
    if (!editingProduct) return;
    try {
      let parsedQtyValues = null;
      if (editingProduct.quantityValues && editingProduct.quantityType === "list") {
        try {
          parsedQtyValues = JSON.parse(editingProduct.quantityValues);
        } catch {
          parsedQtyValues = editingProduct.quantityValues.split(",").map((v: string) => v.trim());
        }
      }

      await post("/admin/provider-products/import", {
        providerId: editingProduct.providerId,
        name: editingProduct.name,
        categoryId: editingProduct.categoryId ? Number(editingProduct.categoryId) : undefined,
        category: !editingProduct.categoryId ? editingProduct.newCategoryName : undefined,
        groupId: editingProduct.groupId ? Number(editingProduct.groupId) : null,
        price: editingProduct.finalUnitPrice,
        priceUsd: editingProduct.finalUnitPrice,
        finalUnitPrice: editingProduct.finalUnitPrice,
        providerUnitPrice: editingProduct.providerUnitPrice,
        basePriceUsd: editingProduct.providerUnitPrice,
        storeProfitPerUnit: editingProduct.storeProfitPerUnit,
        externalServiceId: editingProduct.externalServiceId,
        image: editingProduct.image,
        minQty: Number(editingProduct.minQty || 1),
        maxQty: editingProduct.maxQty ? Number(editingProduct.maxQty) : null,
        quantityType: editingProduct.quantityType,
        quantityValues: parsedQtyValues,
        productType: editingProduct.productType,
        description: editingProduct.description,
        available: editingProduct.available,
      });

      showToast(`تم حفظ واستيراد المنتج "${editingProduct.name}" بنجاح!`, "success");
      setRemoteProducts((prev) =>
        prev.map((p) => (String(p.id) === String(editingProduct.id) ? { ...p, isImported: true } : p))
      );
      setEditingProduct(null);
    } catch (err: any) {
      showToast(err?.message || "فشل استيراد المنتج المخصص", "error");
    }
  };

  // Batch Import Handler
  const handleExecuteBatchImport = async () => {
    const selectedList = remoteProducts.filter((p) => selectedIds.has(String(p.id)));
    if (selectedList.length === 0) {
      showToast("لم يتم تحديد أي منتجات للاستيراد", "error");
      return;
    }

    setImportingBatch(true);
    try {
      const markupFactor = 1 + (Number(batchMarkupPercent) || 0) / 100;
      const formattedItems = selectedList.map((item) => {
        const cost = Number(item.providerUnitPrice ?? item.basePrice ?? item.price ?? 0);
        const finalPrice = (cost * markupFactor).toFixed(4);
        const profit = (cost * ((Number(batchMarkupPercent) || 0) / 100)).toFixed(4);

        return {
          providerId: Number(selectedProvider),
          name: item.name,
          priceUsd: finalPrice,
          finalUnitPrice: finalPrice,
          providerUnitPrice: cost.toFixed(4),
          basePriceUsd: cost.toFixed(4),
          storeProfitPerUnit: profit,
          externalServiceId: item.externalServiceId || item.id,
          categoryId: batchTargetCategoryId ? Number(batchTargetCategoryId) : undefined,
          category: !batchTargetCategoryId ? (item.category || item.categoryName || "عام") : undefined,
          categoryImage: item.categoryImage || item.image || "",
          minQty: item.minQty ?? 1,
          maxQty: item.maxQty ?? null,
          quantityType: item.quantityType || "fixed",
          quantityValues: item.quantityValues || null,
          productType: item.productType || "amount",
          description: item.description || (item.params ? item.params.join(", ") : ""),
          available: item.available !== false,
        };
      });

      const res: any = await post("/admin/provider-products/import", {
        providerId: Number(selectedProvider),
        products: formattedItems,
      });

      showToast(`تم استيراد ${res.count || selectedList.length} منتج بنجاح إلى قاعدة البيانات المحلية!`, "success");
      
      // Update local state
      const importedIdSet = new Set(selectedList.map((p) => String(p.id)));
      setRemoteProducts((prev) =>
        prev.map((p) => (importedIdSet.has(String(p.id)) ? { ...p, isImported: true } : p))
      );
      setSelectedIds(new Set());
      setShowBatchImportModal(false);
    } catch (err: any) {
      showToast(err?.message || "فشل الاستيراد الجماعي", "error");
    } finally {
      setImportingBatch(false);
    }
  };

  // Export to CSV or JSON
  const handleExport = (format: "csv" | "json") => {
    const listToExport = selectedIds.size > 0 
      ? remoteProducts.filter((p) => selectedIds.has(String(p.id)))
      : filteredProducts;

    if (listToExport.length === 0) {
      showToast("لا توجد بيانات لتصديرها", "error");
      return;
    }

    if (format === "json") {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(listToExport, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `provider_products_${selectedProvider}_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`تم تصدير ${listToExport.length} منتج بصيغة JSON`, "success");
    } else {
      const headers = ["ID", "Name", "CostPrice", "BasePrice", "Category", "QuantityType", "MinQty", "MaxQty", "ProductType", "Available", "IsImported", "ExternalServiceId"];
      const rows = listToExport.map((p) => [
        p.id,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        p.providerUnitPrice ?? p.price ?? 0,
        p.basePrice ?? p.price ?? 0,
        `"${(p.category || p.categoryName || "").replace(/"/g, '""')}"`,
        p.quantityType || "fixed",
        p.minQty ?? 1,
        p.maxQty ?? "",
        p.productType || "amount",
        p.available ? "true" : "false",
        p.isImported ? "true" : "false",
        p.externalServiceId || p.id,
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `provider_products_${selectedProvider}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast(`تم تصدير ${listToExport.length} منتج بصيغة CSV`, "success");
    }
  };

  // Toggle Column Visibility
  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col))
    );
  };

  const isColVisible = (key: string) => {
    const col = columns.find((c) => c.key === key);
    return col ? col.visible : true;
  };

  // KPIs
  const currentProviderObj = providers.find((p) => String(p.id) === selectedProvider);
  const importedCount = useMemo(() => remoteProducts.filter((p) => p.isImported).length, [remoteProducts]);
  const availableCount = useMemo(() => remoteProducts.filter((p) => p.available !== false).length, [remoteProducts]);
  const avgCostPrice = useMemo(() => {
    if (remoteProducts.length === 0) return "0.00";
    const sum = remoteProducts.reduce((acc, p) => acc + Number(p.providerUnitPrice ?? p.basePrice ?? p.price ?? 0), 0);
    return (sum / remoteProducts.length).toFixed(3);
  }, [remoteProducts]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16" dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 border transition-all animate-bounce text-sm ${
            toast.type === "error"
              ? "bg-rose-950 text-rose-200 border-rose-500/50"
              : toast.type === "info"
              ? "bg-blue-950 text-blue-200 border-blue-500/50"
              : "bg-[#C8A45C] text-[#1A1A1A] border-white/30"
          }`}
        >
          <Sparkles size={18} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Provider Selection Card */}
      <div className="bg-[#1A1A1A] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8A45C]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C8A45C]/30 to-[#C8A45C]/5 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A] shadow-xl">
              <Server size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  استيراد المنتجات من مزود API
                </h1>
                <span className="text-xs px-3 py-1 rounded-full bg-[#C8A45C]/20 text-[#FDE68A] border border-[#C8A45C]/40 font-bold">
                  جدول متقدم
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                استعراض كامل لكافة تفاصيل المنتجات المسترجعة من API المزود مع إمكانية التعديل قبل الاستيراد، الاستيراد الجماعي، التصدير، وتخصيص هوامش الأرباح بدقة.
              </p>
            </div>
          </div>

          {/* Provider Selector and Main Trigger */}
          <div className="flex flex-wrap items-center gap-3 bg-[#242424] p-3 rounded-2xl border border-zinc-800 shadow-inner">
            <div className="relative min-w-[220px]">
              <label className="block text-[10px] text-zinc-400 font-bold mb-1 mr-1">اختر مزود الخدمة (API)</label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                disabled={fetchingRemote || loading}
                className="w-full bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-[#C8A45C] transition shadow-sm cursor-pointer"
              >
                {providers.map((prov) => (
                  <option key={prov.id} value={String(prov.id)}>
                    {prov.name} ({prov.providerType || "API"}) {prov.active ? "• نشط" : "• معطل"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2 pt-4 sm:pt-0">
              <button
                onClick={() => fetchProviderProducts(selectedProvider)}
                disabled={fetchingRemote || !selectedProvider}
                className="h-[38px] px-4 rounded-xl bg-[#2D2D2D] hover:bg-[#383838] border border-[#C8A45C]/30 text-[#FDE68A] text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                title="جلب أحدث قائمة من المزود"
              >
                <RefreshCw size={15} className={fetchingRemote ? "animate-spin text-[#C8A45C]" : "text-[#C8A45C]"} />
                <span>{fetchingRemote ? "جاري الجلب..." : "جلب المنتجات"}</span>
              </button>

              <button
                onClick={() => setShowBatchImportModal(true)}
                disabled={selectedIds.size === 0 || fetchingRemote}
                className="h-[38px] px-4 rounded-xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] text-xs font-black transition flex items-center gap-2 shadow-lg shadow-[#C8A45C]/20 disabled:opacity-40 cursor-pointer"
              >
                <Download size={15} />
                <span>استيراد المحدد ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-[#2D2D2D] rounded-2xl border border-[#C8A45C]/20 p-4 shadow-lg flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-bold">إجمالي المنتجات</span>
          <div className="text-2xl font-black text-white font-mono mt-1">{remoteProducts.length}</div>
          <span className="text-[10px] text-zinc-500 mt-1">مسترجعة من API المزود</span>
        </div>

        <div className="bg-[#2D2D2D] rounded-2xl border border-emerald-500/20 p-4 shadow-lg flex flex-col justify-between">
          <span className="text-[11px] text-emerald-400 font-bold">المنتجات المتاحة</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{availableCount}</div>
          <span className="text-[10px] text-zinc-500 mt-1">جاهزة للطلب فوراً</span>
        </div>

        <div className="bg-[#2D2D2D] rounded-2xl border border-blue-500/20 p-4 shadow-lg flex flex-col justify-between">
          <span className="text-[11px] text-blue-400 font-bold">مستوردة محلياً</span>
          <div className="text-2xl font-black text-blue-400 font-mono mt-1">{importedCount}</div>
          <span className="text-[10px] text-zinc-500 mt-1">مسجلة في قاعدة البيانات</span>
        </div>

        <div className="bg-[#2D2D2D] rounded-2xl border border-amber-500/20 p-4 shadow-lg flex flex-col justify-between">
          <span className="text-[11px] text-amber-400 font-bold">غير مستوردة (جديدة)</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">{remoteProducts.length - importedCount}</div>
          <span className="text-[10px] text-zinc-500 mt-1">يمكن استيرادها بنقرة</span>
        </div>

        <div className="bg-[#2D2D2D] rounded-2xl border border-[#C8A45C]/20 p-4 shadow-lg flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-bold">متوسط سعر التكلفة</span>
          <div className="text-2xl font-black text-[#FDE68A] font-mono mt-1">${avgCostPrice}</div>
          <span className="text-[10px] text-zinc-500 mt-1">لكل وحدة بالدولار</span>
        </div>

        <div className="bg-[#2D2D2D] rounded-2xl border border-purple-500/20 p-4 shadow-lg flex flex-col justify-between">
          <span className="text-[11px] text-purple-400 font-bold">المحدد حالياً</span>
          <div className="text-2xl font-black text-purple-300 font-mono mt-1">{selectedIds.size}</div>
          <span className="text-[10px] text-zinc-500 mt-1">جاهز للإجراءات المجمعة</span>
        </div>
      </div>

      {/* Main Control Toolbar */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/20 p-4 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="بحث باسم المنتج، المعرف (ID)، المعرف الخارجي، أو الفئة..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8A45C] placeholder:text-zinc-500 font-bold shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Select All in filtered */}
            <button
              onClick={handleSelectAllInFilter}
              className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#242424] border border-zinc-700 text-zinc-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(String(p.id))) ? (
                <>
                  <CheckSquare size={14} className="text-[#C8A45C]" />
                  <span>إلغاء تحديد الكل ({filteredProducts.length})</span>
                </>
              ) : (
                <>
                  <Square size={14} className="text-[#C8A45C]" />
                  <span>تحديد كل المطابق ({filteredProducts.length})</span>
                </>
              )}
            </button>

            {/* Columns Visibility */}
            <button
              onClick={() => setShowColumnsModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#242424] border border-zinc-700 text-zinc-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="تخصيص الأعمدة الظاهرة"
            >
              <Sliders size={14} className="text-[#C8A45C]" />
              <span>الأعمدة</span>
            </button>

            {/* Export Dropdown */}
            <div className="flex items-center rounded-xl bg-[#1A1A1A] border border-zinc-700 overflow-hidden">
              <button
                onClick={() => handleExport("csv")}
                className="px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-[#242424] hover:text-[#FDE68A] transition flex items-center gap-1 border-l border-zinc-800 cursor-pointer"
                title="تصدير إلى ملف CSV"
              >
                <FileSpreadsheet size={14} className="text-emerald-400" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => handleExport("json")}
                className="px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-[#242424] hover:text-[#FDE68A] transition flex items-center gap-1 cursor-pointer"
                title="تصدير إلى ملف JSON"
              >
                <FileText size={14} className="text-amber-400" />
                <span>JSON</span>
              </button>
            </div>

            {/* Reset */}
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#242424] border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="إعادة تعيين الفلاتر"
            >
              <RefreshCw size={13} />
              <span>إعادة تعيين</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 border-t border-zinc-800/80">
          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-bold focus:outline-none focus:border-[#C8A45C]"
            >
              <option value="all">كل الفئات ({remoteCategories.length})</option>
              {remoteCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-bold focus:outline-none focus:border-[#C8A45C]"
            >
              <option value="all">كل الحالات (متاح/غير متاح)</option>
              <option value="available">متاح فقط</option>
              <option value="unavailable">غير متاح فقط</option>
            </select>
          </div>

          {/* Import Status Filter */}
          <div>
            <select
              value={importStatusFilter}
              onChange={(e) => {
                setImportStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-bold focus:outline-none focus:border-[#C8A45C]"
            >
              <option value="all">كل حالات الاستيراد</option>
              <option value="not_imported">غير مستورد محلياً (جديد)</option>
              <option value="imported">مستورد محلياً</option>
            </select>
          </div>

          {/* Quantity Type Filter */}
          <div>
            <select
              value={quantityTypeFilter}
              onChange={(e) => {
                setQuantityTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-bold focus:outline-none focus:border-[#C8A45C]"
            >
              <option value="all">كل أنواع الكمية</option>
              <option value="fixed">Fixed (ثابت)</option>
              <option value="range">Range (نطاق)</option>
              <option value="list">List (قائمة مخصصة)</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 font-bold focus:outline-none focus:border-[#C8A45C]"
            >
              <option value="name-asc">الاسم (أ - ي)</option>
              <option value="name-desc">الاسم (ي - أ)</option>
              <option value="price-asc">سعر التكلفة: الأقل أولاً</option>
              <option value="price-desc">سعر التكلفة: الأعلى أولاً</option>
              <option value="id-asc">المعرف: تصاعدي</option>
              <option value="id-desc">المعرف: تنازلي</option>
            </select>
          </div>

          {/* Page Size */}
          <div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="w-full bg-[#1A1A1A] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-[#FDE68A] font-bold focus:outline-none focus:border-[#C8A45C]"
            >
              <option value={10}>عرض 10 منتجات</option>
              <option value={25}>عرض 25 منتج</option>
              <option value={50}>عرض 50 منتج</option>
              <option value={100}>عرض 100 منتج</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Products Table */}
      <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-3xl shadow-2xl overflow-hidden">
        {/* Table Subheader */}
        <div className="p-4 sm:p-5 bg-[#1A1A1A] border-b border-[#C8A45C]/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-[#C8A45C]" />
            <h2 className="text-sm sm:text-base font-black text-white">
              جدول منتجات المزود: <span className="text-[#FDE68A]">{currentProviderObj?.name || selectedProvider}</span>
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-zinc-400">
              المعروض: <b className="text-white font-mono">{filteredProducts.length}</b> من أصل <b className="text-zinc-300 font-mono">{remoteProducts.length}</b>
            </span>
            {selectedIds.size > 0 && (
              <span className="px-2.5 py-1 bg-purple-950/80 text-purple-300 border border-purple-500/40 rounded-full font-bold">
                تم تحديد {selectedIds.size} عنصر
              </span>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#1A1A1A] text-[#C8A45C] font-bold border-b border-zinc-800 uppercase tracking-wider select-none">
              <tr>
                {isColVisible("select") && (
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedProducts.length > 0 && paginatedProducts.every((p) => selectedIds.has(String(p.id)))}
                      onChange={handleSelectAllInPage}
                      className="rounded accent-[#C8A45C] w-4 h-4 cursor-pointer"
                      title="تحديد كل منتجات الصفحة الحالية"
                    />
                  </th>
                )}
                {isColVisible("id") && <th className="p-4 whitespace-nowrap">المعرف (ID)</th>}
                {isColVisible("image") && <th className="p-4 text-center whitespace-nowrap">الصورة</th>}
                {isColVisible("name") && <th className="p-4 min-w-[200px]">اسم المنتج</th>}
                {isColVisible("category") && <th className="p-4 whitespace-nowrap">الفئة / التصنيف</th>}
                {isColVisible("costPrice") && <th className="p-4 whitespace-nowrap">سعر التكلفة ($)</th>}
                {isColVisible("basePrice") && <th className="p-4 whitespace-nowrap">السعر الأساسي</th>}
                {isColVisible("suggestedPrice") && <th className="p-4 whitespace-nowrap">سعر البيع المقترح (+15%)</th>}
                {isColVisible("status") && <th className="p-4 whitespace-nowrap">الحالة</th>}
                {isColVisible("quantityType") && <th className="p-4 whitespace-nowrap">نوع الكمية</th>}
                {isColVisible("limits") && <th className="p-4 whitespace-nowrap">الحدود</th>}
                {isColVisible("quantityValues") && <th className="p-4 min-w-[150px]">قيم الكميات</th>}
                {isColVisible("params") && <th className="p-4 min-w-[150px]">المعلمات المطلوبة</th>}
                {isColVisible("productType") && <th className="p-4 whitespace-nowrap">نوع المنتج</th>}
                {isColVisible("importStatus") && <th className="p-4 whitespace-nowrap">المتجر المحلي</th>}
                {isColVisible("actions") && <th className="p-4 text-center min-w-[160px]">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading || fetchingRemote ? (
                <tr>
                  <td colSpan={16} className="text-center py-20 text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw size={36} className="animate-spin text-[#C8A45C]" />
                      <span className="text-sm font-bold text-zinc-300">جاري الاتصال بـ API المزود واسترجاع المنتجات...</span>
                      <span className="text-xs text-zinc-500">يرجى الانتظار بضع ثوانٍ</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={16} className="text-center py-20 text-zinc-500">
                    <AlertTriangle size={36} className="mx-auto mb-2 opacity-40 text-[#C8A45C]" />
                    <div className="text-sm font-bold text-zinc-300">لا توجد منتجات مطابقة لخيارات البحث أو لم يتم الجلب بعد</div>
                    <div className="text-xs text-zinc-500 mt-1">تأكد من اختيار المزود والضغط على زر "جلب المنتجات"</div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p, idx) => {
                  const isSelected = selectedIds.has(String(p.id));
                  const cost = Number(p.providerUnitPrice ?? p.basePrice ?? p.price ?? 0);
                  const suggested = (cost * 1.15).toFixed(4);
                  const isEven = idx % 2 === 0;

                  return (
                    <tr
                      key={p.id || idx}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-[#C8A45C]/15 hover:bg-[#C8A45C]/20"
                          : isEven
                          ? "bg-[#242424] hover:bg-[#2A2A2A]"
                          : "bg-[#2D2D2D] hover:bg-[#333333]"
                      }`}
                    >
                      {/* Checkbox */}
                      {isColVisible("select") && (
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(String(p.id))}
                            className="rounded accent-[#C8A45C] w-4 h-4 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* ID */}
                      {isColVisible("id") && (
                        <td className="p-4 font-mono font-bold text-[#FDE68A] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>#{p.id}</span>
                            <button
                              onClick={() => copyToClipboard(String(p.id), `id-${p.id}`)}
                              className="text-zinc-500 hover:text-zinc-300 transition"
                              title="نسخ المعرف"
                            >
                              {copiedId === `id-${p.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            </button>
                          </div>
                          {p.externalServiceId && p.externalServiceId !== String(p.id) && (
                            <div className="text-[10px] text-zinc-500 font-mono">Ext: {p.externalServiceId}</div>
                          )}
                        </td>
                      )}

                      {/* Image */}
                      {isColVisible("image") && (
                        <td className="p-4 text-center">
                          {p.categoryImage || p.image ? (
                            <img
                              src={p.categoryImage || p.image}
                              alt={p.name}
                              className="w-9 h-9 rounded-xl object-cover border border-zinc-700 mx-auto shadow-sm"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 mx-auto">
                              <Package size={16} />
                            </div>
                          )}
                        </td>
                      )}

                      {/* Name */}
                      {isColVisible("name") && (
                        <td className="p-4 font-bold text-white leading-snug">
                          <div className="flex flex-col">
                            <span className="text-xs sm:text-sm">{p.name}</span>
                            {p.description && (
                              <span className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">{p.description}</span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Category */}
                      {isColVisible("category") && (
                        <td className="p-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] font-bold">
                            <Tag size={10} className="text-[#C8A45C]" />
                            {p.category || p.categoryName || "عام"}
                          </span>
                        </td>
                      )}

                      {/* Cost Price */}
                      {isColVisible("costPrice") && (
                        <td className="p-4 font-mono font-bold text-zinc-200 whitespace-nowrap">
                          ${cost.toFixed(4)}
                        </td>
                      )}

                      {/* Base Price */}
                      {isColVisible("basePrice") && (
                        <td className="p-4 font-mono text-zinc-400 whitespace-nowrap">
                          ${Number(p.basePrice ?? p.price ?? 0).toFixed(4)}
                        </td>
                      )}

                      {/* Suggested Selling Price */}
                      {isColVisible("suggestedPrice") && (
                        <td className="p-4 font-mono font-bold text-[#FDE68A] whitespace-nowrap">
                          ${suggested}
                        </td>
                      )}

                      {/* Status */}
                      {isColVisible("status") && (
                        <td className="p-4 whitespace-nowrap">
                          {p.available !== false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              متاح
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                              غير متاح
                            </span>
                          )}
                        </td>
                      )}

                      {/* Quantity Type */}
                      {isColVisible("quantityType") && (
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-mono uppercase">
                            {p.quantityType || "fixed"}
                          </span>
                        </td>
                      )}

                      {/* Limits */}
                      {isColVisible("limits") && (
                        <td className="p-4 font-mono text-[11px] text-zinc-300 whitespace-nowrap">
                          {p.minQty ?? 1} - {p.maxQty ? p.maxQty : "∞"}
                        </td>
                      )}

                      {/* Quantity Values */}
                      {isColVisible("quantityValues") && (
                        <td className="p-4">
                          {p.quantityValues && Array.isArray(p.quantityValues) && p.quantityValues.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {p.quantityValues.slice(0, 3).map((qv: any, i: number) => (
                                <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-mono">
                                  {qv}
                                </span>
                              ))}
                              {p.quantityValues.length > 3 && (
                                <span className="text-[10px] text-zinc-500">+{p.quantityValues.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      )}

                      {/* Parameters */}
                      {isColVisible("params") && (
                        <td className="p-4">
                          {p.params && p.params.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {p.params.map((pm: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px]">
                                  {pm}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">الافتراضي (Player ID)</span>
                          )}
                        </td>
                      )}

                      {/* Product Type */}
                      {isColVisible("productType") && (
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px]">
                            {p.productType || "amount"}
                          </span>
                        </td>
                      )}

                      {/* Import Status */}
                      {isColVisible("importStatus") && (
                        <td className="p-4 whitespace-nowrap">
                          {p.isImported ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/70 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                              <CheckCircle2 size={11} className="text-blue-400" />
                              مستورد محلياً
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-400 border border-zinc-700 text-[10px]">
                              جديد
                            </span>
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      {isColVisible("actions") && (
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Details Button */}
                            <button
                              onClick={() => setDetailProduct(p)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition cursor-pointer"
                              title="عرض التفاصيل الكاملة"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Edit Before Import Button */}
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[#FDE68A] border border-zinc-700 transition cursor-pointer"
                              title="تخصيص وتعديل قبل الاستيراد"
                            >
                              <Edit3 size={14} />
                            </button>

                            {/* Quick Import Button */}
                            <button
                              onClick={() => handleQuickImport(p)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] font-bold transition text-xs flex items-center gap-1 shadow cursor-pointer"
                              title="استيراد سريع"
                            >
                              <Download size={13} />
                              <span>استيراد</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="p-4 bg-[#1A1A1A] border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-400">
            عرض صفحة <span className="text-[#FDE68A] font-bold">{currentPage}</span> من إجمالي <span className="text-white font-bold">{totalPages}</span> صفحات ({filteredProducts.length} منتج)
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 transition cursor-pointer"
              title="الصفحة الأولى"
            >
              <ChevronsRight size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 transition cursor-pointer"
              title="الصفحة السابقة"
            >
              <ChevronRight size={16} />
            </button>

            {/* Quick Page Jump Buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pNum = i + 1;
              if (totalPages > 5) {
                if (currentPage <= 3) pNum = i + 1;
                else if (currentPage >= totalPages - 2) pNum = totalPages - 4 + i;
                else pNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                    currentPage === pNum
                      ? "bg-[#C8A45C] text-[#1A1A1A]"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 transition cursor-pointer"
              title="الصفحة التالية"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-30 transition cursor-pointer"
              title="الصفحة الأخيرة"
            >
              <ChevronsLeft size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 1. PRODUCT DETAILS MODAL (FULL DRAWER) */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setDetailProduct(null)}
              className="absolute left-5 top-5 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-4 border-b border-zinc-800 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A] shrink-0">
                {detailProduct.categoryImage || detailProduct.image ? (
                  <img src={detailProduct.categoryImage || detailProduct.image} alt="" className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  <Package size={28} />
                )}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{detailProduct.name}</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  معرف المزود: #{detailProduct.id} | المعرف الخارجي: #{detailProduct.externalServiceId}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#2D2D2D] p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-zinc-400 block mb-1">سعر التكلفة من المزود:</span>
                <span className="text-base font-black font-mono text-zinc-200">
                  ${Number(detailProduct.providerUnitPrice ?? detailProduct.price ?? 0).toFixed(4)}
                </span>
              </div>

              <div className="bg-[#2D2D2D] p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-zinc-400 block mb-1">السعر الأساسي:</span>
                <span className="text-base font-black font-mono text-[#FDE68A]">
                  ${Number(detailProduct.basePrice ?? detailProduct.price ?? 0).toFixed(4)}
                </span>
              </div>

              <div className="bg-[#2D2D2D] p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-zinc-400 block mb-1">الفئة / القسم:</span>
                <span className="font-bold text-white">{detailProduct.category || detailProduct.categoryName || "عام"}</span>
              </div>

              <div className="bg-[#2D2D2D] p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-zinc-400 block mb-1">الحالة:</span>
                <span className="font-bold text-emerald-400">{detailProduct.available !== false ? "متاح ومستقر" : "غير متاح حالياً"}</span>
              </div>

              <div className="bg-[#2D2D2D] p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-zinc-400 block mb-1">نوع الكمية:</span>
                <span className="font-mono font-bold text-white uppercase">{detailProduct.quantityType || "fixed"}</span>
              </div>

              <div className="bg-[#2D2D2D] p-3.5 rounded-2xl border border-zinc-800">
                <span className="text-zinc-400 block mb-1">الحدود:</span>
                <span className="font-mono font-bold text-white">
                  الحد الأدنى: {detailProduct.minQty ?? 1} | الحد الأقصى: {detailProduct.maxQty || "بلا حد"}
                </span>
              </div>
            </div>

            {/* Parameters & Quantity Values */}
            {detailProduct.params && detailProduct.params.length > 0 && (
              <div className="bg-[#2D2D2D] p-4 rounded-2xl border border-zinc-800">
                <span className="text-xs font-bold text-zinc-300 block mb-2">المعلمات المطلوبة للطلب:</span>
                <div className="flex flex-wrap gap-2">
                  {detailProduct.params.map((pm, i) => (
                    <span key={i} className="px-3 py-1 bg-zinc-800 text-xs text-[#FDE68A] rounded-xl border border-zinc-700 font-bold">
                      {pm}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detailProduct.quantityValues && Array.isArray(detailProduct.quantityValues) && (
              <div className="bg-[#2D2D2D] p-4 rounded-2xl border border-zinc-800">
                <span className="text-xs font-bold text-zinc-300 block mb-2">قيم الكميات المسموحة (قائمة):</span>
                <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {detailProduct.quantityValues.map((qv, i) => (
                    <span key={i} className="px-2.5 py-1 bg-zinc-800 text-white rounded-lg border border-zinc-700">
                      {qv}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON Data Viewer */}
            <div className="bg-[#141414] p-4 rounded-2xl border border-zinc-800 text-left">
              <span className="text-[11px] font-mono text-zinc-400 block mb-2" dir="ltr">Raw API Response Object:</span>
              <pre className="text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-36" dir="ltr">
                {JSON.stringify(detailProduct.rawData || detailProduct, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setDetailProduct(null)}
                className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  handleOpenEditModal(detailProduct);
                  setDetailProduct(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[#FDE68A] border border-zinc-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 size={14} />
                <span>تعديل وتخصيص</span>
              </button>
              <button
                onClick={() => {
                  handleQuickImport(detailProduct);
                  setDetailProduct(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] text-xs font-black transition flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Download size={14} />
                <span>استيراد للمتجر الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT BEFORE IMPORT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#C8A45C]/50 rounded-3xl max-w-3xl w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingProduct(null)}
              className="absolute left-5 top-5 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
                <Edit3 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">تعديل المنتج وتخصيصه قبل الاستيراد</h3>
                <p className="text-xs text-zinc-400">
                  يمكنك تعديل الاسم، السعر، هوامش الربح، الفئة، والكميات قبل إدراجه في متجرك
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Product Name */}
              <div className="sm:col-span-2">
                <label className="block text-zinc-300 font-bold mb-1">اسم المنتج في المتجر</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-[#2D2D2D] border border-zinc-700 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              {/* Cost Price */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">سعر التكلفة من المزود ($)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={editingProduct.providerUnitPrice}
                  onChange={(e) => {
                    const cost = Number(e.target.value);
                    const final = Number(editingProduct.finalUnitPrice);
                    setEditingProduct({
                      ...editingProduct,
                      providerUnitPrice: cost,
                      storeProfitPerUnit: Number((final - cost).toFixed(4)),
                    });
                  }}
                  className="w-full bg-[#2D2D2D] border border-zinc-700 rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">سعر البيع النهائي للعميل ($)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={editingProduct.finalUnitPrice}
                  onChange={(e) => {
                    const final = Number(e.target.value);
                    const cost = Number(editingProduct.providerUnitPrice);
                    setEditingProduct({
                      ...editingProduct,
                      finalUnitPrice: final,
                      storeProfitPerUnit: Number((final - cost).toFixed(4)),
                    });
                  }}
                  className="w-full bg-[#2D2D2D] border border-[#C8A45C]/50 rounded-xl px-4 py-2.5 text-[#FDE68A] font-mono font-black focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              {/* Calculated Profit Badge */}
              <div className="sm:col-span-2 bg-[#2D2D2D] p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 text-xs font-bold block">صافي الربح المتوقع للوحدة:</span>
                  <span className={`text-base font-black font-mono ${editingProduct.storeProfitPerUnit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {editingProduct.storeProfitPerUnit >= 0 ? `+$${editingProduct.storeProfitPerUnit}` : `-$${Math.abs(editingProduct.storeProfitPerUnit)}`}
                  </span>
                </div>
                <div className="text-xs text-zinc-400">
                  هامش الربح: <span className="font-bold text-[#FDE68A] font-mono">
                    {editingProduct.finalUnitPrice > 0 
                      ? `${((editingProduct.storeProfitPerUnit / editingProduct.finalUnitPrice) * 100).toFixed(1)}%` 
                      : "0%"}
                  </span>
                </div>
              </div>

              {/* Category Select / New */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">الفئة / القسم المحلي</label>
                <select
                  value={editingProduct.categoryId}
                  onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                  className="w-full bg-[#2D2D2D] border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-[#C8A45C]"
                >
                  <option value="">إنشاء فئة جديدة تلقائياً باسم الفئة من المزود</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Group Select */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">المجموعة (اختياري)</label>
                <select
                  value={editingProduct.groupId}
                  onChange={(e) => setEditingProduct({ ...editingProduct, groupId: e.target.value })}
                  className="w-full bg-[#2D2D2D] border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-[#C8A45C]"
                >
                  <option value="">بدون مجموعة</option>
                  {productGroups.map((g) => (
                    <option key={g.id} value={String(g.id)}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Quantity Type */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">نوع الكمية</label>
                <select
                  value={editingProduct.quantityType}
                  onChange={(e) => setEditingProduct({ ...editingProduct, quantityType: e.target.value })}
                  className="w-full bg-[#2D2D2D] border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-[#C8A45C]"
                >
                  <option value="fixed">ثابت (Fixed)</option>
                  <option value="range">نطاق حر (Range)</option>
                  <option value="list">قائمة مخصصة (List)</option>
                </select>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">الحد الأدنى</label>
                  <input
                    type="number"
                    value={editingProduct.minQty}
                    onChange={(e) => setEditingProduct({ ...editingProduct, minQty: e.target.value })}
                    className="w-full bg-[#2D2D2D] border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#C8A45C]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">الحد الأقصى</label>
                  <input
                    type="number"
                    placeholder="بلا حد"
                    value={editingProduct.maxQty}
                    onChange={(e) => setEditingProduct({ ...editingProduct, maxQty: e.target.value })}
                    className="w-full bg-[#2D2D2D] border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#C8A45C]"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div className="sm:col-span-2">
                <label className="block text-zinc-300 font-bold mb-1">رابط صورة المنتج (Image URL)</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.png"
                  value={editingProduct.image}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                  className="w-full bg-[#2D2D2D] border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-zinc-300 font-bold mb-1">الوصف أو التعليمات للعميل</label>
                <textarea
                  rows={2}
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-[#2D2D2D] border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C8A45C]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveEditedProduct}
                className="px-6 py-2.5 rounded-xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] text-xs font-black transition flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Download size={14} />
                <span>حفظ واستيراد إلى المتجر</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. BATCH IMPORT CONFIGURATION MODAL */}
      {showBatchImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#C8A45C]/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowBatchImportModal(false)}
              className="absolute left-5 top-5 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
                <Download size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">استيراد جماعي للمنتجات المحددة</h3>
                <p className="text-xs text-zinc-400">
                  سيتم استيراد <b className="text-[#FDE68A]">{selectedIds.size}</b> منتج دفعة واحدة إلى قاعدة البيانات
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-bold mb-1.5">نسبة الربح المضافة فوق سعر التكلفة (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={batchMarkupPercent}
                    onChange={(e) => setBatchMarkupPercent(e.target.value)}
                    className="w-full bg-[#2D2D2D] border border-zinc-700 rounded-xl px-4 py-3 text-white font-mono font-bold focus:outline-none focus:border-[#C8A45C]"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#FDE68A]">%</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">مثال: إذا كان سعر التكلفة $1.00 ونسبة الربح 15%، سيكون سعر البيع $1.15.</p>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1.5">تعيين الفئة المستهدفة</label>
                <select
                  value={batchTargetCategoryId}
                  onChange={(e) => setBatchTargetCategoryId(e.target.value)}
                  className="w-full bg-[#2D2D2D] border border-zinc-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C8A45C]"
                >
                  <option value="">إنشاء الفئات تلقائياً أو المطابقة مع فئات المزود</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>تعيين لجميع المنتجات: {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                onClick={() => setShowBatchImportModal(false)}
                disabled={importingBatch}
                className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteBatchImport}
                disabled={importingBatch}
                className="px-6 py-2.5 rounded-xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] text-xs font-black transition flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {importingBatch ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>جاري الاستيراد...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>بدء استيراد ({selectedIds.size}) منتج</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. COLUMNS TOGGLE MODAL */}
      {showColumnsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#C8A45C]/40 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowColumnsModal(false)}
              className="absolute left-5 top-5 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
                <Sliders size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">إظهار / إخفاء أعمدة الجدول</h3>
                <p className="text-xs text-zinc-400">حدد الحقول التي ترغب في عرضها بالجدول</p>
              </div>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#2D2D2D] hover:bg-[#353535] border border-zinc-800 transition cursor-pointer"
                >
                  <span className="text-xs font-bold text-zinc-200">{col.label}</span>
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => toggleColumn(col.key)}
                    className="rounded accent-[#C8A45C] w-4 h-4 cursor-pointer"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowColumnsModal(false)}
                className="px-5 py-2 rounded-xl bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] text-xs font-black transition cursor-pointer"
              >
                تطبيق وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
