import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="w-full max-w-sm rounded-2xl border border-primary/20 bg-card/60 p-8 shadow-xl backdrop-blur-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          عذراً، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
