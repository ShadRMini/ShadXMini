export default function PageLoading() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] gap-4"
      style={{ backgroundColor: "var(--theme-background, transparent)" }}
      dir="rtl"
    >
      <div 
        className="w-12 h-12 border-4 rounded-full animate-spin"
        style={{
          borderColor: "color-mix(in srgb, var(--theme-primary, #C8A45C) 20%, transparent)",
          borderTopColor: "var(--theme-primary)"
        }}
      />
      <p 
        className="text-sm font-medium"
        style={{ color: "var(--theme-text-muted)" }}
      >
        جاري تحميل الصفحة...
      </p>
    </div>
  );
}
