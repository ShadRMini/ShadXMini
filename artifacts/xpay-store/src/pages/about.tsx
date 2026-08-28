import { Link } from "wouter";
import { Info, ShieldCheck, Zap, Headphones, Globe, ArrowRight } from "lucide-react";

export default function About() {
  return (
    <div className="p-4 sm:p-6 min-h-screen bg-[#1A1A1A] text-white pb-24" dir="rtl">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C8A45C]/20 border border-[#C8A45C]/40 flex items-center justify-center text-[#C8A45C]">
            <Info size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#FDE68A]">من نحن</h1>
            <p className="text-xs text-zinc-400 font-medium">تعرف على المنصة وخدماتنا</p>
          </div>
        </div>
        <Link href="/">
          <button className="flex items-center gap-1 text-xs font-bold text-[#C8A45C] hover:text-[#FDE68A] bg-[#2D2D2D] border border-zinc-700 hover:border-[#C8A45C] px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer">
            <span>الرئيسية</span>
            <ArrowRight size={14} />
          </button>
        </Link>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Hero Card */}
        <div className="bg-[#2D2D2D] border border-[#C8A45C]/40 text-white rounded-3xl p-6 sm:p-8 text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#C8A45C]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#C8A45C] text-[#1A1A1A] text-xl font-black items-center justify-center mb-4 shadow-lg shadow-[#C8A45C]/20">
            XP
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#FDE68A] mb-2">
            منصة XPay الرقمية
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium">
            المنصة الرائدة والأسرع لخدمات شحن الألعاب، البطاقات الرقمية، والاشتراكات في الوطن العربي بأعلى معايير الأمان والسرعة.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-2xl p-4 shadow-md hover:border-[#C8A45C] transition">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/40 text-[#C8A45C] flex items-center justify-center mb-3">
              <Zap size={20} />
            </div>
            <h3 className="text-sm font-bold text-[#FDE68A] mb-1">تسليم فوري وآلي</h3>
            <p className="text-xs text-zinc-400 leading-normal">
              تنفيذ فوري لطلباتك عبر أحدث أنظمة الربط المباشر مع مزودي الخدمات العالمية.
            </p>
          </div>

          <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-2xl p-4 shadow-md hover:border-[#C8A45C] transition">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/40 text-[#C8A45C] flex items-center justify-center mb-3">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-sm font-bold text-[#FDE68A] mb-1">حماية وأمان كامل</h3>
            <p className="text-xs text-zinc-400 leading-normal">
              معاملات مالية مشفرة بالكامل لضمان سلامة بياناتك وأرصدتك الرقمية.
            </p>
          </div>

          <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-2xl p-4 shadow-md hover:border-[#C8A45C] transition">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/40 text-[#C8A45C] flex items-center justify-center mb-3">
              <Globe size={20} />
            </div>
            <h3 className="text-sm font-bold text-[#FDE68A] mb-1">طرق دفع محلية ودولية</h3>
            <p className="text-xs text-zinc-400 leading-normal">
              دعم شام كاش، سيريتل كاش، MTN كاش، بينانس باي، وUSDT.
            </p>
          </div>

          <div className="bg-[#2D2D2D] border border-[#C8A45C]/30 rounded-2xl p-4 shadow-md hover:border-[#C8A45C] transition">
            <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C8A45C]/40 text-[#C8A45C] flex items-center justify-center mb-3">
              <Headphones size={20} />
            </div>
            <h3 className="text-sm font-bold text-[#FDE68A] mb-1">دعم فني متواصل</h3>
            <p className="text-xs text-zinc-400 leading-normal">
              فريق دعم فني جاهز للإجابة على استفساراتكم ومتابعة الطلبات على مدار الساعة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
