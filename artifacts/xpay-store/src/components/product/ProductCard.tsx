import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { PackageOpen, Sparkles, ShoppingBag } from "lucide-react";

export interface ProductCardProps {
  id: string | number;
  name: string;
  image?: string;
  imageVersion?: string;
  priceUsd?: number | string;
  minTotalUsd?: number | string;
  minQty?: number;
  categoryName?: string;
  productCount?: number;
  index?: number;
  href?: string;
}

function withImageVersion(url: string, version: string): string {
  const cleanUrl = String(url || "").trim();
  if (!cleanUrl || cleanUrl.startsWith("data:") || cleanUrl.startsWith("blob:")) return cleanUrl;
  const separator = cleanUrl.includes("?") ? "&" : "?";
  return `${cleanUrl}${separator}v=${encodeURIComponent(version)}`;
}

function formatPrice(priceUsd?: number | string, minTotalUsd?: number | string, minQty?: number): string {
  const apiTotal = Number(minTotalUsd);
  if (Number.isFinite(apiTotal) && apiTotal >= 0) return `$${apiTotal.toFixed(2)}`;

  const unitPrice = Number(priceUsd || 0);
  const qty = Number(minQty || 1);
  const total = unitPrice * (qty > 0 ? qty : 1);
  return Number.isFinite(total) ? `$${total.toFixed(2)}` : "$0.00";
}

export default function ProductCard({
  id,
  name,
  image,
  imageVersion,
  priceUsd,
  minTotalUsd,
  minQty = 1,
  categoryName,
  productCount,
  index = 0,
  href,
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const targetLink = href || `/products/${id}`;
  const finalImageUrl = image ? withImageVersion(image, imageVersion || `${id}-${image}`) : "";
  const formattedPrice = formatPrice(priceUsd, minTotalUsd, minQty);

  return (
    <Link href={targetLink}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.03, duration: 0.25 }}
        className="w-full flex flex-col items-center gap-2 cursor-pointer group select-none"
      >
        {/* 1:1 Aspect Ratio Square Card */}
        <div className="w-full aspect-square rounded-2xl bg-[#1A1A1A] border border-[#C8A45C]/30 shadow-md group-hover:border-[#C8A45C] group-hover:shadow-[0_0_15px_rgba(200,164,92,0.25)] transition-all duration-300 overflow-hidden relative flex items-center justify-center">
          {!imgError && finalImageUrl ? (
            <img
              src={finalImageUrl}
              alt={name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 will-change-transform"
            />
          ) : (
            /* Elegant Placeholder when image is missing or loading fails */
            <div className="w-full h-full bg-gradient-to-br from-[#241D12] via-[#1A1A1A] to-[#12100C] border border-[#C8A45C]/20 flex flex-col items-center justify-center p-3 text-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
              <div className="w-10 h-10 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C] mb-2 shadow-xs">
                <PackageOpen size={20} />
              </div>
              <span className="text-xs font-bold text-[#FDE68A] line-clamp-2 leading-tight px-1">
                {name}
              </span>
            </div>
          )}

          {/* Depth Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-60 group-hover:opacity-40 transition-opacity pointer-events-none" />

          {/* Category Tag Badge */}
          {categoryName && (
            <span className="absolute top-2 right-2 text-[9px] font-bold bg-[#1A1A1A]/85 text-[#C8A45C] px-2 py-0.5 rounded-lg border border-[#C8A45C]/30 shadow-xs pointer-events-none backdrop-blur-xs">
              {categoryName}
            </span>
          )}

          {/* Product Count Badge (for groups) */}
          {productCount !== undefined && productCount > 0 && (
            <span className="absolute top-2 left-2 text-[9px] font-bold bg-[#1A1A1A]/85 text-[#FDE68A] px-2 py-0.5 rounded-lg border border-[#C8A45C]/30 shadow-xs pointer-events-none">
              {productCount} منتج
            </span>
          )}

          {/* Bottom Floating Price Badge if price provided */}
          {priceUsd !== undefined && (
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
              <span className="text-[10px] sm:text-xs font-black text-[#FDE68A] bg-[#1A1A1A]/90 px-2 py-0.5 rounded-lg border border-[#C8A45C]/40 shadow-xs">
                {formattedPrice}
              </span>
            </div>
          )}
        </div>

        {/* Product / Item Title Below Card */}
        <div className="w-full text-center px-1">
          <h3 className="text-xs font-bold text-zinc-200 group-hover:text-[#FDE68A] transition-colors leading-tight line-clamp-1">
            {name}
          </h3>
        </div>
      </motion.div>
    </Link>
  );
}
