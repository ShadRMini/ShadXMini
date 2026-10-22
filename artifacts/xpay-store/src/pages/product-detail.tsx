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
  Crown,
  User,
  Phone,
  Mail,
  Lock,
  Server,
  Globe,
  Gift,
  Gamepad2,
  Hash,
  Key,
  Check,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import ProductCard from "@/components/product/ProductCard";
import { useCurrency } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";

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

function getParamConfig(param: string) {
  const clean = param.trim().toLowerCase();

  if (
    clean.includes("هاتف") ||
    clean.includes("phone") ||
    clean.includes("mobile") ||
    clean.includes("جوال") ||
    clean.includes("خط")
  ) {
    return {
      icon: Phone,
      label: param,
      placeholder: "أدخل رقم الهاتف (مثال: 09XXXXXXXX)",
      type: "tel",
      help: "مطلوب لشحن الخط مباشرة",
    };
  }

  if (
    clean.includes("zone") ||
    clean.includes("منطقة") ||
    clean.includes("زون") ||
    clean.includes("سيرفر") ||
    clean.includes("server")
  ) {
    return {
      icon: Server,
      label: param,
      placeholder: "أدخل معرف السيرفر / المنطقة (Zone ID)",
      type: "text",
      help: "معرف السيرفر أو المنطقة الخاصة بحسابك",
    };
  }

  if (
    clean.includes("email") ||
    clean.includes("بريد") ||
    clean.includes("إيميل") ||
    clean.includes("ايميل")
  ) {
    return {
      icon: Mail,
      label: param,
      placeholder: "example@domain.com",
      type: "email",
      help: "البريد الإلكتروني المرتبط بالخدمة",
    };
  }

  if (
    clean.includes("pass") ||
    clean.includes("كلمة المرور") ||
    clean.includes("سر") ||
    clean.includes("رمز")
  ) {
    return {
      icon: Lock,
      label: param,
      placeholder: "أدخل كلمة المرور",
      type: "password",
      help: "كلمة مرور الحساب بشكل آمن",
    };
  }

  if (
    clean.includes("gift") ||
    clean.includes("هدية") ||
    clean.includes("كود") ||
    clean.includes("قسيمة")
  ) {
    return {
      icon: Gift,
      label: param,
      placeholder: "أدخل كود الهدية / القسيمة",
      type: "text",
      help: "كود القسيمة أو التفعيل",
    };
  }

  if (
    clean.includes("player") ||
    clean.includes("معرف") ||
    clean.includes("id") ||
    clean.includes("حساب") ||
    clean.includes("آيدي") ||
    clean.includes("ايدي")
  ) {
    return {
      icon: Gamepad2,
      label: param,
      placeholder: "أدخل معرف الحساب (مثال: 123456789)",
      type: "text",
      help: "معرف اللاعب أو الحساب المعتمد",
    };
  }

  return {
    icon: User,
    label: param,
    placeholder: `أدخل ${param}`,
    type: "text",
    help: "مطلوب لإتمام تنفيذ الطلب",
  };
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
  { id: "add_to_cart", visible: false, order: 7, label: "زر الإضافة إلى السلة", title: "إضافة إلى السلة", button_text: "إضافة إلى السلة" },
  { id: "buy_now", visible: true, order: 8, label: "زر الشراء وتأكيد الطلب", title: "شراء الآن", button_text: "شراء الآن" },
  { id: "guarantees", visible: true, order: 9, label: "شارات الأمان والضمان الفوري", title: "الضمان والراحة" },
  { id: "reviews", visible: false, order: 10, label: "آراء وتقييمات العملاء", title: "التقييمات والمراجعات" },
  { id: "related_products", visible: true, order: 11, label: "منتجات ذات صلة بنفس القسم", title: "منتجات قد تعجبك" },
  { id: "share_buttons", visible: true, order: 12, label: "أزرار المشاركة والمفضلة", title: "مشاركة والمفضلة" },
  { id: "specifications", visible: false, order: 13, label: "المواصفات التقنية والشحن", title: "المواصفات والتفاصيل" }
];

const DEFAULT_CUSTOMIZATION: CustomizationConfig = {
  image_size: "250px",
  price_color: "",
  button_color: "",
  button_text_color: "",
  bg_color: "",
  text_color: "",
  border_color: "",
  border_radius: "16px",
  font_family: "Cairo",
  product_name_color: "",
  info_box_bg_color: "",
  default_unit_price: 0,
  total_amount: 0,
  direct_shipping_label: "مطلوب للشحن المباشر",
  unit_price_color: "",
  quantity_label_color: "",
  quantity_value_color: "",
  quantity_button_color: "",
  quantity_button_bg: "",
  player_id_label_color: "",
  player_id_input_border: "",
  player_id_input_focus: "",
  player_id_input_bg: "",
  player_id_input_text: "",
  breadcrumb_text_color: "",
  breadcrumb_active_color: "",
  action_buttons_color: "",
  action_buttons_bg: "transparent",
  total_price_color: "",
  purchase_button_text: "",
  purchase_button_bg: "",
  disclaimer_text_color: "",
  page_bg_color: "",
  general_text_color: "",
};

