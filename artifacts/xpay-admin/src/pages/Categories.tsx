import Crud from "../components/Crud";
export default function Categories() {
  return (
    <Crud
      resource="categories"
      title="الأقسام"
      beforeSubmit={(data) => ({
        ...data,
        name: typeof data.name === "string" ? data.name.trim() : data.name,
        image: typeof data.image === "string" ? data.image.trim() : data.image,
        columnsCount: Number(data.columnsCount || 2),
      })}
      fields={[
        { name: "name", label: "الاسم", type: "text", required: true },
        { name: "image", label: "رابط الصورة", type: "image", required: true },
        {
          name: "columnsCount",
          label: "عدد الأعمدة في العرض (من 1 إلى 4)",
          type: "number",
          default: 2,
          min: 1,
          max: 4,
        },
        { name: "order", label: "الترتيب", type: "number", default: 0 },
        { name: "active", label: "مفعل", type: "boolean", default: true },
      ]}
    />
  );
}
