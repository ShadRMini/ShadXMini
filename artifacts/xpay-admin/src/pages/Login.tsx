import { useEffect, useState } from "react";
import { post } from "../lib/api";
import { Lock, User } from "lucide-react";

export default function Login({ onSuccess }: { onSuccess: (u: any) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loginImage, setLoginImage] = useState("");
  const [loginTitle, setLoginTitle] = useState("ShadMini");
  const [loginSubtitle, setLoginSubtitle] = useState("لوحة الإدارة الفاخرة");

  useEffect(() => {
    const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    fetch(`${baseUrl}/api/app-settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLoginImage(String(data?.adminLoginImage || ""));
          if (data?.adminLoginTitle) setLoginTitle(String(data.adminLoginTitle));
          if (data?.adminLoginSubtitle) setLoginSubtitle(String(data.adminLoginSubtitle));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const u = await post("/login", { username, password });
      onSuccess(u);
    } catch (e: any) {
      setErr(e.message || "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-[#1A1A1A] text-white"
      dir="rtl"
    >
      <div className="bg-[#2D2D2D] rounded-3xl shadow-2xl w-full max-w-md p-8 border border-[#C8A45C]/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#C8A45C]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-7 relative z-10">
          {loginImage ? (
            <div className="mx-auto w-24 h-24 rounded-2xl overflow-hidden shadow-lg border border-[#C8A45C]/40 bg-[#1A1A1A]">
              <img src={loginImage} alt="XPay" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="inline-flex w-16 h-16 rounded-2xl bg-[#1A1A1A] border-2 border-[#C8A45C] text-[#C8A45C] text-2xl font-black items-center justify-center shadow-lg shadow-[#C8A45C]/30">
              XP
            </div>
          )}
          <h1 className="text-2xl font-black text-[#FDE68A] mt-4 tracking-wide">{loginTitle}</h1>
          <p className="text-sm font-bold text-[#C8A45C] mt-1">{loginSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">اسم المستخدم</label>
            <div className="relative">
              <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#3D3D3D] border border-[#4B5563] text-white rounded-xl pr-10 pl-3 py-3 text-sm focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/25 transition"
                placeholder="أدخل اسم المستخدم"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#3D3D3D] border border-[#4B5563] text-white rounded-xl pr-10 pl-3 py-3 text-sm focus:outline-none focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/25 transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          {err && <div className="p-3 bg-red-950/70 border border-red-500/40 text-red-300 rounded-xl text-xs font-medium">{err}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C8A45C] hover:bg-[#B8954A] active:scale-[0.98] text-[#1A1A1A] font-black py-3.5 rounded-xl shadow-lg shadow-[#C8A45C]/30 disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
