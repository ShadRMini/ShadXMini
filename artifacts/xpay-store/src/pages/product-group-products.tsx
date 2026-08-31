import { Link, useRoute } from "wouter";
import { ChevronRight, PackageOpen, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicJson } from "@/lib/public-api";
import ProductCard from "@/components/product/ProductCard";
import { PRODUCT_GRID_COLS, getProductGridClass } from "@/lib/grid-config";

type ProductItem = {
  id: string;
  name: string;
  categoryId: string;
  groupId?: string;
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
};

function formatTotalUsdPrice(product: ProductItem) {
  const apiTotal = Number(product.minTotalUsd);
  if (Number.isFinite(apiTotal) && apiTotal >= 0) return `$${apiTotal.toFixed(5)}`;
  const unitPrice = Number(product.priceUsd || 0);
  const minQty = Number(product.minQty || 1);
  const total = unitPrice * (Number.isFinite(minQty) && minQty > 0 ? minQty : 1);
  return `$${Number.isFinite(total) ? total.toFixed(5) : "0.00000"}`;
}

export default function ProductGroupProducts() {
  const [, params] = useRoute("/groups/:id");
  const groupId = params?.id;
  const [group, setGroup] = useState<ProductGroupItem | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      getPublicJson<ProductGroupItem[]>(`/product-groups`),
      getPublicJson<ProductItem[]>(`/products?groupId=${encodeURIComponent(groupId)}`),
    ])
      .then(([groups, rows]) => {
        if (cancelled) return;
        setGroup(groups.find((item) => item.id === groupId) || null);
        setProducts(rows);
      })
      .catch((error) => {
        console.error("Group products load failed:", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const sortedProducts = useMemo(() => products, [products]);

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white flex flex-col animate-in slide-in-from-right-4 duration-300" dir="rtl">
      <div className="sticky top-0 z-10 bg-[#1A1A1A]/90 backdrop-blur-xl border-b border-[#C8A45C]/30 px-4 py-3 flex items-center gap-3">
        <Link href={group ? `/categories/${group.categoryId}` : "/"}>
          <div className="bg-[#2D2D2D] p-2 rounded-full cursor-pointer hover:bg-[#3D3D3D] border border-[#C8A45C]/30 hover:border-[#C8A45C] transition-colors">
            <ChevronRight className="w-5 h-5 text-[#C8A45C]" />
          </div>
        </Link>
        <div className="flex-1">
          <div className="text-xs text-[#C8A45C]">اختر النوع أو الباقة</div>
          <div className="text-lg font-black text-[#FDE68A]">{group?.name || "مجموعة المنتجات"}</div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className={getProductGridClass(PRODUCT_GRID_COLS)}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-full aspect-square rounded-2xl bg-zinc-800" />
                <Skeleton className="h-3.5 w-3/4 mx-auto bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          <div className={getProductGridClass(PRODUCT_GRID_COLS)}>
            {sortedProducts.map((product, i) => (
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
            <p className="text-white font-bold">لا توجد منتجات داخل هذه المجموعة</p>
          </div>
        )}
      </div>
    </div>
  );
}
