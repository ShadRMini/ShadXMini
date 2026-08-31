import { useGetProduct, getGetProductQueryKey, useCreateOrder, useListProducts } from "@workspace/api-client-react";
import { useRoute, useLocation, Link } from "wouter";
import {
  ChevronRight,
  ShoppingCart,
  AlertCircle,
  Heart,
  Maximize2,
  X,
  Zap,
  ShieldCheck,
  Headphones,
  Star,
  Plus,
  Minus,
  Share2,
  CheckCircle2,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import ProductCard from "@/components/product/ProductCard";

type PurchaseMode = "apps" | "games" | "balance";

function detectPurchaseMode(categoryName: string, productType: string): PurchaseMode {
  const normalized = (categoryName || "").toLowerCase();

  if (
    normalized.includes("رصيد") ||
    normalized.includes("balance") ||
    normalized.includes("اتصالات") ||
    normalized.includes("internet") ||
    normalized.includes("numbers")
  ) {
    return "balance";
  }

  if (normalized.includes("game") || normalized.includes("games") || normalized.includes("ألعاب")) {
    return "games";
  }

  if (normalized.includes("app") || normalized.includes("apps") || normalized.includes("تطبيق")) {
    return "apps";
  }

  return productType === "amount" ? "balance" : "games";
}

interface ProductPageSettings {
  product_image_size: string;
  product_layout_order: string[];
  product_show_reviews: boolean;
  product_show_related: boolean;
  product_show_guarantees: boolean;
  product_bg_color: string;
  product_text_color: string;
  product_button_color: string;
  product_border_color: string;
  product_legacy_mode: boolean;
}

const DEFAULT_SETTINGS: ProductPageSettings = {
  product_image_size: "250px",
  product_layout_order: ["image", "title", "price", "description", "quantity", "buttons", "guarantees", "reviews", "related"],
  product_show_reviews: true,
  product_show_related: true,
  product_show_guarantees: true,
  product_bg_color: "#1A1A1A",
  product_text_color: "#FFFFFF",
  product_button_color: "#C8A45C",
  product_border_color: "#C8A45C",
  product_legacy_mode: false,
};

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<ProductPageSettings>(DEFAULT_SETTINGS);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [legacyOverride, setLegacyOverride] = useState<boolean | null>(null);

  const { data: product, isLoading } = useGetProduct(id || "", {
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id || "") },
  });

  const categoryId = product?.categoryId ? String(product.categoryId) : undefined;
  const { data: relatedProductsResponse } = useListProducts(
    { categoryId },
    { query: { enabled: !!categoryId } }
  );

  const relatedProducts = useMemo(() => {
    if (!relatedProductsResponse || !Array.isArray(relatedProductsResponse)) return [];
    return relatedProductsResponse
      .filter((p: any) => String(p.id) !== String(id))
      .slice(0, 4);
  }, [relatedProductsResponse, id]);

  const createOrder = useCreateOrder();
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [accountId, setAccountId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Fetch product page settings from API
  useEffect(() => {
    const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    fetch(`${baseUrl}/api/public/product-page-settings?_=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === "object") {
          setSettings((prev) => ({
            ...prev,
            ...data,
            product_show_reviews: data.product_show_reviews !== false && data.product_show_reviews !== "false",
            product_show_related: data.product_show_related !== false && data.product_show_related !== "false",
            product_show_guarantees: data.product_show_guarantees !== false && data.product_show_guarantees !== "false",
            product_legacy_mode: data.product_legacy_mode === true || data.product_legacy_mode === "true",
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Check user favorites
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("xpay_store_auth_token");
    const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch(`${baseUrl}/api/favorites?_=${Date.now()}`, { headers, credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          const match = data.some((item: any) => String(item.id) === String(id));
          setIsFavorite(match);
        }
      })
      .catch(() => {});
  }, [id]);

  const toggleFavorite = async () => {
    if (!id || favLoading) return;
    setFavLoading(true);
    try {
      const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
      const token = localStorage.getItem("xpay_store_auth_token");
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${baseUrl}/api/favorites/${id}`, {
        method: isFavorite ? "DELETE" : "POST",
        headers,
        credentials: "include",
      });

      if (res.ok) {
        setIsFavorite(!isFavorite);
        toast.success(isFavorite ? "تمت إزالة المنتج من المفضلة" : "تمت إضافة المنتج للمفضلة 💖");
      }
    } catch {
      toast.error("فشل تحديث المفضلة");
    } finally {
      setFavLoading(false);
    }
  };

  useEffect(() => {
    if (!product) return;
    const officialValues = Array.isArray((product as any).quantityValues)
      ? (product as any).quantityValues
          .map((value: unknown) => Number(value))
          .filter((value: number) => Number.isInteger(value) && value > 0)
          .sort((a: number, b: number) => a - b)
      : [];
    const min = (product as any).quantityType === "list" && officialValues.length
      ? officialValues[0]
      : Number(product.minQty || 1);
    setQuantity(min);
    setQuantityInput(String(min));
  }, [product?.id, product?.minQty, (product as any)?.quantityType]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="w-48 h-10 rounded-xl bg-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Skeleton className="md:col-span-5 h-72 rounded-3xl bg-zinc-800" />
          <div className="md:col-span-7 space-y-4">
            <Skeleton className="h-10 w-3/4 rounded-xl bg-zinc-800" />
            <Skeleton className="h-6 w-1/4 rounded-lg bg-zinc-800" />
            <Skeleton className="h-32 w-full rounded-2xl bg-zinc-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="p-8 text-center mt-20 text-white font-bold text-lg">المنتج غير موجود أو تم إزالته</div>;
  }

  const minQty = product.minQty || 1;
  const officialQuantityValues = Array.isArray((product as any).quantityValues)
    ? (product as any).quantityValues
        .map((value: unknown) => Number(value))
        .filter((value: number) => Number.isInteger(value) && value > 0)
        .sort((a: number, b: number) => a - b)
    : [];
  const quantityType = (product as any).quantityType;
  const usesOfficialQuantityList = quantityType === "list" && officialQuantityValues.length > 0;
  const usesFixedQuantity = quantityType === "fixed";
  const purchaseMode = detectPurchaseMode(product.categoryName, product.productType);
  const totalUsd = product.priceUsd * quantity;

  const isLegacy = legacyOverride !== null ? legacyOverride : settings.product_legacy_mode;

  const commitQuantityInput = (rawValue?: string) => {
    const source = typeof rawValue === "string" ? rawValue : quantityInput;
    const normalized = String(source || "").replace(/,/g, "").trim();
    if (!normalized) {
      setQuantity(minQty);
      setQuantityInput(String(minQty));
      return minQty;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQuantity(minQty);
      setQuantityInput(String(minQty));
      return minQty;
    }

    const requestedQuantity = Math.max(minQty, Math.floor(parsed));
    let nextQuantity = requestedQuantity;
    if (usesFixedQuantity) {
      nextQuantity = minQty;
    } else if (usesOfficialQuantityList) {
      nextQuantity = officialQuantityValues.includes(requestedQuantity)
        ? requestedQuantity
        : officialQuantityValues[0] || minQty;
    }
    setQuantity(nextQuantity);
    setQuantityInput(String(nextQuantity));
    return nextQuantity;
  };

  const handleQtyInputChange = (value: string) => {
    const normalized = String(value || "").replace(/,/g, "").trim();
    if (!normalized) {
      setQuantityInput("");
      return;
    }

    if (!/^\d+$/.test(normalized)) return;
    setQuantityInput(normalized);
  };

  const handleIncrement = () => {
    if (usesFixedQuantity) return;
    if (usesOfficialQuantityList) {
      const idx = officialQuantityValues.indexOf(quantity);
      if (idx !== -1 && idx < officialQuantityValues.length - 1) {
        const next = officialQuantityValues[idx + 1];
        setQuantity(next);
        setQuantityInput(String(next));
      }
    } else {
      const next = quantity + 1;
      setQuantity(next);
      setQuantityInput(String(next));
    }
  };

  const handleDecrement = () => {
    if (usesFixedQuantity) return;
    if (usesOfficialQuantityList) {
      const idx = officialQuantityValues.indexOf(quantity);
      if (idx > 0) {
        const next = officialQuantityValues[idx - 1];
        setQuantity(next);
        setQuantityInput(String(next));
      }
    } else {
      const next = Math.max(minQty, quantity - 1);
      setQuantity(next);
      setQuantityInput(String(next));
    }
  };

  const handlePurchase = () => {
    const finalQuantity = commitQuantityInput();

    if (purchaseMode === "balance") {
      if (!phoneNumber.trim()) {
        toast.error("يرجى إدخال رقم الخط بشكل صحيح");
        return;
      }
    } else if (!accountId.trim()) {
      toast.error("يرجى إدخال معرف المستخدم (Player ID) بشكل صحيح");
      return;
    }

    createOrder.mutate(
      {
        data: {
          productId: product.id,
          quantity: finalQuantity,
          userIdentifier: purchaseMode === "balance" ? phoneNumber.trim() : accountId.trim(),
        },
      },
      {
        onSuccess: (order) => {
          toast.success("تم إرسال طلب الشراء وتنفيذه بنجاح 🎉");
          queryClient.invalidateQueries({ queryKey: ["/api/me"] });
          queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
          setLocation(`/orders/${order.id}`);
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || "حدث خطأ أثناء تنفيذ الطلب");
        },
      },
    );
  };

  const imageSizeStyle = {
    maxWidth: settings.product_image_size || "250px",
    maxHeight: settings.product_image_size || "250px",
  };

  const customBgStyle = settings.product_bg_color ? { backgroundColor: settings.product_bg_color } : {};

  // RENDER: LEGACY VIEW
  if (isLegacy) {
    return (
      <div className="min-h-screen text-white pb-24 animate-in fade-in duration-300" style={customBgStyle} dir="rtl">
        {/* Top Floating Control Bar */}
        <div className="p-4 flex items-center justify-between max-w-4xl mx-auto">
          <Link href={`/categories/${product.categoryId}`}>
            <div className="bg-[#2D2D2D] border border-[#C8A45C]/40 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-black/80 transition flex items-center gap-1 text-[#C8A45C] text-xs font-bold">
              <ChevronRight className="w-4 h-4" />
              <span>الرجوع للتصنيف</span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setLegacyOverride(false)}
            className="text-xs bg-[#C8A45C]/20 border border-[#C8A45C]/40 text-[#FDE68A] px-3 py-1 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-[#C8A45C]/30"
          >
            <LayoutGrid size={14} />
            <span>التبديل إلى التصميم المطور الحديث</span>
          </button>
        </div>

        {/* Big Banner Container */}
        <div className="relative w-full h-64 bg-[#2D2D2D] rounded-b-[2rem] overflow-hidden shadow-2xl border-b border-[#C8A45C]/30">
          <div className="absolute top-4 left-4 z-20">
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={favLoading}
              className="bg-black/60 backdrop-blur-md p-2.5 rounded-full cursor-pointer hover:bg-black/80 transition-all text-white border border-[#C8A45C]/40 active:scale-95"
            >
              <Heart
                size={20}
                className={`transition-colors ${isFavorite ? "fill-[#C8A45C] text-[#C8A45C]" : "text-white"}`}
              />
            </button>
          </div>
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center">
              <ShoppingCart className="w-16 h-16 text-[#C8A45C]/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-[#1A1A1A]/30 to-transparent" />
        </div>

        <div className="px-5 -mt-6 relative z-10 max-w-2xl mx-auto space-y-4">
          <h1 className="text-2xl font-black text-white leading-tight mb-1">{product.name}</h1>
          <div className="text-xs text-[#C8A45C] font-semibold">{product.categoryName}</div>

          <div className="space-y-6 bg-[#2D2D2D] border border-[#C8A45C]/35 p-5 rounded-3xl shadow-xl">
            {/* Purchase Form Elements */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-white">الكمية المطلوبة</label>
                <span className="text-xs text-[#C8A45C]">(الحد الأدنى: {minQty.toLocaleString()})</span>
              </div>

              {usesFixedQuantity ? (
                <div className="rounded-2xl border border-[#C8A45C]/50 bg-[#C8A45C]/10 px-4 py-4 text-center">
                  <div className="text-xs text-zinc-300 mb-1">كمية رسمية ثابتة من المزود</div>
                  <div className="text-xl font-black text-[#FDE68A]">{minQty.toLocaleString()}</div>
                </div>
              ) : usesOfficialQuantityList ? (
                <div className="grid grid-cols-2 gap-2">
                  {officialQuantityValues.map((value: number) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setQuantity(value);
                        setQuantityInput(String(value));
                      }}
                      className={`rounded-2xl border px-3 py-3 text-sm font-black transition cursor-pointer ${
                        quantity === value
                          ? "border-[#C8A45C] bg-[#C8A45C] text-[#1A1A1A] shadow-md shadow-[#C8A45C]/30"
                          : "border-[#4B5563] bg-[#1A1A1A] text-white hover:border-[#C8A45C]/60"
                      }`}
                    >
                      {value.toLocaleString()}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-[#1A1A1A] border border-[#4B5563] focus-within:border-[#C8A45C] p-2 rounded-2xl transition">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantityInput}
                    onChange={(e) => handleQtyInputChange(e.target.value)}
                    onBlur={() => commitQuantityInput()}
                    className="w-full h-10 text-center font-black text-lg bg-transparent text-white border-0 focus-visible:ring-0"
                  />
                </div>
              )}
            </div>

            {(purchaseMode === "apps" || purchaseMode === "games") && (
              <div>
                <label className="text-sm font-bold text-white mb-2 block">معرّف الحساب (ID) *</label>
                <Input
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="أدخل معرّف الحساب (Player ID)"
                  className="h-12 bg-[#3D3D3D] border-[#4B5563] text-white rounded-2xl px-4 focus-visible:ring-[#C8A45C] focus-visible:border-[#C8A45C] text-base placeholder:text-zinc-400"
                />
              </div>
            )}

            {purchaseMode === "balance" && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-[#C8A45C]/40 bg-[#C8A45C]/10 px-4 py-3 text-[#FDE68A] font-bold text-sm">
                  الكمية المحددة: {quantity} وحدة
                </div>
                <div>
                  <label className="text-sm font-bold text-white mb-2 block">رقم الخط *</label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="09XXXXXXXX"
                    className="h-12 bg-[#3D3D3D] border-[#4B5563] text-white rounded-2xl px-4 focus-visible:ring-[#C8A45C] focus-visible:border-[#C8A45C] text-base placeholder:text-zinc-400"
                  />
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-[#1A1A1A] border border-[#C8A45C]/30 p-4 text-center">
              <div className="text-xs text-zinc-400 font-semibold">السعر الإجمالي</div>
              <div className="text-3xl font-black text-[#FDE68A] mt-1">${totalUsd.toFixed(5)}</div>
            </div>

            <Button
              onClick={handlePurchase}
              disabled={createOrder.isPending || !product.available}
              className="w-full h-14 rounded-2xl text-base font-black bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] shadow-lg shadow-[#C8A45C]/25 transition cursor-pointer"
            >
              {createOrder.isPending ? "جاري تنفيذ الطلب..." : "تأكيد الشراء الفوري"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: MODERN ENHANCED GRID VIEW
  return (
    <div
      className="min-h-screen text-white pb-24 transition-colors duration-300 animate-in fade-in duration-500"
      style={customBgStyle}
      dir="rtl"
    >
      {/* Lightbox Modal for Full Image Zoom */}
      {isLightboxOpen && product.image && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-12 left-0 p-2 text-white hover:text-[#C8A45C] bg-white/10 rounded-full transition cursor-pointer"
            >
              <X size={24} />
            </button>
            <img
              src={product.image}
              alt={product.name}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border-2 border-[#C8A45C]/50 shadow-2xl"
            />
            <p className="text-zinc-300 text-xs mt-3 font-semibold">{product.name}</p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Top Breadcrumbs & Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#242424]/90 p-3.5 rounded-2xl border border-[#C8A45C]/25 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-2 text-xs">
            <Link href="/">
              <span className="text-zinc-400 hover:text-white transition cursor-pointer font-medium">الرئيسية</span>
            </Link>
            <ChevronRight size={14} className="text-zinc-500" />
            <Link href={`/categories/${product.categoryId}`}>
              <span className="text-[#C8A45C] hover:text-[#FDE68A] font-bold transition cursor-pointer">
                {product.categoryName}
              </span>
            </Link>
            <ChevronRight size={14} className="text-zinc-500" />
            <span className="text-zinc-200 font-bold truncate max-w-[180px] sm:max-w-xs">{product.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Share Button */}
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.name, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("تم نسخ رابط المنتج للمشاركة 📋");
                }
              }}
              className="p-2 bg-[#1A1A1A] hover:bg-[#2F2F2F] text-zinc-300 hover:text-white rounded-xl border border-zinc-700 transition cursor-pointer text-xs flex items-center gap-1.5"
              title="مشاركة المنتج"
            >
              <Share2 size={16} />
              <span className="hidden sm:inline">مشاركة</span>
            </button>

            {/* Favorite Button */}
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={favLoading}
              className={`p-2 rounded-xl border transition cursor-pointer text-xs flex items-center gap-1.5 ${
                isFavorite
                  ? "bg-[#C8A45C]/20 border-[#C8A45C] text-[#C8A45C]"
                  : "bg-[#1A1A1A] hover:bg-[#2F2F2F] border-zinc-700 text-zinc-300 hover:text-white"
              }`}
              title="إضافة للمفضلة"
            >
              <Heart size={16} className={isFavorite ? "fill-[#C8A45C]" : ""} />
              <span className="hidden sm:inline">{isFavorite ? "المفضلة" : "إضافة للمفضلة"}</span>
            </button>

            {/* Legacy Toggle */}
            <button
              type="button"
              onClick={() => setLegacyOverride(true)}
              className="p-2 bg-[#1A1A1A] hover:bg-[#2F2F2F] text-zinc-400 hover:text-[#FDE68A] rounded-xl border border-zinc-800 transition cursor-pointer text-xs flex items-center gap-1"
              title="التبديل إلى الوضع الكلاسيكي"
            >
              <LayoutGrid size={15} />
              <span className="hidden md:inline text-[11px]">الوضع السابق</span>
            </button>
          </div>
        </div>

        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT COLUMN: Compact Product Image & Guarantees (md:col-span-5) */}
          <div className="md:col-span-5 space-y-5">
            {/* 1. Compact Image Box */}
            <div className="bg-[#242424] border border-[#C8A45C]/35 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center relative group overflow-hidden">
              {/* Gold Ambient Glow Background */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#C8A45C]/10 via-transparent to-transparent pointer-events-none" />

              {/* Status Badge */}
              <div className="absolute top-4 right-4 z-10">
                {product.available ? (
                  <span className="text-[10px] font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md backdrop-blur-md">
                    <CheckCircle2 size={12} /> متوفر وشحن فوري
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-red-950/90 text-red-400 border border-red-500/40 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md backdrop-blur-md">
                    غير متوفر حالياً
                  </span>
                )}
              </div>

              {/* Image Container with Custom Controlled Size */}
              <div
                className="relative rounded-2xl overflow-hidden cursor-pointer group/img transition-transform duration-300 hover:scale-[1.02] flex items-center justify-center bg-[#1A1A1A] border border-[#C8A45C]/30 p-3 shadow-inner"
                style={imageSizeStyle}
                onClick={() => product.image && setIsLightboxOpen(true)}
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover/img:scale-105"
                  />
                ) : (
                  <div className="w-full h-full min-h-[180px] bg-gradient-to-br from-[#2D2D2D] to-[#1A1A1A] flex flex-col items-center justify-center p-4 text-center">
                    <ShoppingCart className="w-12 h-12 text-[#C8A45C]/40 mb-2" />
                    <span className="text-xs text-zinc-400">{product.name}</span>
                  </div>
                )}

                {/* Click to Zoom Overlay */}
                {product.image && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
                    <Maximize2 size={16} className="text-[#FDE68A]" />
                    <span>تكبير الصورة</span>
                  </div>
                )}
              </div>

              <div className="mt-3 text-[11px] text-zinc-400 flex items-center gap-1">
                <Sparkles size={12} className="text-[#C8A45C]" />
                <span>شحن أوتوماتيكي ومباشر للحساب</span>
              </div>
            </div>

            {/* 2. Guarantees & Features Badges Section */}
            {settings.product_show_guarantees && (
              <div className="bg-[#242424] border border-[#C8A45C]/25 rounded-3xl p-5 shadow-xl space-y-3.5">
                <h3 className="text-xs font-bold text-[#FDE68A] flex items-center gap-2 border-b border-zinc-800 pb-2.5">
                  <ShieldCheck size={16} className="text-[#C8A45C]" />
                  ضمانات وأمان الخدمة في المتجر
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-3 p-2.5 bg-[#1A1A1A] rounded-2xl border border-zinc-800">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#C8A45C] shrink-0">
                      <Zap size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-200">معالجة فورية وتلقائية ⚡</div>
                      <div className="text-[10px] text-zinc-400">يتم إرسال الشحن مباشرة بعد الشراء دون تأخير</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 bg-[#1A1A1A] rounded-2xl border border-zinc-800">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-200">ضمان آمن 100% 🔒</div>
                      <div className="text-[10px] text-zinc-400">طرق دفع موثوقة وشحن رسمي معتمد</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 bg-[#1A1A1A] rounded-2xl border border-zinc-800">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <Headphones size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-zinc-200">متابعة ودعم 24/7 🎧</div>
                      <div className="text-[10px] text-zinc-400">فريق الدعم الفني جاهز لمساعدتك في أي وقت</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Product Information & Purchase Form (md:col-span-7) */}
          <div className="md:col-span-7 space-y-5">
            <div className="bg-[#242424] border border-[#C8A45C]/30 rounded-3xl p-6 shadow-2xl space-y-6">
              {/* Product Header Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-[#C8A45C] bg-[#C8A45C]/15 border border-[#C8A45C]/30 px-3 py-1 rounded-full">
                    {product.categoryName}
                  </span>
                  {product.productType && (
                    <span className="text-[11px] text-zinc-400 bg-[#1A1A1A] px-2.5 py-1 rounded-full font-mono">
                      {product.productType === "amount" ? "رصيد / كميات" : "باقة محددة"}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white leading-snug tracking-tight">
                  {product.name}
                </h1>
              </div>

              {/* Price Banner Card */}
              <div className="bg-gradient-to-r from-[#1A1A1A] to-[#242424] border border-[#C8A45C]/40 p-4 rounded-2xl flex items-center justify-between shadow-inner">
                <div>
                  <div className="text-xs text-zinc-400 font-semibold mb-0.5">سعر الوحدة الافتراضي</div>
                  <div className="text-2xl font-black text-[#FDE68A] font-mono">
                    ${product.priceUsd ? product.priceUsd.toFixed(4) : "0.0000"}
                  </div>
                </div>

                <div className="text-left border-r border-zinc-700/80 pr-4">
                  <div className="text-xs text-[#C8A45C] font-semibold">المجموع الكلي</div>
                  <div className="text-2xl font-black text-[#FDE68A] font-mono">${totalUsd.toFixed(4)}</div>
                </div>
              </div>

              {/* Description Box */}
              {product.description && (
                <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed space-y-1">
                  <div className="font-bold text-[#C8A45C] mb-1">تفاصيل وملاحظات المنتج:</div>
                  <p className="whitespace-pre-line">{product.description}</p>
                </div>
              )}

              {/* Form Controls */}
              <div className="space-y-5 pt-2 border-t border-zinc-800">
                {/* Quantity Control */}
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <label className="text-xs font-bold text-zinc-200">حدد الكمية المطلوبة:</label>
                    <span className="text-[11px] text-[#C8A45C] font-semibold">
                      (الحد الأدنى: {minQty.toLocaleString()})
                    </span>
                  </div>

                  {usesFixedQuantity ? (
                    <div className="rounded-2xl border border-[#C8A45C]/40 bg-[#C8A45C]/10 p-3.5 text-center">
                      <div className="text-xs text-zinc-300">كمية رسمية ثابتة لهذه الباقة</div>
                      <div className="text-xl font-black text-[#FDE68A] mt-1">{minQty.toLocaleString()}</div>
                    </div>
                  ) : usesOfficialQuantityList ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {officialQuantityValues.map((value: number) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setQuantity(value);
                            setQuantityInput(String(value));
                          }}
                          className={`rounded-2xl border px-3 py-3 text-sm font-black transition cursor-pointer ${
                            quantity === value
                              ? "border-[#C8A45C] bg-[#C8A45C] text-[#1A1A1A] shadow-md shadow-[#C8A45C]/30"
                              : "border-[#4B5563] bg-[#1A1A1A] text-white hover:border-[#C8A45C]/60"
                          }`}
                        >
                          {value.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleDecrement}
                        disabled={quantity <= minQty}
                        className="w-12 h-12 rounded-2xl bg-[#1A1A1A] border border-zinc-700 hover:border-[#C8A45C] text-white flex items-center justify-center font-bold text-lg disabled:opacity-40 transition cursor-pointer shrink-0"
                      >
                        <Minus size={18} />
                      </button>

                      <div className="flex-1 bg-[#1A1A1A] border border-zinc-700 focus-within:border-[#C8A45C] rounded-2xl p-1 transition">
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={quantityInput}
                          onChange={(e) => handleQtyInputChange(e.target.value)}
                          onBlur={() => commitQuantityInput()}
                          className="w-full h-10 text-center font-black text-xl bg-transparent text-white border-0 focus-visible:ring-0"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleIncrement}
                        className="w-12 h-12 rounded-2xl bg-[#1A1A1A] border border-zinc-700 hover:border-[#C8A45C] text-white flex items-center justify-center font-bold text-lg transition cursor-pointer shrink-0"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Account ID / Phone Number Input */}
                {(purchaseMode === "apps" || purchaseMode === "games") && (
                  <div>
                    <label className="text-xs font-bold text-zinc-200 mb-2 block flex items-center justify-between">
                      <span>معرّف الحساب (Player ID) *</span>
                      <span className="text-[10px] text-[#C8A45C]">مطلوب للشحن المباشر</span>
                    </label>
                    <Input
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      placeholder="أدخل معرّف الحساب (مثال: 123456789)"
                      className="h-13 bg-[#1A1A1A] border-zinc-700 text-white rounded-2xl px-4 focus-visible:ring-[#C8A45C] focus-visible:border-[#C8A45C] text-base placeholder:text-zinc-500 font-mono"
                    />
                  </div>
                )}

                {purchaseMode === "balance" && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-[#C8A45C]/40 bg-[#C8A45C]/10 px-4 py-2.5 text-[#FDE68A] font-bold text-xs flex items-center justify-between">
                      <span>الكمية المحددة للشحن:</span>
                      <span className="font-mono text-base">{quantity} وحدة</span>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-200 mb-2 block flex items-center justify-between">
                        <span>رقم الخط المطلوب شحنه *</span>
                        <span className="text-[10px] text-[#C8A45C]">مثال: 09XXXXXXXX</span>
                      </label>
                      <Input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="أدخل رقم الخط (09XXXXXXXX)"
                        className="h-13 bg-[#1A1A1A] border-zinc-700 text-white rounded-2xl px-4 focus-visible:ring-[#C8A45C] focus-visible:border-[#C8A45C] text-base placeholder:text-zinc-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Warning note */}
                <p className="text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-500/30 p-3 rounded-2xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-[#C8A45C] shrink-0" />
                  برجاء التأكد من صحة البيانات المدخلة قبل تأكيد عملية الشراء.
                </p>

                {/* Big Action Button */}
                <Button
                  onClick={handlePurchase}
                  disabled={createOrder.isPending || !product.available}
                  className="w-full h-15 rounded-2xl text-base sm:text-lg font-black bg-[#C8A45C] hover:bg-[#B8954A] text-[#1A1A1A] shadow-xl shadow-[#C8A45C]/30 transition transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                  style={
                    settings.product_button_color
                      ? { backgroundColor: settings.product_button_color }
                      : undefined
                  }
                >
                  {createOrder.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      جاري تنفيذ الطلب وتوثيقه...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShoppingCart size={20} />
                      تأكيد الشراء الفوري (${totalUsd.toFixed(4)})
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Reviews Section */}
            {settings.product_show_reviews && (
              <div className="bg-[#242424] border border-[#C8A45C]/25 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2">
                    <Star size={18} className="text-[#C8A45C] fill-[#C8A45C]" />
                    تقييمات وآراء العملاء على الخدمة
                  </h3>
                  <span className="text-xs font-mono font-bold text-[#C8A45C] bg-[#1A1A1A] px-2.5 py-1 rounded-full border border-[#C8A45C]/30">
                    4.9 / 5.0 ⭐
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#1A1A1A] rounded-2xl border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200">أحمد م.</span>
                      <div className="flex text-[#C8A45C]">★★★★★</div>
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      سرعة تنفيذ مذهلة! وصل الشحن للحساب خلال أقل من 30 ثانية. شكراً لكم.
                    </p>
                  </div>

                  <div className="p-3 bg-[#1A1A1A] rounded-2xl border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200">خالد ع.</span>
                      <div className="flex text-[#C8A45C]">★★★★★</div>
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      أفضل متجر التعامل معه سريع والدعم الفني متجاوب دائماً.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FULL WIDTH BOTTOM SECTION: Related Products Grid */}
        {settings.product_show_related && relatedProducts.length > 0 && (
          <div className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-[#FDE68A] flex items-center gap-2">
                <Sparkles size={20} className="text-[#C8A45C]" />
                منتجات ذات صلة بنفس القسم
              </h2>
              <Link href={`/categories/${product.categoryId}`}>
                <span className="text-xs font-bold text-[#C8A45C] hover:underline cursor-pointer">
                  عرض الكل ←
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {relatedProducts.map((p: any, idx: number) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  image={p.image}
                  priceUsd={p.priceUsd}
                  minTotalUsd={p.minTotalUsd}
                  minQty={p.minQty}
                  categoryName={p.categoryName}
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
