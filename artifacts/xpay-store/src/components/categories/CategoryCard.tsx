import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { FolderTree, Sparkles } from "lucide-react";

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
  const resolvedImage = getBrandedCategoryImage(name, image);
  const finalImageUrl = resolvedImage ? withImageVersion(resolvedImage, imageVersion || `${id}-${image || ""}`) : "";

  return (
    <Link href={`/categories/${id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="flex flex-col items-center gap-2 cursor-pointer group select-none"
      >
        {/* Category Image Container */}
        <div className="w-full aspect-square rounded-2xl bg-[#1A1A1A] border border-[#C8A45C]/20 shadow-md group-hover:border-[#C8A45C] group-hover:shadow-lg group-hover:shadow-[#C8A45C]/15 transition-all duration-300 overflow-hidden relative flex items-center justify-center">
          {!imgError && finalImageUrl ? (
            <img
              src={finalImageUrl}
              alt={name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 will-change-transform"
            />
          ) : (
            /* Elegant Dark & Gold Placeholder when image is missing or failed */
            <div className="w-full h-full bg-gradient-to-br from-[#241D12] via-[#1A1A1A] to-[#12100C] border border-[#C8A45C]/30 flex flex-col items-center justify-center p-2.5 text-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-[#C8A45C]/15 rounded-full blur-lg pointer-events-none" />
              <div className="w-9 h-9 rounded-xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C] mb-1.5 shadow-xs">
                <FolderTree size={18} />
              </div>
              <span className="text-[10px] font-bold text-[#FDE68A] line-clamp-1 leading-tight px-1">
                {name}
              </span>
            </div>
          )}

          {/* Subtle bottom gradient glow for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity pointer-events-none" />
          
          {productCount !== undefined && productCount > 0 && (
            <span className="absolute bottom-1.5 left-1.5 text-[9px] font-bold bg-[#1A1A1A]/85 text-[#FDE68A] px-1.5 py-0.5 rounded-md border border-[#C8A45C]/30 shadow-xs pointer-events-none">
              {productCount}
            </span>
          )}
        </div>

        {/* Category Label */}
        <span className="text-xs font-bold text-center text-zinc-200 group-hover:text-[#FDE68A] transition-colors leading-tight line-clamp-1 px-1">
          {name}
        </span>
      </motion.div>
    </Link>
  );
}
