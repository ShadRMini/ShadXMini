export const DEFAULT_VALUES_TO_REJECT = [
  "",
  "initial",
  "none",
  "inherit",
  "unset",
  "#1a1a1a",
  "#2d2d2d",
  "#c8a45c",
  "#0f172a",
  "#13355f",
  "#b8954a",
  "#fde68a",
  "#3d3d3d",
  "#242424",
  "#ffffff",
  "#f5ca35",
  "#dcb220",
  "#e5e7eb",
  "#111827",
  "#374151",
  "#1c1917",
  "#44403c",
  "#78716c",
  "#efece6",
  "#f5f2eb",
  "cairo",
  "inter",
  "'cairo', sans-serif",
  "'inter', sans-serif",
  "cairo, sans-serif",
  "inter, sans-serif",
  "rgba(200, 164, 92, 0.25)",
  "rgba(0,0,0,0.1)",
  "rgba(200,164,92,0.25)",
];

export function getPageCustomSetting(key: string, val: any): string {
  const clean = String(val || "").trim().toLowerCase();
  if (clean && !clean.startsWith("var(") && !DEFAULT_VALUES_TO_REJECT.includes(clean)) {
    return String(val).trim();
  }
  return "";
}
