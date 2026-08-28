import { useGetProduct, getGetProductQueryKey, useCreateOrder } from "@workspace/api-client-react";
import { useRoute, useLocation, Link } from "wouter";
import { ChevronRight, ShoppingCart, AlertCircle, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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

export default function ProductDetail() {
  const [, params] = useRoute("/products/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useGetProduct(id || "", {
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id || "") },
  });

  const createOrder = useCreateOrder();
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [accountId, setAccountId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

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
        toast.success(isFavorite ? "تمت إزالة المنتج من المفضلة" : "تمت إضافة المنتج للمفضلة");
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
      <div className="min-h-screen bg-background">
        <Skeleton className="w-full h-64 rounded-b-3xl" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="p-4 text-center mt-20">المنتج غير موجود</div>;
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

  const handlePurchase = () => {
    const finalQuantity = commitQuantityInput();

    if (purchaseMode === "balance") {
      if (!phoneNumber.trim()) {
        toast.error("يرجى إدخال رقم الخط");
        return;
      }
    } else if (!accountId.trim()) {
      toast.error("يرجى إدخال معرف المستخدم (ID)");
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
          toast.success("تم إرسال الطلب إلى API المزود بنجاح");
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

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white pb-24 animate-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="relative w-full h-64 bg-[#2D2D2D] rounded-b-[2rem] overflow-hidden shadow-2xl border-b border-[#C8A45C]/30">
        <div className="absolute top-4 right-4 z-20">
          <Link href={`/categories/${product.categoryId}`}>
            <div className="bg-black/60 backdrop-blur-md p-2 rounded-full cursor-pointer hover:bg-black/80 transition-colors text-[#C8A45C] border border-[#C8A45C]/40">
              <ChevronRight className="w-6 h-6" />
            </div>
          </Link>
        </div>
        <div className="absolute top-4 left-4 z-20">
          <button
            type="button"
            onClick={toggleFavorite}
            disabled={favLoading}
            className="bg-black/60 backdrop-blur-md p-2.5 rounded-full cursor-pointer hover:bg-black/80 transition-all text-white border border-[#C8A45C]/40 active:scale-95"
            aria-label="إضافة للمفضلة"
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

      <div className="px-5 -mt-6 relative z-10 max-w-2xl mx-auto">
        <h1 className="text-2xl font-black text-white leading-tight mb-1">{product.name}</h1>
        <div className="text-xs text-[#C8A45C] font-semibold mb-4">{product.categoryName}</div>

        <div className="space-y-6 bg-[#2D2D2D] border border-[#C8A45C]/35 p-5 rounded-3xl shadow-xl">
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

          {(purchaseMode === "apps" || purchaseMode === "games") && (
            <p className="text-xs text-[#FDE68A] flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 text-[#C8A45C] shrink-0" />
              تأكد من صحة الـ ID قبل تنفيذ الشراء ليتم الشحن فورياً.
            </p>
          )}

          <div className="h-px w-full bg-zinc-700/60" />

          {(purchaseMode === "apps" || purchaseMode === "games") && (
            <div className="rounded-2xl bg-[#1A1A1A] border border-[#C8A45C]/30 p-4 text-center">
              <div className="text-xs text-zinc-400 font-semibold">السعر الإجمالي</div>
              <div className="text-3xl font-black text-[#FDE68A] mt-1">${totalUsd.toFixed(5)}</div>
            </div>
          )}

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
