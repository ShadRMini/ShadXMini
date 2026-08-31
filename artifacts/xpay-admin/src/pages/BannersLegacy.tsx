import Crud from "../components/Crud";

export default function BannersLegacy() {
  return (
    <Crud
      resource="banners"
      title="البانرات (الواجهة السابقة)"
      fields={[
        { name: "title", label: "العنوان", type: "text", required: true },
        { name: "image", label: "رابط الصورة", type: "text", required: true },
        { name: "link", label: "الرابط (اختياري)", type: "text" },
        { name: "order", label: "الترتيب", type: "number", default: 0 },
        { name: "showDiscoverBtn", label: "إظهار زر (اكتشف الان)", type: "boolean", default: false },
        { name: "showAutoExecBtn", label: "إظهار زر (تنفيذ تلقائي وفوري)", type: "boolean", default: false },
        { name: "showReliableBtn", label: "إظهار زر (خدمة موثوقة)", type: "boolean", default: false },
        { name: "showFeaturedBtn", label: "إظهار زر (عرض مميز)", type: "boolean", default: false },
      ]}
    />
  );
}
