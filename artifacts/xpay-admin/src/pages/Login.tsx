import { useEffect, useState } from "react";
import { post } from "../lib/api";
import { Lock, User } from "lucide-react";

export default function Login({ onSuccess }: { onSuccess: (u: any) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loginImage, setLoginImage] = useState("");

  useEffect(() => {
    const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
    fetch(`${baseUrl}/api/app-settings`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setLoginImage(String(data?.adminLoginImage || "")))
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
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(circle at top, #2A2A2A 0%, #1A1A1A 60%, #111111 100%)" }}
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-[#D1D5DB]">
        <div className="text-center mb-7">
          {loginImage ? (
            <div className="mx-auto w-24 h-24 rounded-2xl overflow-hidden shadow-lg border border-[#D1D5DB] bg-slate-50">
              <img src={loginImage} alt="ShadMini" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="inline-flex w-16 h-16 rounded-2xl bg-[#C8A45C] text-white text-2xl font-extrabold items-center justify-center shadow-lg shadow-[#C8A45C]/30">
              SM
            </div>
          )}
          <h1 className="text-2xl font-black text-slate-900 mt-4 tracking-wide">ShadMini</h1>
          <p className="text-sm font-medium text-[#C8A45C] mt-1">لوحة الإدارة الفاخرة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">اسم المستخدم</label>
            <div className="relative">
              <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full border border-[#D1D5DB] rounded-lg pr-10 pl-3 py-2.5 text-sm focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20"
                placeholder="أدخل اسم المستخدم"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-[#D1D5DB] rounded-lg pr-10 pl-3 py-2.5 text-sm focus:border-[#C8A45C] focus:ring-2 focus:ring-[#C8A45C]/20"
                placeholder="••••••••"
              />
            </div>
          </div>

          {err && <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">{err}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C8A45C] hover:bg-[#B8954A] text-white font-bold py-2.5 rounded-lg shadow-md shadow-[#C8A45C]/30 disabled:opacity-50 transition"
          >
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
