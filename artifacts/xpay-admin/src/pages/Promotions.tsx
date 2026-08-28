import Crud from "../components/Crud";

export default function Promotions() {
  return (
    <Crud
      resource="banners"
      title="العروض الترويجية والبانرات التسويقية"
      fields={[
        { name: "title", label: "عنوان العرض / البانر", type: "text", required: true },
        { name: "image", label: "رابط الصورة (Image URL)", type: "text", required: true },
        { name: "link", label: "رابط الإحالة / التوجيه", type: "text" },
        { name: "order", label: "الترتيب", type: "number", default: 0 },
      ]}
    />
  );
}
