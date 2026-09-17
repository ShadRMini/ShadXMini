import React from "react";
import { ThemePreset } from "../lib/theme-presets";
import { Check, Edit, Trash2, Sparkles } from "lucide-react";

interface Props {
  preset: ThemePreset;
  isActive: boolean;
  currentMode: "dark" | "light" | "auto";
  onApply: (presetId: string) => void;
  onEdit: (preset: ThemePreset) => void;
  onDelete?: (presetId: string) => void;
}

export default function ThemePresetCard({
  preset,
  isActive,
  currentMode,
  onApply,
  onEdit,
  onDelete,
}: Props) {
  const modeKey = currentMode === "light" ? "light" : "dark";
  const colors = preset[modeKey] || preset.dark;

  return (
    <div
      className={`relative p-4 rounded-2xl transition-all duration-300 flex flex-col justify-between border ${
        isActive
          ? "border-[#C8A45C] bg-[#2C2923]/90 shadow-lg shadow-[#C8A45C]/15 ring-2 ring-[#C8A45C]/40"
          : "border-zinc-800 bg-[#1E1E1E] hover:border-zinc-700 hover:bg-[#252525]"
      }`}
    >
      {/* Top row: Name & Badges */}
      <div>
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white tracking-wide">{preset.name}</h4>
            {preset.isCustom && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md flex items-center gap-1">
                <Sparkles size={10} />
                مخصص
              </span>
            )}
          </div>

          {isActive && (
            <span className="px-2.5 py-1 text-[11px] font-extrabold bg-[#C8A45C] text-black rounded-full flex items-center gap-1 shadow-sm">
              <Check size={12} strokeWidth={3} />
              النشط
            </span>
          )}
        </div>

        <p className="text-[11px] text-zinc-400 mb-3 line-clamp-1">{preset.description}</p>

        {/* Color Palette Preview Swatches (4 Colors) */}
        <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#121212] rounded-xl border border-zinc-800/80 mb-4">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-full h-7 rounded-lg shadow-inner border border-white/10"
              style={{ backgroundColor: colors.primary }}
              title={`الرئيسي: ${colors.primary}`}
            />
            <span className="text-[9px] font-mono text-zinc-400">رئيسي</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div
              className="w-full h-7 rounded-lg shadow-inner border border-white/10"
              style={{ backgroundColor: colors.accent }}
              title={`التمييز: ${colors.accent}`}
            />
            <span className="text-[9px] font-mono text-zinc-400">تميز</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div
              className="w-full h-7 rounded-lg shadow-inner border border-white/10"
              style={{ backgroundColor: colors.background }}
              title={`الخلفية: ${colors.background}`}
            />
            <span className="text-[9px] font-mono text-zinc-400">خلفية</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div
              className="w-full h-7 rounded-lg shadow-inner border border-white/10"
              style={{ backgroundColor: colors.card }}
              title={`الكروت: ${colors.card}`}
            />
            <span className="text-[9px] font-mono text-zinc-400">كارت</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => onApply(preset.id)}
          disabled={isActive}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            isActive
              ? "bg-[#C8A45C]/20 text-[#FDE68A] cursor-default border border-[#C8A45C]/30"
              : "bg-[#C8A45C] hover:bg-[#B8954A] text-black shadow-md hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          {isActive ? "مُطبق حالياً" : "تطبيق النمط"}
        </button>

        <button
          type="button"
          onClick={() => onEdit(preset)}
          className="p-2 text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition border border-zinc-700 cursor-pointer text-xs"
          title="تعديل تفاصيل النمط"
        >
          <Edit size={14} />
        </button>

        {preset.isCustom && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(preset.id)}
            className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition border border-rose-500/20 cursor-pointer text-xs"
            title="حذف هذا النمط"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
