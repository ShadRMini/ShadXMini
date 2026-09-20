import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { FolderTree, Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useStoreSettings } from "@/lib/store-settings-context";
import LoginRequiredModal from "@/components/LoginRequiredModal";

interface CategoryCardProps {
  id: string;
  name: string;
  image?: string;
  imageVersion?: string;
  productCount?: number;
  index?: number;
}

function withImageVersion(url: string, version: string): string {
  const cleanUrl = String(url || "").trim();
  if (!cleanUrl || cleanUrl.startsWith("data:") || cleanUrl.startsWith("blob:")) return cleanUrl;
  const separator = cleanUrl.includes("?") ? "&" : "?";
  return `${cleanUrl}${separator}v=${encodeURIComponent(version)}`;
}

function getBrandedCategoryImage(categoryName: string, fallback?: string | null): string {
  const customImage = String(fallback || "").trim();
  if (customImage) return customImage;

  const name = String(categoryName || "").trim().toLowerCase();

  if (name.includes("تطبيق") || name.includes("app")) return "/xpay-cat-apps.svg";
  if (name.includes("لعب") || name.includes("game")) return "/xpay-cat-games.svg";
  if (name.includes("رصيد") || name.includes("balance")) return "/xpay-cat-balance.svg";
  if (name.includes("ميديا") || name.includes("سوشل") || name.includes("social")) return "/xpay-cat-media.svg";
  if (name.includes("شات") || name.includes("chat")) return "/xpay-cat-chat.svg";
  if (name.includes("رقم") || name.includes("number")) return "/xpay-cat-numbers.svg";
  if (name.includes("بطاق") || name.includes("card")) return "/xpay-cat-cards.svg";

  return "";
}

export default function CategoryCard({
  id,
  name,
  image,
  imageVersion,
  productCount,
  index = 0,
}: CategoryCardProps) {
  const [imgError, setImgError] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { user, token } = useAuth();
  const storeSettings = useStoreSettings();

  const isGuestModeEnabled = Boolean(
    storeSettings.guestPreviewEnabled ?? storeSettings.guest_preview_enabled ?? true
  );
  const isAuthenticated = Boolean(user || token);
  const isGuest = !isAuthenticated && isGuestModeEnabled;

  const resolvedImage = getBrandedCategoryImage(name, image);
  const finalImageUrl = resolvedImage ? withImageVersion(resolvedImage, imageVersion || `${id}-${image || ""}`) : "";
  const targetCategoryUrl = `/categories/${id}`;

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
      <Link href={targetCategoryUrl} onClick={handleClick}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
          className="flex flex-col items-center gap-2 cursor-pointer group select-none relative"
        >
          {/* Category Image Container */}
          <div
            className="w-full aspect-square rounded-2xl border shadow-md group-hover:shadow-lg transition-all duration-300 overflow-hidden relative flex items-center justify-center"
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
                className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 will-change-transform"
              />
            ) : (
              /* Elegant Placeholder when image is missing or failed */
              <div
                className="w-full h-full border flex flex-col items-center justify-center p-2.5 text-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300"
                style={{
                  backgroundColor: "var(--theme-card)",
                  borderColor: "var(--theme-border)",
                }}
              >
                <div className="absolute -top-3 -right-3 w-12 h-12 bg-amber-500/10 rounded-full blur-lg pointer-events-none" />
                <div
                  className="w-9 h-9 rounded-xl border flex items-center justify-center mb-1.5 shadow-xs"
                  style={{
                    backgroundColor: "rgba(200, 164, 92, 0.2)",
                    borderColor: "var(--theme-border)",
                    color: "var(--theme-primary)",
                  }}
                >
                  <FolderTree size={18} />
                </div>
                <span
                  className="text-[10px] font-bold line-clamp-1 leading-tight px-1"
                  style={{ color: "var(--theme-accent)" }}
                >
                  {name}
                </span>
              </div>
            )}

            {/* Subtle bottom gradient glow for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity pointer-events-none" />

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
            
            {productCount !== undefined && productCount > 0 && (
              <span
                className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border shadow-xs pointer-events-none z-10"
                style={{
                  backgroundColor: "rgba(26, 26, 26, 0.85)",
                  color: "var(--theme-accent)",
                  borderColor: "var(--theme-border)",
                }}
              >
                {productCount}
              </span>
            )}
          </div>

          {/* Category Label */}
          <span
            className="text-xs font-bold text-center transition-colors leading-tight line-clamp-1 px-1"
            style={{ color: "var(--theme-text-primary)" }}
          >
            {name}
          </span>
        </motion.div>
      </Link>

      {/* Login Required Modal for Guests */}
      <LoginRequiredModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        redirectUrl={targetCategoryUrl}
      />
    </>
  );
}
