import React from "react";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  className?: string;
}

export default function ColorPickerField({
  label,
  value,
  onChange,
  description,
  className = "",
}: Props) {
  const safeValue = value || "#000000";

  return (
    <div className={`flex flex-col gap-1.5 p-3 rounded-2xl bg-[#1A1A1A] border border-zinc-800/90 transition-all hover:border-zinc-700 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-zinc-200">{label}</label>
        <span className="text-[10px] font-mono font-medium text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/50">
          {safeValue.toUpperCase()}
        </span>
      </div>

      {description && <p className="text-[10px] text-zinc-400 leading-tight">{description}</p>}

      <div className="flex items-center gap-2 mt-1">
        {/* Color picker input wrapper */}
        <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-zinc-700 shadow-sm cursor-pointer group">
          <input
            type="color"
            value={safeValue.startsWith("#") ? safeValue : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -top-2 -left-2 w-14 h-14 cursor-pointer opacity-0 z-10"
          />
          <div
            className="w-full h-full rounded-xl transition-transform group-hover:scale-105"
            style={{ backgroundColor: safeValue }}
          />
        </div>

        {/* Text input for manual hex typing */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#FFFFFF"
          className="flex-1 bg-[#121212] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-[#C8A45C] dir-ltr text-right transition"
        />
      </div>
    </div>
  );
}
