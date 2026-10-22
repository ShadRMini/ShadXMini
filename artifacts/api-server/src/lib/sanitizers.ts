export function getPageCustomSetting(key: string, val: any): string {
  const clean = String(val || "").trim().toLowerCase();
  if (clean && !clean.startsWith("var(")) {
    return String(val).trim();
  }
  return "";
}

