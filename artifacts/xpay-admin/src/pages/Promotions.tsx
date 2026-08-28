import { useState } from "react";
import { Megaphone, Plus, Tag, Sparkles } from "lucide-react";

export default function Promotions() {
  const [promos, setPromos] = useState([
    { id: 1, title: "عرض رمضان المميز", discount: "20%", code: "RAMADAN20", active: true },
    { id: 2, title: "خصم شحن رصيد VIP", discount: "15%", code: "VIP15", active: true },
  ]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#FDE68A]">
            <Megaphone size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#FDE68A]">العروض الترويجية والتسويق</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">إدارة الحملات التسويقية والخصومات الترويجية للمتجر</p>
          </div>
        </div>
        <button
          onClick={() => alert("إضافة عرض ترويجي جديد قريباً")}
          className="flex items-center gap-2 bg-[#C8A45C] hover:bg-[#b8934d] text-[#1A1A1A] font-bold px-4 py-2.5 rounded-xl transition shadow-md cursor-pointer"
        >
          <Plus size={18} />
          <span>إضافة عرض جديد (+)</span>
        </button>
      </div>

      {/* Promos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promos.map((promo) => (
          <div key={promo.id} className="bg-[#2D2D2D] border border-[#C8A45C]/30 p-6 rounded-3xl shadow-xl flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#C8A45C]/20 text-[#FDE68A] px-2.5 py-1 rounded-full border border-[#C8A45C]/35 font-bold">
                  {promo.discount} خصم
                </span>
                <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  نشط
                </span>
              </div>
              <h3 className="text-lg font-black text-white">{promo.title}</h3>
              <p className="text-xs font-mono text-zinc-400 flex items-center gap-1">
                <Tag size={14} className="text-[#C8A45C]" /> كود القسيمة: <span className="text-[#FDE68A] font-bold">{promo.code}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] border border-[#C8A45C]/30 flex items-center justify-center text-[#C8A45C]">
              <Sparkles size={22} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
