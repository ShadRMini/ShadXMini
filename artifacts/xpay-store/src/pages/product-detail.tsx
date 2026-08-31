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

interface SectionConfig {
  id: string;
  visible: boolean;
  order: number;
  label: string;
  title?: string;
  button_text?: string;
}

interface CustomizationConfig {
  image_size: string;
  price_color: string;
  button_color: string;
  button_text_color: string;
  product_name_color?: string;
  info_box_bg_color?: string;
  default_unit_price?: number;
  total_amount?: number;
  direct_shipping_label?: string;
  bg_color?: string;
  text_color?: string;
  border_color?: string;
  border_radius?: string;
  font_family?: string;
  quantity_input_bg?: string;
  quantity_input_text?: string;
  quantity_input_border?: string;
  quantity_input_focus_border?: string;
  quantity_buttons_bg?: string;
  quantity_buttons_text?: string;
  unit_price_color?: string;
  quantity_label_color?: string;
  quantity_value_color?: string;
  quantity_button_color?: string;
  quantity_button_bg?: string;
  player_id_label_color?: string;
  player_id_input_border?: string;
  player_id_input_focus?: string;
  player_id_input_bg?: string;
  player_id_input_text?: string;
  breadcrumb_text_color?: string;
  breadcrumb_active_color?: string;
  action_buttons_color?: string;
  action_buttons_bg?: string;
  total_price_color?: string;
  purchase_button_text?: string;
  purchase_button_bg?: string;
  disclaimer_text_color?: string;
  page_bg_color?: string;
  general_text_color?: string;
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

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: "image", visible: true, order: 1, label: "صورة المنتج والبدائل", title: "صورة المنتج" },
  { id: "title", visible: true, order: 2, label: "اسم المنتج والتصنيف وحالة التوفر", title: "اسم المنتج" },
  { id: "price", visible: true, order: 3, label: "السعر المباشر والمجموع الكلي", title: "السعر" },
  { id: "rating", visible: true, order: 4, label: "شارات التقييم وشارات الخدمة", title: "التقييمات" },
  { id: "description", visible: true, order: 5, label: "وصف المنتج والملاحظات", title: "الوصف" },
  { id: "quantity", visible: true, order: 6, label: "تحديد الكمية وباقات الشحن", title: "اختيار الكمية" },
  { id: "add_to_cart", visible: true, order: 7, label: "زر الإضافة إلى السلة", title: "إضافة إلى السلة", button_text: "إضافة إلى السلة" },
  { id: "buy_now", visible: true, order: 8, label: "زر الشراء وتأكيد الطلب", title: "شراء الآن", button_text: "شراء الآن" },
  { id: "guarantees", visible: true, order: 9, label: "شارات الأمان والضمان الفوري", title: "الضمان والراحة" },
  { id: "reviews", visible: true, order: 10, label: "آراء وتقييمات العملاء", title: "التقييمات والمراجعات" },
  { id: "related_products", visible: true, order: 11, label: "منتجات ذات صلة بنفس القسم", title: "منتجات قد تعجبك" },
  { id: "share_buttons", visible: true, order: 12, label: "أزرار المشاركة والمفضلة", title: "مشاركة والمفضلة" },
  { id: "specifications", visible: false, order: 13, label: "المواصفات التقنية والشحن", title: "المواصفات والتفاصيل" }
];

