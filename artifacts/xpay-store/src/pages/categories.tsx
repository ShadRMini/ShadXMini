import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { Link, useRoute } from "wouter";
import { ChevronRight, Search, PackageOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { getPublicJson } from "@/lib/public-api";
import ProductCard from "@/components/product/ProductCard";
import { PRODUCT_GRID_COLS, getProductGridClass } from "@/lib/grid-config";

type ProductItem = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  image: string;
  priceUsd: number;
  minTotalUsd?: number;
  minQty?: number;
};

type ProductGroupItem = {
  id: string;
  categoryId: string;
  name: string;
  image: string;
  imageVersion?: string;
  productCount: number;
};

function withImageVersion(url: string, version: string) {
  const cleanUrl = String(url || "").trim();
  if (!cleanUrl || cleanUrl.startsWith("data:") || cleanUrl.startsWith("blob:")) return cleanUrl;
  return `${cleanUrl}${cleanUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

function getDefaultQuantity(product: ProductItem) {
  const minQty = Number(product.minQty || 1);
  return Number.isFinite(minQty) && minQty > 0 ? minQty : 1;
}

function formatTotalUsdPrice(product: ProductItem) {
  const apiTotal = Number(product.minTotalUsd);
  if (Number.isFinite(apiTotal) && apiTotal >= 0) return `$${apiTotal.toFixed(5)}`;

  const unitPrice = Number(product.priceUsd || 0);
  const total = unitPrice * getDefaultQuantity(product);
  if (!Number.isFinite(total)) return "$0.00000";
  return `$${total.toFixed(5)}`;
}

export default function Categories() {
  const [, params] = useRoute("/categories/:id");
  const categoryId = params?.id;
  const [search, setSearch] = useState("");
  const [fallbackProducts, setFallbackProducts] = useState<ProductItem[] | null>(null);
  const [groups, setGroups] = useState<ProductGroupItem[]>([]);

  const { data: products, isLoading } = useListProducts(
    { categoryId, q: search || undefined },
    { query: { enabled: !!categoryId, queryKey: getListProductsQueryKey({ categoryId, q: search || undefined }) } }
  );

  useEffect(() => {
    if (!categoryId) return;

    let cancelled = false;
    const query = search.trim();
    const path = `/products?categoryId=${encodeURIComponent(categoryId)}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
    Promise.all([
      getPublicJson<ProductItem[]>(path),
      getPublicJson<ProductGroupItem[]>(`/product-groups?categoryId=${encodeURIComponent(categoryId)}`),
    ])
      .then(([rows, groupRows]) => {
        if (!cancelled) {
          setFallbackProducts(rows);
          setGroups(query ? [] : groupRows);
        }
      })
      .catch((error) => {
        console.error("Category content load failed:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId, search]);

  const visibleProducts = useMemo(
    () => (fallbackProducts && fallbackProducts.length > 0 ? fallbackProducts : products) || [],
    [fallbackProducts, products],
  );

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white flex flex-col animate-in slide-in-from-right-4 duration-300" dir="rtl">
      <div className="sticky top-0 z-10 bg-[#1A1A1A]/90 backdrop-blur-xl border-b border-[#C8A45C]/30 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <div className="bg-[#2D2D2D] p-2 rounded-full cursor-pointer hover:bg-[#3D3D3D] border border-[#C8A45C]/30 hover:border-[#C8A45C] transition-all">
            <ChevronRight className="w-5 h-5 text-[#C8A45C]" />
          </div>
        </Link>
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن منتج أو باقة..."
              className="pl-3 pr-9 h-10 bg-[#2D2D2D] border-[#C8A45C]/30 text-white rounded-full text-sm focus-visible:ring-[#C8A45C] focus-visible:border-[#C8A45C]"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-5xl mx-auto w-full">
        {!search && groups.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 text-sm font-black text-[#FDE68A]">الخيارات والمجموعات المتاحة</div>
            <div className={getProductGridClass(PRODUCT_GRID_COLS)}>
              {groups.map((group, i) => (
                <ProductCard
                  key={group.id}
                  id={group.id}
                  name={group.name}
                  image={group.image}
                  imageVersion={group.imageVersion}
                  productCount={group.productCount}
                  href={`/groups/${group.id}`}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {isLoading && visibleProducts.length === 0 ? (
          <div className={getProductGridClass(PRODUCT_GRID_COLS)}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-full aspect-square rounded-2xl bg-zinc-800" />
                <Skeleton className="h-3.5 w-3/4 mx-auto bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : visibleProducts.length > 0 ? (
          <div className={getProductGridClass(PRODUCT_GRID_COLS)}>
            {visibleProducts.map((product, i) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                image={product.image}
                priceUsd={product.priceUsd}
                minTotalUsd={product.minTotalUsd}
                minQty={product.minQty}
                categoryName={product.categoryName}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-[#2D2D2D] rounded-2xl flex items-center justify-center mb-4 border border-[#C8A45C]/30 text-[#C8A45C]">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-white font-bold">لا توجد منتجات مطابقة</p>
            <p className="text-xs text-zinc-400 mt-1">جرّب البحث بكلمات أخرى</p>
          </div>
        )}
      </div>
    </div>
  );
}
