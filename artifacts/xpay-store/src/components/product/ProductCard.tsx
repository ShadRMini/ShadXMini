import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { PackageOpen, Sparkles, ShoppingBag, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import { useCurrency } from "@/lib/currency-context";
import LoginRequiredModal from "@/components/LoginRequiredModal";

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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { user, isAuthenticated, isGuest } = useAuth();
  const storeSettings = useStoreSettings();
  const { formatPrice } = useCurrency();

  const targetLink = href || `/products/${id}`;
  const finalImageUrl = image ? withImageVersion(image, imageVersion || `${id}-${image}`) : "";

  // Compute effective USD price for minimum quantity or explicit min total
  const rawApiTotal = Number(minTotalUsd);
  const rawUnitPrice = Number(priceUsd || 0);
  const effectiveQty = Number(minQty || 1);
  const effectiveUsd = Number.isFinite(rawApiTotal) && rawApiTotal >= 0
    ? rawApiTotal
    : rawUnitPrice * (effectiveQty > 0 ? effectiveQty : 1);

  const formattedPrice = formatPrice(effectiveUsd);

  const handleClick = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      e.stopPropagation();
      setShowLoginPrompt(true);
      return;
    }
  };

  return (
    <>
      <Link href={targetLink} onClick={handleClick}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03, duration: 0.25 }}
          className="w-full flex flex-col items-center gap-2 cursor-pointer group select-none"
        >
          {/* 1:1 Aspect Ratio Square Card */}
          <div
            className="w-full aspect-square rounded-2xl border shadow-md group-hover:shadow-[0_0_15px_rgba(200,164,92,0.25)] transition-all duration-300 overflow-hidden relative flex items-center justify-center"
            style={{
              backgroundColor: "var(--theme-card)",
              borderColor: "var(--theme-border)",
            }}
          >
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
              <div
                className="w-full h-full border flex flex-col items-center justify-center p-3 text-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300"
                style={{
                  backgroundColor: "var(--theme-card)",
                  borderColor: "var(--theme-border)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-2xl border flex items-center justify-center mb-2 shadow-xs"
                  style={{
                    backgroundColor: "rgba(200, 164, 92, 0.15)",
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-primary)",
                  }}
                >
                  <PackageOpen size={20} />
                </div>
                <span
                  className="text-xs font-bold line-clamp-2 leading-tight px-1"
                  style={{ color: "var(--theme-accent)" }}
                >
                  {name}
                </span>
              </div>
            )}

            {/* Depth Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-60 group-hover:opacity-40 transition-opacity pointer-events-none" />

            {/* Guest Lock Overlay on Hover */}
            {isGuest && (
              <div
                className="absolute inset-0 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 p-2 text-center"
                style={{ backgroundColor: "rgba(26, 26, 26, 0.85)" }}
              >
                <div
                  className="w-8 h-8 rounded-full border flex items-center justify-center mb-1 shadow-sm"
                  style={{
                    backgroundColor: "rgba(200, 164, 92, 0.2)",
                    borderColor: "var(--theme-primary)",
                    color: "var(--theme-primary)",
                  }}
                >
                  <Lock size={15} />
                </div>
                <span
                  className="text-[10px] font-bold line-clamp-1"
                  style={{ color: "var(--theme-accent)" }}
                >
                  سجّل دخولك للعرض
                </span>
              </div>
            )}

            {/* Category Tag Badge */}
            {categoryName && (
              <span
                className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-lg border shadow-xs pointer-events-none backdrop-blur-xs z-10"
                style={{
                  backgroundColor: "rgba(26, 26, 26, 0.85)",
                  color: "var(--theme-primary)",
                  borderColor: "var(--theme-border)",
                }}
              >
                {categoryName}
              </span>
            )}

            {/* Product Count Badge (for groups) */}
            {productCount !== undefined && productCount > 0 && (
              <span
                className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-lg border shadow-xs pointer-events-none z-10"
                style={{
                  backgroundColor: "rgba(26, 26, 26, 0.85)",
                  color: "var(--theme-accent)",
                  borderColor: "var(--theme-border)",
                }}
              >
                {productCount} منتج
              </span>
            )}

            {/* Bottom Floating Price Badge if price provided */}
            {priceUsd !== undefined && (
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
                <span
                  className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-lg border shadow-xs"
                  style={{
                    backgroundColor: "rgba(26, 26, 26, 0.9)",
                    color: "var(--theme-accent)",
                    borderColor: "var(--theme-border)",
                  }}
                >
                  {formattedPrice}
                </span>
              </div>
            )}
          </div>

          {/* Product / Item Title Below Card */}
          <div className="w-full text-center px-1">
            <h3
              className="text-xs font-bold transition-colors leading-tight line-clamp-1"
              style={{ color: "var(--theme-text-primary)" }}
            >
              {name}
            </h3>
          </div>
        </motion.div>
      </Link>

      {/* Login Required Modal for Guests */}
      <LoginRequiredModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        redirectUrl={targetLink}
      />
    </>
  );
}
