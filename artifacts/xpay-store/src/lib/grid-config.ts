/**
 * Store Product Grid Columns Configuration
 * Range allowed: 2 to 4 columns.
 * Default: 3 columns.
 */
export const PRODUCT_GRID_COLS: 2 | 3 | 4 = 3;

/**
 * Returns responsive Tailwind grid class based on column count.
 * Mobile: always at least 2 columns (grid-cols-2).
 * Tablet/Desktop: configured columns (2, 3, or 4).
 */
export function getProductGridClass(cols: number = PRODUCT_GRID_COLS): string {
  switch (cols) {
    case 2:
      return "grid grid-cols-2 gap-3.5 sm:gap-4";
    case 4:
      return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4";
    case 3:
    default:
      return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3.5 sm:gap-4";
  }
}
