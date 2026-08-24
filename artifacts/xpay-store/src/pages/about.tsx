import { Link } from "wouter";
import { Info, ShieldCheck, Zap, Headphones, Globe, ArrowRight } from "lucide-react";

export default function About() {
  return (
    <div className="p-4 sm:p-6 min-h-screen pb-24" dir="rtl">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#C8A45C]/15 flex items-center justify-center text-[#C8A45C]">
            <Info size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#111827]">من نحن</h1>
            <p className="text-xs text-slate-500 font-medium">تعرف على منصة XPayStore</p>
          </div>
        </div>
        <Link href="/">
          <button className="flex items-center gap-1 text-xs font-bold text-[#C8A45C] hover:text-[#B8954A] bg-white border border-[#D1D5DB] px-3 py-2 rounded-xl shadow-xs transition">
            <span>الرئيسية</span>
            <ArrowRight size={14} />
          </button>
        </Link>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Hero Card */}
        <div className="bg-[#1A1A1A] border border-[#C8A45C]/30 text-white rounded-3xl p-6 sm:p-8 text-center shadow-xl relative overflow-hidden">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#C8A45C] text-[#1A1A1A] text-xl font-black items-center justify-center mb-4 shadow-lg shadow-[#C8A45C]/20">
            XP
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#C8A45C] mb-2">
            XPayStore
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            المنصة الرائدة والأسرع لخدمات شحن الألعاب، البطاقات الرقمية، والاشتراكات في الوطن العربي وسوريا بأعلى معايير الأمان والسرعة.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="bg-white border border-[#D1D5DB] rounded-2xl p-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/10 text-[#C8A45C] flex items-center justify-center mb-3">
              <Zap size={20} />
            </div>
            <h3 className="text-sm font-bold text-[#111827] mb-1">تسليم فوري وآلي</h3>
            <p className="text-xs text-slate-500 leading-normal">
              تنفيذ فوري لطلباتك عبر أحدث أنظمة الربط المباشر مع مزودي الخدمات العالمية.
            </p>
          </div>

          <div className="bg-white border border-[#D1D5DB] rounded-2xl p-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/10 text-[#C8A45C] flex items-center justify-center mb-3">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-sm font-bold text-[#111827] mb-1">حماية وأمان كامل</h3>
            <p className="text-xs text-slate-500 leading-normal">
              معاملات مالية مشفرة بالكامل لضمان سلامة بياناتك وأرصدتك الرقمية.
            </p>
          </div>

          <div className="bg-white border border-[#D1D5DB] rounded-2xl p-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/10 text-[#C8A45C] flex items-center justify-center mb-3">
              <Globe size={20} />
            </div>
            <h3 className="text-sm font-bold text-[#111827] mb-1">طرق دفع محلية ودولية</h3>
            <p className="text-xs text-slate-500 leading-normal">
              دعم شام كاش، الهرم، الفؤاد، بايير، USDT وجميع الوسائل الشائعة.
            </p>
          </div>

          <div className="bg-white border border-[#D1D5DB] rounded-2xl p-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#C8A45C]/10 text-[#C8A45C] flex items-center justify-center mb-3">
              <Headphones size={20} />
            </div>
            <h3 className="text-sm font-bold text-[#111827] mb-1">دعم فني متواصل</h3>
            <p className="text-xs text-slate-500 leading-normal">
              فريق دعم فني جاهز للإجابة على استفساراتكم ومتابعة الطلبات على مدار الساعة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
