export default function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4" dir="rtl">
      <div 
        className="w-12 h-12 border-4 rounded-full animate-spin"
        style={{
          borderColor: "rgba(200, 164, 92, 0.2)",
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