const DEFAULT_SETTINGS: ProductPageSettings = {
  product_image_size: "250px",
  product_layout_order: ["image", "title", "price", "description", "quantity", "buttons", "guarantees", "reviews", "related"],
  product_show_reviews: true,
  product_show_related: true,
  product_show_guarantees: true,
  product_bg_color: "",
  product_text_color: "",
  product_button_color: "",
  product_border_color: "",
  product_legacy_mode: false,
};

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [settings, setSettings] = useState<ProductPageSettings>(DEFAULT_SETTINGS);
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
  const [customization, setCustomization] = useState<CustomizationConfig>(DEFAULT_CUSTOMIZATION);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [legacyOverride, setLegacyOverride] = useState<boolean | null>(null);
  const [vipDiscountPercent, setVipDiscountPercent] = useState<number>(0);
  const [vipDiscountFixedAmount, setVipDiscountFixedAmount] = useState<number>(0);
  const [vipBadgeName, setVipBadgeName] = useState<string>("");
  const [vipBadgeColor, setVipBadgeColor] = useState<string>("#C8A45C");

  const { formatPrice, formatPriceWithSyp } = useCurrency();

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
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Task #95 C15c: persist Player ID per product in sessionStorage
  useEffect(() => {
    if (!product?.id) return;
    const saved = sessionStorage.getItem(`player_id_${product.id}`);
    if (saved && !accountId) {
      setAccountId(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  useEffect(() => {
    if (accountId && product?.id) {
      try {
        sessionStorage.setItem(`player_id_${product.id}`, accountId);
      } catch {}
    }
  }, [accountId, product?.id]);

  const dynamicParams = useMemo(() => {
    const p = product as any;
    if (Array.isArray(p?.params) && p.params.length > 0) {
      return p.params.map(String).map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  }, [product]);

  // Fetch product page config from API
  useEffect(() => {
    apiFetch<any>("/api/public/product-page-config")
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
    if (!token) return;

    apiFetch<any[]>("/api/favorites")
      .then((data) => {
        if (Array.isArray(data)) {
          const match = data.some((item: any) => String(item.id) === String(id));
          setIsFavorite(match);
        }
      })
      .catch(() => {});
  }, [id]);

  // Fetch VIP level discount details
  useEffect(() => {
    const token = localStorage.getItem("xpay_store_auth_token");
    if (!token) {
      setVipDiscountPercent(0);
      setVipBadgeName("");
      return;
    }

    apiFetch<any>("/api/me/vip-details")
      .then((data) => {
        if (data && typeof data === "object") {
          let fixedDiscount = Number(data.discountFixedAmount ?? data.discount_fixed_amount ?? data.currentLevel?.discountFixedAmount ?? data.currentLevel?.discount_fixed_amount ?? 0);
          const lvl = Number(user?.vipLevel || data.currentLevel?.levelOrder || data.currentLevel?.level_order || 1);
          if ((isNaN(fixedDiscount) || fixedDiscount <= 0.0001) && lvl > 1) {
            if (lvl === 2) fixedDiscount = 0.01;
            else if (lvl === 3) fixedDiscount = 0.02;
            else if (lvl === 4) fixedDiscount = 0.03;
            else if (lvl >= 5) fixedDiscount = 0.04;
          }
          setVipDiscountFixedAmount(fixedDiscount);
          const badgeName = data.currentLevel?.nameAr || data.currentLevel?.name_ar || data.currentLevel?.name || (user?.vipBadge?.name) || "";
          setVipBadgeName(badgeName);
          const badgeColor = data.currentLevel?.badgeColor || data.currentLevel?.badge_color || (user?.vipBadge?.color) || "#C8A45C";
          setVipBadgeColor(badgeColor);
        }
      })
      .catch(() => {});
  }, [user?.vipLevel, user?.id]);

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
    const isPkg = product.productType === "package";
    const officialValues = Array.isArray((product as any).quantityValues)
      ? (product as any).quantityValues
          .map((value: unknown) => Number(value))
          .filter((value: number) => Number.isInteger(value) && value > 0)
          .sort((a: number, b: number) => a - b)
      : [];
    const min = isPkg
      ? 1
      : ((product as any).quantityType === "list" && officialValues.length
          ? officialValues[0]
          : Number(product.minQty || 1));
    setQuantity(min);
    setQuantityInput(String(min));
  }, [product?.id, product?.minQty, (product as any)?.quantityType, product?.productType]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen p-6 max-w-5xl mx-auto space-y-6"
        style={{ backgroundColor: "var(--theme-background, #1A1A1A)" }}
      >
        <Skeleton
          className="w-48 h-10 rounded-xl"
          style={{ backgroundColor: "var(--theme-card, #2D2D2D)" }}
        />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Skeleton
            className="md:col-span-5 h-72 rounded-3xl"
            style={{ backgroundColor: "var(--theme-card, #2D2D2D)" }}
          />
          <div className="md:col-span-7 space-y-4">
            <Skeleton
              className="h-10 w-3/4 rounded-xl"
              style={{ backgroundColor: "var(--theme-card, #2D2D2D)" }}
            />
            <Skeleton
              className="h-6 w-1/4 rounded-lg"
              style={{ backgroundColor: "var(--theme-card, #2D2D2D)" }}
            />
            <Skeleton
              className="h-32 w-full rounded-2xl"
              style={{ backgroundColor: "var(--theme-card, #2D2D2D)" }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div
        className="p-8 text-center mt-20 font-bold text-lg"
        style={{ color: "var(--theme-text-primary, #FFFFFF)" }}
      >
        المنتج غير موجود أو تم إزالته
      </div>
    );
  }

  const isPackage = product.productType === "package";
  const minQty = isPackage ? 1 : (product.minQty || 1);
  const officialQuantityValues = Array.isArray((product as any).quantityValues)
    ? (product as any).quantityValues
        .map((value: unknown) => Number(value))
        .filter((value: number) => Number.isInteger(value) && value > 0)
        .sort((a: number, b: number) => a - b)
    : [];
  const quantityType = (product as any).quantityType;
  const usesOfficialQuantityList = !isPackage && quantityType === "list" && officialQuantityValues.length > 0;
  const usesFixedQuantity = isPackage || quantityType === "fixed";
  const purchaseMode = detectPurchaseMode(product.categoryName, product.productType);
  const baseUnitPrice = (customization.default_unit_price && Number(customization.default_unit_price) > 0)
    ? Number(customization.default_unit_price)
    : product.priceUsd;
  const providerPriceFloor = Number((product as any).providerPrice || (product as any).costPriceUsd || (product as any).providerUnitPrice || 0);
  const hasFixedDiscount = vipDiscountFixedAmount > 0;
  const hasVipDiscount = hasFixedDiscount;

  let calculatedUnitPrice = baseUnitPrice;
  if (hasFixedDiscount) {
    calculatedUnitPrice = Math.max(providerPriceFloor, baseUnitPrice - vipDiscountFixedAmount);
  }
  const unitPrice = Number(calculatedUnitPrice.toFixed(8));
  const effectiveQuantity = isPackage ? 1 : quantity;
  const totalUsd = (customization.total_amount && Number(customization.total_amount) > 0)
    ? Number(customization.total_amount)
    : Number((unitPrice * effectiveQuantity).toFixed(8));
  const baseTotalUsd = Number((baseUnitPrice * effectiveQuantity).toFixed(8));
  const totalSavingsUsd = hasVipDiscount ? Math.max(0, baseTotalUsd - totalUsd) : 0;

  const isLegacy = legacyOverride !== null ? legacyOverride : settings.product_legacy_mode;

  const commitQuantityInput = (rawValue?: string) => {
    if (isPackage) {
      setQuantity(1);
      setQuantityInput("1");
      return 1;
    }
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

    if (dynamicParams.length > 0) {
      for (const param of dynamicParams) {
        const val = (customFieldValues[param] || "").trim();
        if (!val) {
          toast.error(`يرجى إدخال ${param} للمتابعة`);
          return;
        }
      }
    } else {
      if (purchaseMode === "balance") {
        if (!phoneNumber.trim()) {
          toast.error("يرجى إدخال رقم الخط بشكل صحيح");
          return;
        }
      } else if (!accountId.trim()) {
        toast.error("يرجى إدخال معرف المستخدم (Player ID) بشكل صحيح");
        return;
      }
    }

    let primaryIdentifier = "";
    if (dynamicParams.length > 0) {
      const keys = Object.keys(customFieldValues);
      const primaryKey =
        keys.find((k) => {
          const lower = k.toLowerCase();
          return (
            lower.includes("player") ||
            lower.includes("معرف") ||
            lower.includes("id") ||
            lower.includes("phone") ||
            lower.includes("هاتف") ||
            lower.includes("خط")
          );
        }) || keys[0];
      primaryIdentifier = primaryKey ? (customFieldValues[primaryKey] || "").trim() : "";
    } else {
      primaryIdentifier = purchaseMode === "balance" ? phoneNumber.trim() : accountId.trim();
    }

    createOrder.mutate(
      {
        data: {
          productId: product.id,
          quantity: finalQuantity,
          userIdentifier: primaryIdentifier,
          customParams: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
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

  const isDefaultGoldOrEmpty = (val?: string) => {
    if (!val) return true;
    const clean = String(val).trim().toLowerCase();
    return [
      "", "initial", "none", "inherit", "unset", "transparent",
      "#1a1a1a", "#2d2d2d", "#c8a45c", "#0f172a", "#b8954a", "#fde68a",
      "#3d3d3d", "#242424", "#ffffff", "#f5ca35", "#dcb220", "#e5e7eb", "#4b5563", "#9ca3af", "#d1d5db"
    ].includes(clean);
  };

  const getCustomOrFallback = (val: string | undefined, fallbackCssVar: string) => {
    if (val && !isDefaultGoldOrEmpty(val)) return val;
    return fallbackCssVar;
  };

  const imageSizeVal = customization.image_size || settings.product_image_size || "250px";
  const imageSizeStyle = {
    width: imageSizeVal,
    height: imageSizeVal,
    maxWidth: "100%",
  };

  const customBgStyle = {
    backgroundColor: getCustomOrFallback(
      customization.page_bg_color || customization.bg_color || settings.product_bg_color,
      "var(--product-bg-color, var(--theme-background))"
    ),
    color: getCustomOrFallback(
      customization.general_text_color || customization.text_color || settings.product_text_color,
      "var(--product-text-color, var(--theme-text-primary))"
    ),
    fontFamily: customization.font_family || "var(--theme-font-arabic, 'Cairo', sans-serif)",
  };

  const renderSection = (sec: SectionConfig) => {
    if (!sec.visible) return null;

    switch (sec.id) {
      case "image":
        return (
          <div
            key={sec.id}
            className="border rounded-3xl p-theme shadow-2xl flex flex-col items-center justify-center relative group overflow-hidden"
            style={{
              backgroundColor: "var(--theme-card, #2D2D2D)",
              borderColor: "var(--theme-border, #3A3A3A)",
            }}
          >
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
              className="relative rounded-2xl overflow-hidden cursor-pointer group/img transition-transform duration-300 hover:scale-[1.02] flex items-center justify-center border p-3 shadow-inner"
              style={{
                ...imageSizeStyle,
                backgroundColor: "var(--theme-background, #1A1A1A)",
                borderColor: "var(--theme-border, #3A3A3A)",
              }}
              onClick={() => product.image && setIsLightboxOpen(true)}
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  width="400"
                  height="400"
                  decoding="async"
                  className="w-full h-full object-contain transition-transform duration-500 group-hover/img:scale-105"
                />
              ) : (
                <div
                  className="w-full h-full min-h-[180px] flex flex-col items-center justify-center p-4 text-center"
                  style={{
                    background:
                      "linear-gradient(to bottom right, var(--theme-card, #2D2D2D), var(--theme-background, #1A1A1A))",
                  }}
                >
                  <ShoppingCart className="w-12 h-12 mb-2" style={{ color: "var(--theme-primary)", opacity: 0.5 }} />
                  <span className="text-xs" style={{ color: "var(--theme-text-muted, #9E9E9E)" }}>
                    {product.name}
                  </span>
                </div>
              )}

              {product.image && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
                  <Maximize2 size={16} style={{ color: "var(--theme-accent)" }} />
                  <span>تكبير الصورة</span>
                </div>
              )}
            </div>

            <div
              className="mt-3 text-[11px] flex items-center gap-1"
              style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
            >
              <Sparkles size={12} style={{ color: "var(--theme-primary)" }} />
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
              <span
                className="text-xs font-bold px-3 py-1 rounded-full border"
                style={{
                  color: "var(--theme-primary)",
                  backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 15%, transparent)",
                  borderColor: "var(--theme-border)",
                }}
              >
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
                <span
                  className="text-[11px] px-2.5 py-1 rounded-full font-mono"
                  style={{
                    backgroundColor: "var(--theme-background)",
                    color: "var(--theme-text-muted, #9E9E9E)",
                  }}
                >
                  {product.productType === "amount" ? "رصيد / كميات" : "باقة محددة"}
                </span>
              )}
            </div>

            <h1
              className="text-2xl sm:text-3xl font-black leading-snug tracking-tight"
              style={{
                color: getCustomOrFallback(
                  customization.product_name_color || customization.title_color,
                  "var(--product-product-name-color, var(--product-title-color, var(--theme-text-primary)))"
                )
              }}
            >
              {displayTitle}
            </h1>
          </div>
        );
      }

      case "price":
        const unitFormatted = formatPriceWithSyp(unitPrice);
        const totalFormatted = formatPriceWithSyp(totalUsd);
        const baseUnitFormatted = formatPriceWithSyp(baseUnitPrice);
        const baseTotalFormatted = formatPriceWithSyp(baseTotalUsd);
        return (
          <div
            key={sec.id}
            className="border p-4 rounded-2xl shadow-inner space-y-3"
            style={{
              backgroundColor: getCustomOrFallback(
                customization.info_box_bg_color,
                "var(--product-card-color, var(--theme-card))"
              ),
              borderColor: "var(--theme-border, #3A3A3A)",
            }}
          >
            {hasVipDiscount && (
              <div
                className="flex items-center justify-between border px-3 py-1.5 rounded-xl text-xs"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 15%, transparent)",
                  borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
                }}
              >
                <div className="flex items-center gap-1.5 font-bold" style={{ color: vipBadgeColor }}>
                  <Crown size={15} />
                  <span>
                    خصم عضوية {vipBadgeName || "VIP"} (${vipDiscountFixedAmount} لكل وحدة)
                  </span>
                </div>
                {totalSavingsUsd > 0 && (
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">
                    وفرت {formatPrice(totalSavingsUsd)}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <div 
                  className="text-xs font-semibold mb-0.5" 
                  style={{ 
                    color: getCustomOrFallback(
                      customization.unit_price_color,
                      "var(--theme-text-secondary)"
                    ) 
                  }}
                >
                  {isPackage ? "سعر الحزمة" : "سعر الوحدة"}
                </div>
                <div className="flex items-baseline gap-2">
                  <div 
                    className="text-2xl font-black font-mono" 
                    style={{ 
                      color: getCustomOrFallback(
                        customization.unit_price_color || customization.price_color,
                        "var(--product-price-color, var(--theme-accent))"
                      ) 
                    }}
                  >
                    {unitFormatted.primary}
                  </div>
                  {hasVipDiscount && (
                    <span
                      className="text-xs line-through font-mono"
                      style={{ color: "var(--theme-text-muted, #71717A)" }}
                    >
                      {baseUnitFormatted.primary}
                    </span>
                  )}
                </div>
                {unitFormatted.secondary && (
                  <div
                    className="text-[11px] font-normal"
                    style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                  >
                    {unitFormatted.secondary}
                  </div>
                )}
              </div>

              <div
                className="text-left border-r pr-4"
                style={{ borderColor: "var(--theme-border, #3A3A3A)" }}
              >
                <div 
                  className="text-xs font-semibold" 
                  style={{ 
                    color: getCustomOrFallback(
                      customization.total_price_color || customization.price_color,
                      "var(--product-total-price-color, var(--theme-primary))"
                    ) 
                  }}
                >
                  المجموع الكلي
                </div>
                <div className="flex items-baseline justify-end gap-2">
                  {hasVipDiscount && (
                    <span
                      className="text-xs line-through font-mono"
                      style={{ color: "var(--theme-text-muted, #71717A)" }}
                    >
                      {baseTotalFormatted.primary}
                    </span>
                  )}
                  <div 
                    className="text-2xl font-black font-mono" 
                    style={{ 
                      color: getCustomOrFallback(
                        customization.total_price_color || customization.price_color,
                        "var(--product-total-price-color, var(--theme-primary))"
                      ) 
                    }}
                  >
                    {totalFormatted.primary}
                  </div>
                </div>
                {totalFormatted.secondary && (
                  <div
                    className="text-[11px] font-normal"
                    style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                  >
                    {totalFormatted.secondary}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "rating":
        return (
          <div
            key={sec.id}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-xs"
            style={{
              backgroundColor: "var(--theme-background)",
              borderColor: "var(--theme-border, #3A3A3A)",
            }}
          >
            <div className="flex" style={{ color: "var(--theme-primary)" }}>★★★★★</div>
            <span className="font-bold" style={{ color: "var(--theme-text-primary)" }}>4.9 / 5.0 ⭐</span>
            <span className="text-[11px]" style={{ color: "var(--theme-text-secondary)" }}>(بناءً على تقييمات العملاء الموثقة)</span>
          </div>
        );

      case "description":
        return (
          <div
            key={sec.id}
            className="p-4 rounded-2xl border text-xs leading-relaxed space-y-1"
            style={{
              backgroundColor: "var(--theme-background)",
              color: "var(--theme-text-secondary)",
              borderColor: "var(--theme-border, #3A3A3A)",
            }}
          >
            <div className="font-bold mb-1" style={{ color: "var(--theme-primary)" }}>
              {sec.title && sec.title !== "تفاصيل وملاحظات المنتج:" && sec.title !== "الوصف" ? sec.title : "تفاصيل وملاحظات المنتج:"}
            </div>
            <p className="whitespace-pre-line">{product.description || "لا توجد ملاحظات أو تفاصيل إضافية مخصصة لهذا المنتج."}</p>
          </div>
        );

      case "quantity":
        return (
          <div
            key={sec.id}
            className="space-y-3 pt-2 border-t"
            style={{ borderColor: "var(--theme-border, #3A3A3A)" }}
          >
            {isPackage ? (
              <div
                className="p-4 rounded-2xl transition border flex items-center justify-between shadow-inner"
                style={{
                  backgroundColor: getCustomOrFallback(
                    customization.quantity_input_bg || customization.player_id_input_bg,
                    "color-mix(in srgb, var(--theme-primary, #C8A45C) 10%, var(--theme-card, #2D2D2D))"
                  ),
                  borderColor: getCustomOrFallback(
                    customization.quantity_input_border || customization.player_id_input_border,
                    "var(--theme-border)"
                  ),
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">📦</span>
                  <div>
                    <div className="text-xs font-bold" style={{ color: getCustomOrFallback(customization.disclaimer_text_color, "var(--theme-text-primary)") }}>
                      حزمة واحدة (الحزمة كاملة)
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                    >
                      يتم شراء هذا المنتج كحزمة متكاملة دفعة واحدة
                    </div>
                  </div>
                </div>
                <div
                  className="text-xs font-extrabold px-3 py-1.5 rounded-xl border border-[var(--theme-border)]"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 15%, transparent)",
                    color: "var(--theme-primary)"
                  }}
                >
                  كمية ثابتة (1)
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-1">
                  <label
                    className="text-xs font-bold"
                    style={{
                      color: getCustomOrFallback(
                        customization.quantity_label_color,
                        "var(--theme-text-primary)"
                      )
                    }}
                  >
                    {sec.title || "حدد الكمية المطلوبة:"}
                  </label>
                  <span
                    className="text-[11px] font-semibold"
                    style={{
                      color: getCustomOrFallback(
                        customization.quantity_buttons_text || customization.quantity_button_color,
                        "var(--theme-primary)"
                      )
                    }}
                  >
                    (الحد الأدنى: {minQty.toLocaleString()})
                  </span>
                </div>

            {usesFixedQuantity ? (
              <div
                className="p-3.5 text-center transition"
                style={{
                  backgroundColor: getCustomOrFallback(
                    customization.quantity_input_bg || customization.player_id_input_bg,
                    "color-mix(in srgb, var(--theme-primary, #C8A45C) 10%, var(--theme-card, #2D2D2D))"
                  ),
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: getCustomOrFallback(
                    customization.quantity_input_border || customization.player_id_input_border,
                    "var(--theme-border)"
                  ),
                  borderRadius: "16px",
                }}
              >
                <div className="text-xs" style={{ color: getCustomOrFallback(customization.disclaimer_text_color, "var(--theme-text-secondary)") }}>كمية رسمية ثابتة لهذه الباقة</div>
                <div className="text-xl font-black mt-1" style={{ color: getCustomOrFallback(customization.quantity_input_text || customization.quantity_value_color, "var(--theme-text-primary)") }}>{minQty.toLocaleString()}</div>
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
                          ? getCustomOrFallback(
                              customization.purchase_button_bg || customization.quantity_button_color,
                              "var(--theme-primary)"
                            )
                          : getCustomOrFallback(
                              customization.quantity_input_bg || customization.player_id_input_bg,
                              "var(--theme-background)"
                            ),
                        color: isSelected
                          ? getCustomOrFallback(
                              customization.purchase_button_text,
                              "var(--theme-text-on-primary)"
                            )
                          : getCustomOrFallback(
                              customization.quantity_input_text || customization.quantity_value_color,
                              "var(--theme-text-primary)"
                            ),
                        borderColor: isSelected
                          ? getCustomOrFallback(
                              customization.purchase_button_bg || customization.quantity_button_color,
                              "var(--theme-primary)"
                            )
                          : getCustomOrFallback(
                              customization.quantity_input_border || customization.player_id_input_border,
                              "var(--theme-border)"
                            ),
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
                    backgroundColor: getCustomOrFallback(
                      customization.quantity_buttons_bg || customization.quantity_button_bg,
                      "var(--theme-card)"
                    ),
                    color: getCustomOrFallback(
                      customization.quantity_buttons_text || customization.quantity_button_color,
                      "var(--theme-primary)"
                    ),
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
                      const customBg = customization.quantity_buttons_bg || customization.quantity_button_bg;
                      if (customBg && !isDefaultGoldOrEmpty(customBg)) {
                        e.currentTarget.style.backgroundColor = `${customBg}CC`;
                      } else {
                        e.currentTarget.style.backgroundColor = "var(--theme-card-hover, var(--theme-card, #3D3D3D))";
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = getCustomOrFallback(
                      customization.quantity_buttons_bg || customization.quantity_button_bg,
                      "var(--theme-card)"
                    );
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
                    backgroundColor: getCustomOrFallback(
                      customization.quantity_input_bg || customization.player_id_input_bg,
                      "var(--theme-background)"
                    ),
                    color: getCustomOrFallback(
                      customization.quantity_input_text || customization.quantity_value_color,
                      "var(--theme-text-primary)"
                    ),
                    borderColor: getCustomOrFallback(
                      customization.quantity_input_border || customization.player_id_input_border,
                      "var(--theme-border)"
                    ),
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
                    const focusColor = getCustomOrFallback(
                      customization.quantity_input_focus_border || customization.player_id_input_focus,
                      "var(--theme-primary)"
                    );
                    e.target.style.borderColor = focusColor;
                    e.target.style.boxShadow = `0 0 0 3px ${focusColor}40`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = getCustomOrFallback(
                      customization.quantity_input_border || customization.player_id_input_border,
                      "var(--theme-border)"
                    );
                    e.target.style.boxShadow = "none";
                    commitQuantityInput();
                  }}
                />

                {/* Increment Button (+) */}
                <button
                  type="button"
                  onClick={handleIncrement}
                  style={{
                    backgroundColor: getCustomOrFallback(
                      customization.quantity_buttons_bg || customization.quantity_button_bg,
                      "var(--theme-card)"
                    ),
                    color: getCustomOrFallback(
                      customization.quantity_buttons_text || customization.quantity_button_color,
                      "var(--theme-primary)"
                    ),
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
                    const customBg = customization.quantity_buttons_bg || customization.quantity_button_bg;
                    if (customBg && !isDefaultGoldOrEmpty(customBg)) {
                      e.currentTarget.style.backgroundColor = `${customBg}CC`;
                    } else {
                      e.currentTarget.style.backgroundColor = "var(--theme-card-hover, var(--theme-card, #3D3D3D))";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = getCustomOrFallback(
                      customization.quantity_buttons_bg || customization.quantity_button_bg,
                      "var(--theme-card)"
                    );
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>
            )}
          </>
        )}

            {/* Dynamic Inputs or Fallback Account ID / Phone Number Inputs */}
            {dynamicParams.length > 0 ? (
              <div className="space-y-3 pt-2">
                {dynamicParams.map((param) => {
                  const cfg = getParamConfig(param);
                  const Icon = cfg.icon;
                  return (
                    <div key={param} className="space-y-1.5">
                      <label
                        className="text-xs font-bold block flex items-center justify-between"
                        style={{ color: getCustomOrFallback(customization.player_id_label_color, "var(--theme-text-primary)") }}
                      >
                        <span className="flex items-center gap-1.5">
                          <Icon size={14} style={{ color: getCustomOrFallback(customization.breadcrumb_active_color, "var(--theme-primary)") }} />
                          <span>{param} *</span>
                        </span>
                        <span className="text-[10px]" style={{ color: getCustomOrFallback(customization.breadcrumb_active_color, "var(--theme-primary)") }}>
                          {cfg.help}
                        </span>
                      </label>
                      <Input
                        type={cfg.type}
                        value={customFieldValues[param] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomFieldValues((prev) => ({ ...prev, [param]: val }));
                          if (cfg.type === "tel" || param.includes("هاتف") || param.includes("خط")) {
                            setPhoneNumber(val);
                          } else {
                            setAccountId(val);
                          }
                        }}
                        placeholder={cfg.placeholder}
                        className="h-13 rounded-2xl px-4 text-base font-mono transition-all"
                        style={{
                          backgroundColor: getCustomOrFallback(customization.player_id_input_bg, "var(--theme-input-bg, var(--theme-background, #1A1A1A))"),
                          borderColor: getCustomOrFallback(customization.player_id_input_border, "var(--theme-border, #3A3A3A)"),
                          color: getCustomOrFallback(customization.player_id_input_text, "var(--theme-text-primary, #FFFFFF)"),
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = getCustomOrFallback(customization.player_id_input_focus, "var(--theme-primary)");
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = getCustomOrFallback(customization.player_id_input_border, "var(--theme-border)");
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {(purchaseMode === "apps" || purchaseMode === "games") && (
                  <div className="pt-2">
                    <label className="text-xs font-bold mb-2 block flex items-center justify-between" style={{ color: getCustomOrFallback(customization.player_id_label_color, "var(--theme-text-primary)") }}>
                      <span>معرّف الحساب (Player ID) *</span>
                      <span className="text-[10px]" style={{ color: getCustomOrFallback(customization.breadcrumb_active_color, "var(--theme-primary)") }}>
                        {customization.direct_shipping_label || "مطلوب للشحن المباشر"}
                      </span>
                    </label>
                    <Input
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      placeholder="أدخل معرّف الحساب (مثال: 123456789)"
                      className="h-13 rounded-2xl px-4 text-base placeholder:text-[var(--theme-text-muted,#71717A)] font-mono transition-all"
                      style={{
                        backgroundColor: getCustomOrFallback(customization.player_id_input_bg, "var(--theme-input-bg, var(--theme-background, #1A1A1A))"),
                        borderColor: getCustomOrFallback(customization.player_id_input_border, "var(--theme-border, #3A3A3A)"),
                        color: getCustomOrFallback(customization.player_id_input_text, "var(--theme-text-primary, #FFFFFF)"),
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = getCustomOrFallback(customization.player_id_input_focus, "var(--theme-primary)");
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = getCustomOrFallback(customization.player_id_input_border, "var(--theme-border)");
                      }}
                    />
                  </div>
                )}

                {purchaseMode === "balance" && (
                  <div className="space-y-3 pt-2">
                    <div
                      className="rounded-2xl border px-4 py-2.5 font-bold text-xs flex items-center justify-between"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 15%, transparent)",
                        borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
                        color: "var(--theme-accent, #DFBD69)",
                      }}
                    >
                      <span>الكمية المحددة للشحن:</span>
                      <span className="font-mono text-base">{quantity} وحدة</span>
                    </div>
                    <div>
                      <label className="text-xs font-bold mb-2 block flex items-center justify-between" style={{ color: getCustomOrFallback(customization.player_id_label_color, "var(--theme-text-primary)") }}>
                        <span>رقم الخط المطلوب شحنه *</span>
                        <span className="text-[10px]" style={{ color: getCustomOrFallback(customization.breadcrumb_active_color, "var(--theme-primary)") }}>مثال: 09XXXXXXXX</span>
                      </label>
                      <Input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="أدخل رقم الخط (09XXXXXXXX)"
                        className="h-13 rounded-2xl px-4 text-base placeholder:text-[var(--theme-text-muted,#71717A)] font-mono transition-all"
                        style={{
                          backgroundColor: getCustomOrFallback(customization.player_id_input_bg, "var(--theme-input-bg, var(--theme-background, #1A1A1A))"),
                          borderColor: getCustomOrFallback(customization.player_id_input_border, "var(--theme-border, #3A3A3A)"),
                          color: getCustomOrFallback(customization.player_id_input_text, "var(--theme-text-primary, #FFFFFF)"),
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = getCustomOrFallback(customization.player_id_input_focus, "var(--theme-primary)");
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = getCustomOrFallback(customization.player_id_input_border, "var(--theme-border)");
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <p
              className="text-[11px] p-3 rounded-2xl flex items-center gap-2 font-medium"
              style={{
                backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 8%, var(--theme-card, #2D2D2D))",
                color: getCustomOrFallback(customization.disclaimer_text_color, "var(--theme-text-secondary, #D4D4D8)"),
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" style={{ color: getCustomOrFallback(customization.action_buttons_color, "var(--theme-primary)") }} />
              برجاء التأكد من صحة البيانات المدخلة قبل تأكيد عملية الشراء.
            </p>
          </div>
        );

      case "buy_now":
      case "add_to_cart":
        const btnTotalFormatted = formatPrice(totalUsd);
        return (
          <Button
            key={sec.id}
            onClick={handlePurchase}
            disabled={createOrder.isPending || !product.available}
            className="w-full h-15 rounded-2xl text-base sm:text-lg font-black shadow-xl transition transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: getCustomOrFallback(
                customization.purchase_button_bg || customization.button_color,
                "var(--theme-primary, #C8A45C)"
              ),
              color: getCustomOrFallback(
                customization.purchase_button_text || customization.button_text_color,
                "var(--theme-text-on-primary, var(--theme-background, #1A1A1A))"
              ),
              boxShadow: "0 8px 20px -5px color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
            }}
          >
            {createOrder.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                جاري تنفيذ الطلب وتوثيقه...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShoppingCart size={20} />
                {sec.button_text || "شراء الآن / تأكيد الشراء الفوري"} ({btnTotalFormatted})
              </span>
            )}
          </Button>
        );

      case "guarantees":
        return (
          <div
            key={sec.id}
            className="border rounded-3xl p-5 shadow-xl space-y-3.5"
            style={{
              backgroundColor: "var(--theme-card)",
              borderColor: "var(--theme-border, #3A3A3A)",
            }}
          >
            <h3
              className="text-xs font-bold flex items-center gap-2 border-b pb-2.5"
              style={{
                color: "var(--theme-accent)",
                borderColor: "var(--theme-border, #3A3A3A)",
              }}
            >
              <ShieldCheck size={16} style={{ color: "var(--theme-primary)" }} />
              {sec.title || "ضمانات وأمان الخدمة في المتجر"}
            </h3>

            <div className="space-y-2.5 text-xs">
              <div
                className="flex items-center gap-3 p-2.5 rounded-2xl border"
                style={{
                  backgroundColor: "var(--theme-background)",
                  borderColor: "var(--theme-border, #3A3A3A)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 15%, transparent)",
                    color: "var(--theme-primary)",
                  }}
                >
                  <Zap size={18} />
                </div>
                <div>
                  <div className="font-bold" style={{ color: "var(--theme-text-primary, #E4E4E7)" }}>
                    معالجة فورية وتلقائية ⚡
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--theme-text-muted, #9E9E9E)" }}>
                    يتم إرسال الشحن مباشرة بعد الشراء دون تأخير
                  </div>
                </div>
              </div>

              <div
                className="flex items-center gap-3 p-2.5 rounded-2xl border"
                style={{
                  backgroundColor: "var(--theme-background)",
                  borderColor: "var(--theme-border, #3A3A3A)",
                }}
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="font-bold" style={{ color: "var(--theme-text-primary, #E4E4E7)" }}>
                    ضمان آمن 100% 🔒
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--theme-text-muted, #9E9E9E)" }}>
                    طرق دفع موثوقة وشحن رسمي معتمد
                  </div>
                </div>
              </div>

              <div
                className="flex items-center gap-3 p-2.5 rounded-2xl border"
                style={{
                  backgroundColor: "var(--theme-background)",
                  borderColor: "var(--theme-border, #3A3A3A)",
                }}
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Headphones size={18} />
                </div>
                <div>
                  <div className="font-bold" style={{ color: "var(--theme-text-primary, #E4E4E7)" }}>
                    متابعة ودعم 24/7 🎧
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--theme-text-muted, #9E9E9E)" }}>
                    فريق الدعم الفني جاهز لمساعدتك في أي وقت
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "reviews":
        return (
          <div
            key={sec.id}
            className="border rounded-3xl p-6 shadow-xl space-y-4"
            style={{
              backgroundColor: "var(--theme-card)",
              borderColor: "var(--theme-border, #3A3A3A)",
            }}
          >
            <div
              className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: "var(--theme-border, #3A3A3A)" }}
            >
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--theme-accent)" }}>
                <Star size={18} style={{ color: "var(--theme-primary)", fill: "var(--theme-primary)" }} />
                {sec.title || "تقييمات وآراء العملاء على الخدمة"}
              </h3>
              <span
                className="text-xs font-mono font-bold px-2.5 py-1 rounded-full border"
                style={{
                  color: "var(--theme-primary)",
                  backgroundColor: "var(--theme-background)",
                  borderColor: "var(--theme-border, #3A3A3A)",
                }}
              >
                4.9 / 5.0 ⭐
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div
                className="p-3 rounded-2xl border space-y-1"
                style={{
                  backgroundColor: "var(--theme-background)",
                  borderColor: "var(--theme-border, #3A3A3A)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold" style={{ color: "var(--theme-text-primary, #E4E4E7)" }}>
                    أحمد م.
                  </span>
                  <div className="flex" style={{ color: "var(--theme-primary)" }}>★★★★★</div>
                </div>
                <p className="text-[11px]" style={{ color: "var(--theme-text-muted, #9E9E9E)" }}>
                  سرعة تنفيذ مذهلة! وصل الشحن للحساب خلال أقل من 30 ثانية. شكراً لكم.
                </p>
              </div>

              <div
                className="p-3 rounded-2xl border space-y-1"
                style={{
                  backgroundColor: "var(--theme-background)",
                  borderColor: "var(--theme-border, #3A3A3A)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold" style={{ color: "var(--theme-text-primary, #E4E4E7)" }}>
                    خالد ع.
                  </span>
                  <div className="flex" style={{ color: "var(--theme-primary)" }}>★★★★★</div>
                </div>
                <p className="text-[11px]" style={{ color: "var(--theme-text-muted, #9E9E9E)" }}>
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
              <h2 className="text-lg font-black flex items-center gap-2" style={{ color: "var(--theme-accent)" }}>
                <Sparkles size={20} style={{ color: "var(--theme-primary)" }} />
                {sec.title || "منتجات ذات صلة بنفس القسم"}
              </h2>
              <Link href={`/categories/${product.categoryId}`}>
                <span className="text-xs font-bold hover:underline cursor-pointer" style={{ color: "var(--theme-primary)" }}>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold hover:opacity-80 transition cursor-pointer"
              style={{
                backgroundColor: "var(--theme-background)",
                borderColor: "var(--theme-border, #3A3A3A)",
                color: "var(--theme-text-secondary, #D4D4D8)",
              }}
            >
              <Heart
                size={16}
                className={isFavorite ? "fill-current" : ""}
                style={{ color: isFavorite ? "var(--theme-primary)" : "currentColor" }}
              />
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold hover:opacity-80 transition cursor-pointer"
              style={{
                backgroundColor: "var(--theme-background)",
                borderColor: "var(--theme-border, #3A3A3A)",
                color: "var(--theme-text-secondary, #D4D4D8)",
              }}
            >
              <Share2 size={16} />
              <span>مشاركة</span>
            </button>
          </div>
        );

      case "specifications":
        return (
          <div
            key={sec.id}
            className="p-4 rounded-2xl border text-xs space-y-2"
            style={{
              backgroundColor: "var(--theme-background, #1A1A1A)",
              borderColor: "var(--theme-border, #3A3A3A)",
            }}
          >
            <div className="font-bold" style={{ color: "var(--theme-accent, #FDE68A)" }}>
              {sec.title || "المواصفات والتفاصيل التقنية"}
            </div>
            <div
              className="grid grid-cols-2 gap-2 text-[11px]"
              style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
            >
              <div>
                نوع الخدمة:{" "}
                <span className="font-mono" style={{ color: "var(--theme-text-primary, #FFFFFF)" }}>
                  {product.productType || "عام"}
                </span>
              </div>
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
      <div className="min-h-screen pb-24 animate-in fade-in duration-300" style={customBgStyle} dir="rtl">
        {/* Top Floating Control Bar */}
        <div className="p-4 flex items-center justify-between max-w-4xl mx-auto">
          <Link href={`/categories/${product.categoryId}`}>
            <div
              className="border px-3 py-1.5 rounded-xl cursor-pointer hover:opacity-90 transition flex items-center gap-1 text-xs font-bold"
              style={{
                backgroundColor: "var(--theme-card, #2D2D2D)",
                borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
                color: "var(--theme-primary, #C8A45C)",
              }}
            >
              <ChevronRight className="w-4 h-4" />
              <span>الرجوع للتصنيف</span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setLegacyOverride(false)}
            className="text-xs border px-3 py-1 rounded-xl flex items-center gap-1.5 cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 20%, transparent)",
              borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
              color: "var(--theme-accent, #FDE68A)",
            }}
          >
            <LayoutGrid size={14} />
            <span>التبديل إلى التصميم المطور الحديث</span>
          </button>
        </div>

        {/* Big Banner Container */}
        <div
          className="relative w-full h-64 rounded-b-[2rem] overflow-hidden shadow-2xl border-b"
          style={{
            backgroundColor: "var(--theme-card, #2D2D2D)",
            borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 30%, transparent)",
          }}
        >
          <div className="absolute top-4 left-4 z-20">
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={favLoading}
              className="bg-black/60 backdrop-blur-md p-2.5 rounded-full cursor-pointer hover:bg-black/80 transition-all text-white border active:scale-95"
              style={{
                borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
              }}
            >
              <Heart
                size={20}
                className={`transition-colors ${isFavorite ? "fill-current" : "text-white"}`}
                style={isFavorite ? { color: "var(--theme-primary, #C8A45C)" } : undefined}
              />
            </button>
          </div>
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: "var(--theme-background, #1A1A1A)" }}
            >
              <ShoppingCart
                className="w-16 h-16"
                style={{ color: "color-mix(in srgb, var(--theme-primary, #C8A45C) 50%, transparent)" }}
              />
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, var(--theme-background, #1A1A1A), color-mix(in srgb, var(--theme-background, #1A1A1A) 30%, transparent), transparent)",
            }}
          />
        </div>

        <div className="px-5 -mt-6 relative z-10 max-w-2xl mx-auto space-y-4">
          <h1
            className="text-2xl font-black leading-tight mb-1"
            style={{ color: "var(--theme-text-primary, #FFFFFF)" }}
          >
            {product.name}
          </h1>
          <div
            className="text-xs font-semibold"
            style={{ color: "var(--theme-primary, #C8A45C)" }}
          >
            {product.categoryName}
          </div>

          <div
            className="space-y-6 border p-5 rounded-3xl shadow-xl"
            style={{
              backgroundColor: "var(--product-card-color, var(--theme-card))",
              borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 35%, transparent)",
            }}
          >
            {/* Purchase Form Elements */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label
                  className="text-sm font-bold"
                  style={{ color: "var(--theme-text-primary, #FFFFFF)" }}
                >
                  {isPackage ? "نوع الطلب" : "الكمية المطلوبة"}
                </label>
                {!isPackage && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--theme-primary, #C8A45C)" }}
                  >
                    (الحد الأدنى: {minQty.toLocaleString()})
                  </span>
                )}
              </div>

              {isPackage ? (
                <div
                  className="rounded-2xl border px-4 py-4 text-center"
                  style={{
                    borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 50%, transparent)",
                    backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 10%, transparent)",
                  }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: "var(--theme-text-secondary, #D4D4D8)" }}
                  >
                    📦 حزمة واحدة (الحزمة كاملة)
                  </div>
                  <div
                    className="text-xl font-black"
                    style={{ color: "var(--theme-accent, #FDE68A)" }}
                  >
                    كمية ثابتة (1)
                  </div>
                </div>
              ) : usesFixedQuantity ? (
                <div
                  className="rounded-2xl border px-4 py-4 text-center"
                  style={{
                    borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 50%, transparent)",
                    backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 10%, transparent)",
                  }}
                >
                  <div
                    className="text-xs mb-1"
                    style={{ color: "var(--theme-text-secondary, #D4D4D8)" }}
                  >
                    كمية رسمية ثابتة من المزود
                  </div>
                  <div
                    className="text-xl font-black"
                    style={{ color: "var(--theme-accent, #FDE68A)" }}
                  >
                    {minQty.toLocaleString()}
                  </div>
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
                      className="rounded-2xl border px-3 py-3 text-sm font-black transition cursor-pointer"
                      style={
                        quantity === value
                          ? {
                              borderColor: "var(--theme-primary, #C8A45C)",
                              backgroundColor: "var(--theme-primary, #C8A45C)",
                              color: "var(--theme-background, #1A1A1A)",
                            }
                          : {
                              borderColor: "var(--theme-border, #4B5563)",
                              backgroundColor: "var(--theme-background, #1A1A1A)",
                              color: "var(--theme-text-primary, #FFFFFF)",
                            }
                      }
                    >
                      {value.toLocaleString()}
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  className="border p-2 rounded-2xl transition"
                  style={{
                    backgroundColor: "var(--theme-background, #1A1A1A)",
                    borderColor: "var(--theme-border, #4B5563)",
                  }}
                >
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

            {dynamicParams.length > 0 ? (
              <div className="space-y-3">
                {dynamicParams.map((param) => {
                  const cfg = getParamConfig(param);
                  const Icon = cfg.icon;
                  return (
                    <div key={param} className="space-y-1.5">
                      <label
                        className="text-sm font-bold mb-1 flex items-center justify-between"
                        style={{ color: "var(--theme-text-primary, #FFFFFF)" }}
                      >
                        <span className="flex items-center gap-1.5">
                          <Icon size={15} style={{ color: "var(--theme-primary, #C8A45C)" }} />
                          <span>{param} *</span>
                        </span>
                        <span className="text-xs font-normal" style={{ color: "var(--theme-primary, #C8A45C)" }}>{cfg.help}</span>
                      </label>
                      <Input
                        type={cfg.type}
                        value={customFieldValues[param] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomFieldValues((prev) => ({ ...prev, [param]: val }));
                          if (cfg.type === "tel" || param.includes("هاتف") || param.includes("خط")) {
                            setPhoneNumber(val);
                          } else {
                            setAccountId(val);
                          }
                        }}
                        placeholder={cfg.placeholder}
                        className="h-12 rounded-2xl px-4 text-base"
                        style={{
                          backgroundColor: "var(--theme-input-bg, #3D3D3D)",
                          borderColor: "var(--theme-border, #4B5563)",
                          color: "var(--theme-text-primary, #FFFFFF)",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {(purchaseMode === "apps" || purchaseMode === "games") && (
                  <div>
                    <label className="text-sm font-bold mb-2 block" style={{ color: "var(--theme-text-primary, #FFFFFF)" }}>معرّف الحساب (ID) *</label>
                    <Input
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      placeholder="أدخل معرّف الحساب (Player ID)"
                      className="h-12 bg-[var(--theme-input-bg,var(--theme-background,#1A1A1A))] border-[var(--theme-border,#3A3A3A)] text-[var(--theme-text-primary,#FFFFFF)] rounded-2xl px-4 focus-visible:ring-[var(--theme-primary,#C8A45C)] focus-visible:border-[var(--theme-primary,#C8A45C)] text-base placeholder:text-[var(--theme-text-muted,#9E9E9E)]"
                    />
                  </div>
                )}

                {purchaseMode === "balance" && (
                  <div className="space-y-3">
                    <div
                      className="rounded-2xl border px-4 py-3 font-bold text-sm"
                      style={{
                        borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 40%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 10%, transparent)",
                        color: "var(--theme-accent, #FDE68A)",
                      }}
                    >
                      الكمية المحددة: {quantity} وحدة
                    </div>
                    <div>
                      <label className="text-sm font-bold mb-2 block" style={{ color: "var(--theme-text-primary, #FFFFFF)" }}>رقم الخط *</label>
                      <Input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="09XXXXXXXX"
                        className="h-12 bg-[var(--theme-input-bg,var(--theme-background,#1A1A1A))] border-[var(--theme-border,#3A3A3A)] text-[var(--theme-text-primary,#FFFFFF)] rounded-2xl px-4 focus-visible:ring-[var(--theme-primary,#C8A45C)] focus-visible:border-[var(--theme-primary,#C8A45C)] text-base placeholder:text-[var(--theme-text-muted,#9E9E9E)]"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div
              className="rounded-2xl border p-4 text-center space-y-2"
              style={{
                backgroundColor: "var(--theme-background, #1A1A1A)",
                borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 30%, transparent)",
              }}
            >
              {hasVipDiscount && (
                <div
                  className="flex items-center justify-center gap-1.5 text-xs font-bold py-1 px-3 rounded-full border mx-auto w-fit"
                  style={{
                    color: vipBadgeColor,
                    backgroundColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 15%, transparent)",
                    borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 30%, transparent)",
                  }}
                >
                  <Crown size={14} />
                  <span>خصم {vipBadgeName || "VIP"} ({vipDiscountPercent}%)</span>
                  {totalSavingsUsd > 0 && <span className="text-emerald-400 font-mono">وفرت {formatPrice(totalSavingsUsd)}</span>}
                </div>
              )}
              <div
                className="text-xs font-semibold"
                style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
              >
                السعر الإجمالي
              </div>
              <div className="flex items-baseline justify-center gap-2">
                {hasVipDiscount && (
                  <span
                    className="text-sm line-through font-mono"
                    style={{ color: "var(--theme-text-muted, #71717A)" }}
                  >
                    {formatPrice(baseTotalUsd)}
                  </span>
                )}
                <div
                  className="text-3xl font-black"
                  style={{ color: "var(--theme-accent, #FDE68A)" }}
                >
                  {formatPrice(totalUsd)}
                </div>
              </div>
              {formatPriceWithSyp(totalUsd).secondary && (
                <div
                  className="text-xs font-medium"
                  style={{ color: "var(--theme-text-muted, #9E9E9E)" }}
                >
                  {formatPriceWithSyp(totalUsd).secondary}
                </div>
              )}
            </div>

            <Button
              onClick={handlePurchase}
              disabled={createOrder.isPending || !product.available}
              className="w-full h-14 rounded-2xl text-base font-black bg-[var(--theme-button-bg,var(--theme-primary,#C8A45C))] hover:opacity-90 text-[var(--theme-button-text,var(--theme-background,#1A1A1A))] shadow-lg transition cursor-pointer"
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
      className="min-h-screen pb-24 transition-colors duration-300 animate-in fade-in duration-500"
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
              className="absolute -top-12 left-0 p-2 text-white hover:text-[var(--theme-primary)] bg-white/10 rounded-full transition cursor-pointer"
            >
              <X size={24} />
            </button>
            <img
              src={product.image}
              alt={product.name}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border-2 shadow-2xl"
              style={{
                borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 50%, transparent)",
              }}
            />
            <p
              className="text-xs mt-3 font-semibold"
              style={{ color: "var(--theme-text-secondary, #D4D4D8)" }}
            >
              {product.name}
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-theme pt-4 space-y-6">
        {/* Top Breadcrumbs & Control Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-lg"
          style={{
            backgroundColor: "var(--theme-card)",
            borderColor: "var(--theme-border, #3A3A3A)",
          }}
        >
          <div className="flex items-center gap-2 text-xs">
            <Link href="/">
              <span
                className="hover:opacity-80 transition cursor-pointer font-medium"
                style={{ color: getCustomOrFallback(customization.breadcrumb_text_color, "var(--theme-text-secondary)") }}
              >
                الرئيسية
              </span>
            </Link>
            <ChevronRight size={14} style={{ color: getCustomOrFallback(customization.breadcrumb_text_color, "var(--theme-text-secondary)") }} />
            <Link href={`/categories/${product.categoryId}`}>
              <span className="font-bold transition cursor-pointer" style={{ color: getCustomOrFallback(customization.breadcrumb_active_color, "var(--theme-primary)") }}>
                {product.categoryName}
              </span>
            </Link>
            <ChevronRight size={14} style={{ color: getCustomOrFallback(customization.breadcrumb_text_color, "var(--theme-text-secondary)") }} />
            <span className="font-bold truncate max-w-[180px] sm:max-w-xs" style={{ color: getCustomOrFallback(customization.breadcrumb_active_color, "var(--theme-text-primary)") }}>{product.name}</span>
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
              className="p-2 rounded-xl border transition cursor-pointer text-xs flex items-center gap-1.5"
              style={{
                color: getCustomOrFallback(customization.action_buttons_color, "var(--theme-primary)"),
                backgroundColor: customization.action_buttons_bg === "transparent" ? "var(--theme-background)" : getCustomOrFallback(customization.action_buttons_bg, "var(--theme-background)"),
                borderColor: "var(--theme-border, #3A3A3A)",
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
              className="p-2 rounded-xl border transition cursor-pointer text-xs flex items-center gap-1.5"
              style={{
                color: getCustomOrFallback(customization.action_buttons_color, "var(--theme-primary)"),
                backgroundColor: customization.action_buttons_bg === "transparent" ? "var(--theme-background)" : getCustomOrFallback(customization.action_buttons_bg, "var(--theme-background)"),
                borderColor: "var(--theme-border, #3A3A3A)",
              }}
              title="إضافة للمفضلة"
            >
              <Heart
                size={16}
                className={isFavorite ? "fill-current" : ""}
                style={{ color: isFavorite ? "var(--theme-primary)" : "currentColor" }}
              />
              <span className="hidden sm:inline">{isFavorite ? "المفضلة" : "إضافة للمفضلة"}</span>
            </button>

            {/* Legacy Toggle */}
            <button
              type="button"
              onClick={() => setLegacyOverride(true)}
              className="p-2 rounded-xl border transition cursor-pointer text-xs flex items-center gap-1"
              style={{
                color: getCustomOrFallback(customization.action_buttons_color, "var(--theme-text-secondary)"),
                backgroundColor: customization.action_buttons_bg === "transparent" ? "var(--theme-background)" : getCustomOrFallback(customization.action_buttons_bg, "var(--theme-background)"),
                borderColor: "var(--theme-border, #3A3A3A)",
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
              className="border rounded-3xl p-theme shadow-2xl space-y-6"
              style={{
                backgroundColor: getCustomOrFallback(customization.info_box_bg_color, "var(--product-card-color, var(--theme-card))"),
                borderColor: "var(--theme-border, #3A3A3A)",
              }}
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