const DEFAULT_CUSTOMIZATION: CustomizationConfig = {
  image_size: "250px",
  price_color: "#FDE68A",
  button_color: "#C8A45C",
  button_text_color: "#1A1A1A",
  bg_color: "#1A1A1A",
  text_color: "#FFFFFF",
  border_color: "#C8A45C",
  border_radius: "16px",
  font_family: "Cairo",
  product_name_color: "#FFFFFF",
  info_box_bg_color: "#242424",
  default_unit_price: 0,
  total_amount: 0,
  direct_shipping_label: "مطلوب للشحن المباشر",
  unit_price_color: "#E5E7EB",
  quantity_label_color: "#E5E7EB",
  quantity_value_color: "#FFFFFF",
  quantity_button_color: "#C8A45C",
  quantity_button_bg: "#2D2D2D",
  player_id_label_color: "#E5E7EB",
  player_id_input_border: "#4B5563",
  player_id_input_focus: "#C8A45C",
  player_id_input_bg: "#1A1A1A",
  player_id_input_text: "#FFFFFF",
  breadcrumb_text_color: "#9CA3AF",
  breadcrumb_active_color: "#C8A45C",
  action_buttons_color: "#C8A45C",
  action_buttons_bg: "transparent",
  total_price_color: "#C8A45C",
  purchase_button_text: "#1A1A1A",
  purchase_button_bg: "#C8A45C",
  disclaimer_text_color: "#9CA3AF",
  page_bg_color: "#1A1A1A",
  general_text_color: "#FFFFFF",
};

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
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
  const [customization, setCustomization] = useState<CustomizationConfig>(DEFAULT_CUSTOMIZATION);
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

  // Fetch product page config from API
  useEffect(() => {
    const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    fetch(`${baseUrl}/api/public/product-page-config?_=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === "object") {
          if (Array.isArray(data.sections) && data.sections.length > 0) {
            const sorted = [...data.sections].sort((a, b) => (a.order || 0) - (b.order || 0));
            setSections(sorted);
          }
          if (data.customization && typeof data.customization === "object") {
            setCustomization((prev) => ({ ...prev, ...data.customization }));
          }
          setSettings((prev) => ({
            ...prev,
            ...data,
            product_image_size: data.customization?.image_size || data.product_image_size || prev.product_image_size,
            product_bg_color: data.customization?.bg_color || data.product_bg_color || prev.product_bg_color,
            product_button_color: data.customization?.button_color || data.product_button_color || prev.product_button_color,
            product_show_reviews: data.product_show_reviews !== false && data.product_show_reviews !== "false",
            product_show_related: data.product_show_related !== false && data.product_show_related !== "false",
            product_show_guarantees: data.product_show_guarantees !== false && data.product_show_guarantees !== "false",
            product_legacy_mode: data.use_legacy_product_page === true || data.product_legacy_mode === true || data.product_legacy_mode === "true",
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
  const unitPrice = (customization.default_unit_price && Number(customization.default_unit_price) > 0)
    ? Number(customization.default_unit_price)
    : product.priceUsd;
  const totalUsd = (customization.total_amount && Number(customization.total_amount) > 0)
    ? Number(customization.total_amount)
    : unitPrice * quantity;

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

  const imageSizeVal = customization.image_size || settings.product_image_size || "250px";
  const imageSizeStyle = {
    width: imageSizeVal,
    height: imageSizeVal,
    maxWidth: "100%",
  };

  const customBgStyle = {
    backgroundColor: customization.page_bg_color || customization.bg_color || settings.product_bg_color || "#1A1A1A",
    color: customization.general_text_color || customization.text_color || settings.product_text_color || "#FFFFFF",
    fontFamily: customization.font_family || "Cairo, sans-serif",
  };

  const renderSection = (sec: SectionConfig) => {
    if (!sec.visible) return null;

    switch (sec.id) {
      case "image":
        return (
          <div key={sec.id} className="bg-[#242424] border border-[#C8A45C]/35 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center relative group overflow-hidden">
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

              {product.image && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
                  <Maximize2 size={16} className="text-[#FDE68A]" />
                  <span>تكبير الصورة</span>
                </div>
              )}
            </div>

            <div className="mt-3 text-[11px] text-zinc-400 flex items-center gap-1">
              <Sparkles size={12} className="text-[#C8A45C]" />
              <span>{sec.title || "شحن أوتوماتيكي ومباشر للحساب"}</span>
            </div>
          </div>
        );

      case "title": {
        const isGenericTitle = !sec.title || sec.title === "اسم المنتج" || sec.title === "عنوان المنتج" || sec.title.trim() === "";
        const displayTitle = isGenericTitle ? product.name : sec.title;

        return (
          <div key={sec.id}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold text-[#C8A45C] bg-[#C8A45C]/15 border border-[#C8A45C]/30 px-3 py-1 rounded-full">
                {product.categoryName}
              </span>
              {product.available ? (
                <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 size={10} /> متوفر وشحن فوري
                </span>
              ) : (
                <span className="text-[11px] text-red-400 bg-red-950/60 border border-red-500/30 px-2.5 py-1 rounded-full font-bold">
                  غير متوفر حالياً
                </span>
              )}
              {product.productType && (
                <span className="text-[11px] text-zinc-400 bg-[#1A1A1A] px-2.5 py-1 rounded-full font-mono">
                  {product.productType === "amount" ? "رصيد / كميات" : "باقة محددة"}
                </span>
              )}
            </div>

            <h1
              className="text-2xl sm:text-3xl font-black leading-snug tracking-tight"
              style={{ color: customization.product_name_color || "#FFFFFF" }}
            >
              {displayTitle}
            </h1>
          </div>
        );
      }

      case "price":
        return (
          <div
            key={sec.id}
            className="border border-[#C8A45C]/40 p-4 rounded-2xl flex items-center justify-between shadow-inner"
            style={{ backgroundColor: customization.info_box_bg_color || "#1A1A1A" }}
          >
            <div>
              <div className="text-xs font-semibold mb-0.5" style={{ color: customization.unit_price_color || "#E5E7EB" }}>سعر الوحدة</div>
              <div className="text-2xl font-black font-mono" style={{ color: customization.unit_price_color || customization.price_color || "#FDE68A" }}>
                ${unitPrice ? unitPrice.toFixed(4) : "0.0000"}
              </div>
            </div>

            <div className="text-left border-r border-zinc-700/80 pr-4">
              <div className="text-xs font-semibold" style={{ color: customization.total_price_color || "#C8A45C" }}>المجموع الكلي</div>
              <div className="text-2xl font-black font-mono" style={{ color: customization.total_price_color || customization.price_color || "#FDE68A" }}>
                ${totalUsd.toFixed(4)}
              </div>
            </div>
          </div>
        );

      case "rating":
        return (
          <div key={sec.id} className="flex items-center gap-3 bg-[#1A1A1A] px-4 py-2.5 rounded-2xl border border-zinc-800 text-xs">
            <div className="flex text-[#C8A45C]">★★★★★</div>
            <span className="text-zinc-300 font-bold">4.9 / 5.0 ⭐</span>
            <span className="text-zinc-500 text-[11px]">(بناءً على تقييمات العملاء الموثقة)</span>
          </div>
        );

      case "description":
        return (
          <div key={sec.id} className="bg-[#1A1A1A] p-4 rounded-2xl border border-zinc-800 text-xs text-zinc-300 leading-relaxed space-y-1">
            <div className="font-bold text-[#C8A45C] mb-1">
              {sec.title && sec.title !== "تفاصيل وملاحظات المنتج:" && sec.title !== "الوصف" ? sec.title : "تفاصيل وملاحظات المنتج:"}
            </div>
            <p className="whitespace-pre-line">{product.description || "لا توجد ملاحظات أو تفاصيل إضافية مخصصة لهذا المنتج."}</p>
          </div>
        );

      case "quantity":
        return (
          <div key={sec.id} className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="flex justify-between items-center mb-1">
              <label
                className="text-xs font-bold"
                style={{ color: customization.quantity_label_color || "#E5E7EB" }}
              >
                {sec.title || "حدد الكمية المطلوبة:"}
              </label>
              <span className="text-[11px] font-semibold" style={{ color: customization.quantity_buttons_text || customization.quantity_button_color || "#C8A45C" }}>
                (الحد الأدنى: {minQty.toLocaleString()})
              </span>
            </div>

            {usesFixedQuantity ? (
              <div
                className="p-3.5 text-center transition"
                style={{
                  backgroundColor: customization.quantity_input_bg || customization.player_id_input_bg || "rgba(200, 164, 92, 0.1)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: customization.quantity_input_border || customization.player_id_input_border || "rgba(200, 164, 92, 0.4)",
                  borderRadius: "16px",
                }}
              >
                <div className="text-xs" style={{ color: customization.disclaimer_text_color || "#D1D5DB" }}>كمية رسمية ثابتة لهذه الباقة</div>
                <div className="text-xl font-black mt-1" style={{ color: customization.quantity_input_text || customization.quantity_value_color || "#FFFFFF" }}>{minQty.toLocaleString()}</div>
              </div>
            ) : usesOfficialQuantityList ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {officialQuantityValues.map((value: number) => {
                  const isSelected = quantity === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setQuantity(value);
                        setQuantityInput(String(value));
                      }}
                      style={{
                        backgroundColor: isSelected
                          ? (customization.purchase_button_bg || customization.quantity_button_color || "#C8A45C")
                          : (customization.quantity_input_bg || customization.player_id_input_bg || "#1A1A1A"),
                        color: isSelected
                          ? (customization.purchase_button_text || "#1A1A1A")
                          : (customization.quantity_input_text || customization.quantity_value_color || "#FFFFFF"),
                        borderColor: isSelected
                          ? (customization.purchase_button_bg || customization.quantity_button_color || "#C8A45C")
                          : (customization.quantity_input_border || customization.player_id_input_border || "#4B5563"),
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderRadius: "16px",
                        padding: "12px",
                        fontSize: "14px",
                        fontWeight: "900",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {value.toLocaleString()}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Decrement Button (-) */}
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= minQty}
                  style={{
                    backgroundColor: customization.quantity_buttons_bg || customization.quantity_button_bg || "#2D2D2D",
                    color: customization.quantity_buttons_text || customization.quantity_button_color || "#C8A45C",
                    borderRadius: "16px",
                    width: "48px",
                    height: "48px",
                    border: "none",
                    fontSize: "20px",
                    fontWeight: "bold",
                    cursor: quantity <= minQty ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    opacity: quantity <= minQty ? 0.4 : 1,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (quantity > minQty) {
                      e.currentTarget.style.backgroundColor = (customization.quantity_buttons_bg || customization.quantity_button_bg)
                        ? `${customization.quantity_buttons_bg || customization.quantity_button_bg}CC`
                        : "#3D3D3D";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = customization.quantity_buttons_bg || customization.quantity_button_bg || "#2D2D2D";
                  }}
                >
                  <Minus size={18} />
                </button>

                {/* Quantity Input Box */}
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantityInput}
                  onChange={(e) => handleQtyInputChange(e.target.value)}
                  style={{
                    backgroundColor: customization.quantity_input_bg || customization.player_id_input_bg || "#1A1A1A",
                    color: customization.quantity_input_text || customization.quantity_value_color || "#FFFFFF",
                    borderColor: customization.quantity_input_border || customization.player_id_input_border || "#4B5563",
                    borderRadius: "16px",
                    height: "48px",
                    fontSize: "20px",
                    fontWeight: "900",
                    outline: "none",
                    textAlign: "center",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    padding: "0 12px",
                    flex: "1",
                    minWidth: "0",
                  }}
                  onFocus={(e) => {
                    const focusColor = customization.quantity_input_focus_border || customization.player_id_input_focus || "#C8A45C";
                    e.target.style.borderColor = focusColor;
                    e.target.style.boxShadow = `0 0 0 3px ${focusColor}40`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = customization.quantity_input_border || customization.player_id_input_border || "#4B5563";
                    e.target.style.boxShadow = "none";
                    commitQuantityInput();
                  }}
                />

                {/* Increment Button (+) */}
                <button
                  type="button"
                  onClick={handleIncrement}
                  style={{
                    backgroundColor: customization.quantity_buttons_bg || customization.quantity_button_bg || "#2D2D2D",
                    color: customization.quantity_buttons_text || customization.quantity_button_color || "#C8A45C",
                    borderRadius: "16px",
                    width: "48px",
                    height: "48px",
                    border: "none",
                    fontSize: "20px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = (customization.quantity_buttons_bg || customization.quantity_button_bg)
                      ? `${customization.quantity_buttons_bg || customization.quantity_button_bg}CC`
                      : "#3D3D3D";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = customization.quantity_buttons_bg || customization.quantity_button_bg || "#2D2D2D";
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>
            )}

            {/* Account ID / Phone Number Inputs */}
            {(purchaseMode === "apps" || purchaseMode === "games") && (
              <div className="pt-2">
                <label className="text-xs font-bold mb-2 block flex items-center justify-between" style={{ color: customization.player_id_label_color || "#E5E7EB" }}>
                  <span>معرّف الحساب (Player ID) *</span>
                  <span className="text-[10px]" style={{ color: customization.breadcrumb_active_color || "#C8A45C" }}>
                    {customization.direct_shipping_label || "مطلوب للشحن المباشر"}
                  </span>
                </label>
                <Input
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="أدخل معرّف الحساب (مثال: 123456789)"
                  className="h-13 rounded-2xl px-4 text-base placeholder:text-zinc-500 font-mono transition-all"
                  style={{
                    backgroundColor: customization.player_id_input_bg || "#1A1A1A",
                    borderColor: customization.player_id_input_border || "#4B5563",
                    color: customization.player_id_input_text || "#FFFFFF",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = customization.player_id_input_focus || "#C8A45C";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = customization.player_id_input_border || "#4B5563";
                  }}
                />
              </div>
            )}

            {purchaseMode === "balance" && (
              <div className="space-y-3 pt-2">
                <div className="rounded-2xl border border-[#C8A45C]/40 bg-[#C8A45C]/10 px-4 py-2.5 text-[#FDE68A] font-bold text-xs flex items-center justify-between">
                  <span>الكمية المحددة للشحن:</span>
                  <span className="font-mono text-base">{quantity} وحدة</span>
                </div>
                <div>
                  <label className="text-xs font-bold mb-2 block flex items-center justify-between" style={{ color: customization.player_id_label_color || "#E5E7EB" }}>
                    <span>رقم الخط المطلوب شحنه *</span>
                    <span className="text-[10px]" style={{ color: customization.breadcrumb_active_color || "#C8A45C" }}>مثال: 09XXXXXXXX</span>
                  </label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="أدخل رقم الخط (09XXXXXXXX)"
                    className="h-13 rounded-2xl px-4 text-base placeholder:text-zinc-500 font-mono transition-all"
                    style={{
                      backgroundColor: customization.player_id_input_bg || "#1A1A1A",
                      borderColor: customization.player_id_input_border || "#4B5563",
                      color: customization.player_id_input_text || "#FFFFFF",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = customization.player_id_input_focus || "#C8A45C";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = customization.player_id_input_border || "#4B5563";
                    }}
                  />
                </div>
              </div>
            )}

            <p className="text-[11px] bg-amber-950/40 border border-amber-500/30 p-3 rounded-2xl flex items-center gap-2 font-medium" style={{ color: customization.disclaimer_text_color || "#9CA3AF" }}>
              <AlertCircle className="w-4 h-4 shrink-0" style={{ color: customization.action_buttons_color || "#C8A45C" }} />
              برجاء التأكد من صحة البيانات المدخلة قبل تأكيد عملية الشراء.
            </p>
          </div>
        );

      case "buy_now":
      case "add_to_cart":
        return (
          <Button
            key={sec.id}
            onClick={handlePurchase}
            disabled={createOrder.isPending || !product.available}
            className="w-full h-15 rounded-2xl text-base sm:text-lg font-black shadow-xl transition transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: customization.purchase_button_bg || customization.button_color || "#C8A45C",
              color: customization.purchase_button_text || customization.button_text_color || "#1A1A1A",
            }}
          >
            {createOrder.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                جاري تنفيذ الطلب وتوثيقه...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShoppingCart size={20} />
                {sec.button_text || "شراء الآن / تأكيد الشراء الفوري"} (${totalUsd.toFixed(4)})
              </span>
            )}
          </Button>
        );

      case "guarantees":
        return (
          <div key={sec.id} className="bg-[#242424] border border-[#C8A45C]/25 rounded-3xl p-5 shadow-xl space-y-3.5">
            <h3 className="text-xs font-bold text-[#FDE68A] flex items-center gap-2 border-b border-zinc-800 pb-2.5">
              <ShieldCheck size={16} className="text-[#C8A45C]" />
              {sec.title || "ضمانات وأمان الخدمة في المتجر"}
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
        );

      case "reviews":
        return (
          <div key={sec.id} className="bg-[#242424] border border-[#C8A45C]/25 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-[#FDE68A] flex items-center gap-2">
                <Star size={18} className="text-[#C8A45C] fill-[#C8A45C]" />
                {sec.title || "تقييمات وآراء العملاء على الخدمة"}
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
        );

      case "related_products":
        return relatedProducts.length > 0 ? (
          <div key={sec.id} className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-[#FDE68A] flex items-center gap-2">
                <Sparkles size={20} className="text-[#C8A45C]" />
                {sec.title || "منتجات ذات صلة بنفس القسم"}
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
        ) : null;

      case "share_buttons":
        return (
          <div key={sec.id} className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={favLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1A1A] border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <Heart size={16} className={isFavorite ? "fill-[#C8A45C] text-[#C8A45C]" : ""} />
              <span>المفضلة</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product.name, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("تم نسخ رابط المنتج للحافظة!");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1A1A] border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <Share2 size={16} />
              <span>مشاركة</span>
            </button>
          </div>
        );

      case "specifications":
        return (
          <div key={sec.id} className="p-4 bg-[#1A1A1A] rounded-2xl border border-zinc-800 text-xs space-y-2">
            <div className="font-bold text-[#FDE68A]">{sec.title || "المواصفات والتفاصيل التقنية"}</div>
            <div className="grid grid-cols-2 gap-2 text-zinc-400 text-[11px]">
              <div>نوع الخدمة: <span className="text-white font-mono">{product.productType || "عام"}</span></div>
              <div>حالة الشحن: <span className="text-emerald-400 font-bold">تلقائي أوتوماتيكي</span></div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
              <span className="hover:text-white transition cursor-pointer font-medium" style={{ color: customization.breadcrumb_text_color || "#9CA3AF" }}>الرئيسية</span>
            </Link>
            <ChevronRight size={14} style={{ color: customization.breadcrumb_text_color || "#9CA3AF" }} />
            <Link href={`/categories/${product.categoryId}`}>
              <span className="font-bold transition cursor-pointer" style={{ color: customization.breadcrumb_active_color || "#C8A45C" }}>
                {product.categoryName}
              </span>
            </Link>
            <ChevronRight size={14} style={{ color: customization.breadcrumb_text_color || "#9CA3AF" }} />
            <span className="font-bold truncate max-w-[180px] sm:max-w-xs" style={{ color: customization.breadcrumb_active_color || "#FFFFFF" }}>{product.name}</span>
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
              className="p-2 rounded-xl border border-zinc-700 transition cursor-pointer text-xs flex items-center gap-1.5"
              style={{
                color: customization.action_buttons_color || "#C8A45C",
                backgroundColor: customization.action_buttons_bg === "transparent" ? "#1A1A1A" : (customization.action_buttons_bg || "#1A1A1A"),
              }}
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
              className="p-2 rounded-xl border border-zinc-700 transition cursor-pointer text-xs flex items-center gap-1.5"
              style={{
                color: customization.action_buttons_color || "#C8A45C",
                backgroundColor: customization.action_buttons_bg === "transparent" ? "#1A1A1A" : (customization.action_buttons_bg || "#1A1A1A"),
              }}
              title="إضافة للمفضلة"
            >
              <Heart size={16} className={isFavorite ? "fill-[#C8A45C]" : ""} />
              <span className="hidden sm:inline">{isFavorite ? "المفضلة" : "إضافة للمفضلة"}</span>
            </button>

            {/* Legacy Toggle */}
            <button
              type="button"
              onClick={() => setLegacyOverride(true)}
              className="p-2 rounded-xl border border-zinc-800 transition cursor-pointer text-xs flex items-center gap-1"
              style={{
                color: customization.action_buttons_color || "#9CA3AF",
                backgroundColor: customization.action_buttons_bg === "transparent" ? "#1A1A1A" : (customization.action_buttons_bg || "#1A1A1A"),
              }}
              title="التبديل إلى الوضع الكلاسيكي"
            >
              <LayoutGrid size={15} />
              <span className="hidden md:inline text-[11px]">الوضع السابق</span>
            </button>
          </div>
        </div>

        {/* Dynamic Responsive Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          {/* LEFT COLUMN (md:col-span-5) */}
          <div className="md:col-span-5 space-y-5">
            {sections
              .filter((s) => s.visible && (s.id === "image" || s.id === "guarantees"))
              .map((sec) => renderSection(sec))}
          </div>

          {/* RIGHT COLUMN (md:col-span-7) */}
          <div className="md:col-span-7 space-y-5">
            <div
              className="border border-[#C8A45C]/30 rounded-3xl p-6 shadow-2xl space-y-6"
              style={{ backgroundColor: customization.info_box_bg_color || "#242424" }}
            >
              {sections
                .filter(
                  (s) =>
                    s.visible &&
                    s.id !== "image" &&
                    s.id !== "guarantees" &&
                    s.id !== "reviews" &&
                    s.id !== "related_products"
                )
                .map((sec) => renderSection(sec))}
            </div>

            {/* Reviews Section */}
            {sections
              .filter((s) => s.visible && s.id === "reviews")
              .map((sec) => renderSection(sec))}
          </div>
        </div>

        {/* FULL WIDTH BOTTOM SECTION: Related Products */}
        {sections
          .filter((s) => s.visible && s.id === "related_products")
          .map((sec) => renderSection(sec))}
      </div>
    </div>
  );
}
