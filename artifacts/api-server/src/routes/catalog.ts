import { Router, type IRouter } from "express";
import { db, categoriesTable, productGroupsTable, productsTable, newsTable, bannersTable, settingsTable, productPageConfigTable } from "@workspace/db";
import { and, asc, eq, ilike, sql } from "drizzle-orm";
import {
  ListCategoriesResponse,
  ListProductsResponse,
  ListFeaturedProductsResponse,
  GetProductResponse,
  ListNewsResponse,
  ListBannersResponse,
} from "@workspace/api-zod";
import { addUnitPrices } from "../lib/pricing.js";

const router: IRouter = Router();

function productRow(p: typeof productsTable.$inferSelect, categoryName: string) {
  const finalPriceUsd =
    p.finalUnitPrice != null
      ? Number(p.finalUnitPrice)
      : Number(addUnitPrices(p.providerUnitPrice ?? p.basePriceUsd ?? 0, p.storeProfitPerUnit ?? p.priceUsd ?? 0));
  const minQty = p.minQuantity ?? (p.minQty != null ? Number(p.minQty) : 1);
  const safeMinQty = Number.isFinite(Number(minQty)) && Number(minQty) > 0 ? Number(minQty) : 1;
  const quantityValues = Array.isArray(p.quantityValues)
    ? p.quantityValues
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
        .sort((a, b) => a - b)
    : undefined;

  return {
    id: String(p.id),
    name: p.name,
    categoryId: String(p.categoryId),
    groupId: p.groupId != null ? String(p.groupId) : undefined,
    categoryName,
    image: p.image,
    order: p.order,
    priceUsd: finalPriceUsd,
    minTotalUsd: Number((finalPriceUsd * safeMinQty).toFixed(8)),
    priceSyp: Number(p.priceSyp),
    productType: p.productType as "amount" | "package",
    available: p.available,
    minQty: safeMinQty,
    maxQty: p.maxQuantity ?? (p.maxQty != null ? Number(p.maxQty) : undefined),
    quantityType: p.quantityType,
    quantityValues,
    description: p.description ?? undefined,
    featured: p.featured,
  };
}

router.get("/categories", async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const cats = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.order));
    const counts = await db
      .select({ cid: productsTable.categoryId, c: sql<number>`count(*)::int` })
      .from(productsTable)
      .groupBy(productsTable.categoryId);
    const map = new Map(counts.map((c) => [c.cid, c.c]));
    const data = ListCategoriesResponse.parse(
      cats.map((c) => ({
        id: String(c.id),
        name: c.name,
        image: c.image,
        imageVersion: `${c.id}:${c.image}`,
        order: c.order,
        active: c.active,
        productCount: map.get(c.id) ?? 0,
        columnsCount: Number(c.columnsCount ?? 2),
      })),
    );
    res.json(data);
  } catch (error) {
    console.error("🔥 FULL ERROR in /categories:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/products", async (req, res) => {
  try {
    const { categoryId, groupId, q } = req.query as { categoryId?: string; groupId?: string; q?: string };
    const conds = [eq(productsTable.available, true)];
    if (categoryId) conds.push(eq(productsTable.categoryId, Number(categoryId)));
    if (groupId) {
      conds.push(eq(productsTable.groupId, Number(groupId)));
    } else if (categoryId) {
      conds.push(sql`${productsTable.groupId} IS NULL`);
    }
    if (q) conds.push(ilike(productsTable.name, `%${q}%`));
    const rows = await db
      .select({
        p: productsTable,
        cname: categoriesTable.name,
      })
      .from(productsTable)
      .innerJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(productsTable.order), asc(productsTable.id));
    res.json(ListProductsResponse.parse(rows.map((r) => productRow(r.p, r.cname))));
  } catch (error) {
    console.error("🔥 FULL ERROR in /products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/product-groups", async (req, res) => {
  try {
    const { categoryId } = req.query as { categoryId?: string };
    const conds = [eq(productGroupsTable.active, true)];
    if (categoryId) conds.push(eq(productGroupsTable.categoryId, Number(categoryId)));

    const rows = await db
      .select({
        g: productGroupsTable,
        productCount: sql<number>`count(${productsTable.id})::int`,
      })
      .from(productGroupsTable)
      .leftJoin(
        productsTable,
        and(eq(productsTable.groupId, productGroupsTable.id), eq(productsTable.available, true)),
      )
      .where(and(...conds))
      .groupBy(productGroupsTable.id)
      .orderBy(asc(productGroupsTable.order), asc(productGroupsTable.id));

    res.json(
      rows.map((r) => ({
        id: String(r.g.id),
        categoryId: String(r.g.categoryId),
        name: r.g.name,
        image: r.g.image,
        imageVersion: `${r.g.id}:${r.g.image}`,
        order: r.g.order,
        active: r.g.active,
        productCount: Number(r.productCount || 0),
      })),
    );
  } catch (error) {
    console.error("🔥 FULL ERROR in /product-groups:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/products/featured", async (_req, res) => {
  try {
    const rows = await db
      .select({ p: productsTable, cname: categoriesTable.name })
      .from(productsTable)
      .innerJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(and(eq(productsTable.featured, true), eq(productsTable.available, true)))
      .orderBy(asc(productsTable.order), asc(productsTable.id));
    res.json(ListFeaturedProductsResponse.parse(rows.map((r) => productRow(r.p, r.cname))));
  } catch (error) {
    console.error("🔥 FULL ERROR in /products/featured:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db
      .select({ p: productsTable, cname: categoriesTable.name })
      .from(productsTable)
      .innerJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(and(eq(productsTable.id, id), eq(productsTable.available, true)))
      .limit(1);
    if (!rows.length) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(GetProductResponse.parse(productRow(rows[0]!.p, rows[0]!.cname)));
  } catch (error) {
    console.error("🔥 FULL ERROR in /products/:id:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/news", async (_req, res) => {
  try {
    const rows = await db.select().from(newsTable).where(eq(newsTable.active, true));
    res.json(
      ListNewsResponse.parse(
        rows.map((n) => ({
          id: String(n.id),
          content: n.content,
          type: n.type as "general" | "offer" | "alert" | "new_service",
        })),
      ),
    );
  } catch (error) {
    console.error("🔥 FULL ERROR in /news:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const handleGetBanners = async (_req: any, res: any) => {
  try {
    const rows = await db.select().from(bannersTable).where(eq(bannersTable.active, true)).orderBy(asc(bannersTable.order));
    res.json(
      rows.map((b) => ({
        id: String(b.id),
        image: b.image,
        title: b.title,
        description: b.description ?? undefined,
        link: b.link ?? undefined,
        order: b.order,
        active: b.active,
        featured: b.featured,
        showDiscoverBtn: b.showDiscoverBtn ?? false,
        showAutoExecBtn: b.showAutoExecBtn ?? false,
        showReliableBtn: b.showReliableBtn ?? false,
        showFeaturedBtn: b.showFeaturedBtn ?? false,
        show_discover_btn: b.showDiscoverBtn ?? false,
        show_auto_exec_btn: b.showAutoExecBtn ?? false,
        show_reliable_btn: b.showReliableBtn ?? false,
        show_featured_btn: b.showFeaturedBtn ?? false,
      })),
    );
  } catch (error) {
    console.error("🔥 FULL ERROR in /banners:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

router.get("/banners", handleGetBanners);
router.get("/public/banners", handleGetBanners);

router.get("/public/banners/featured", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(bannersTable)
      .where(and(eq(bannersTable.active, true), eq(bannersTable.featured, true)))
      .orderBy(asc(bannersTable.order));
    res.json(
      rows.map((b) => ({
        id: String(b.id),
        image: b.image,
        title: b.title,
        description: b.description ?? undefined,
        link: b.link ?? undefined,
        order: b.order,
        active: b.active,
        featured: b.featured,
        showDiscoverBtn: b.showDiscoverBtn ?? false,
        showAutoExecBtn: b.showAutoExecBtn ?? false,
        showReliableBtn: b.showReliableBtn ?? false,
        showFeaturedBtn: b.showFeaturedBtn ?? false,
        show_discover_btn: b.showDiscoverBtn ?? false,
        show_auto_exec_btn: b.showAutoExecBtn ?? false,
        show_reliable_btn: b.showReliableBtn ?? false,
        show_featured_btn: b.showFeaturedBtn ?? false,
      })),
    );
  } catch (error) {
    console.error("🔥 FULL ERROR in /public/banners/featured:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/public/settings/show-featured-offers", async (_req, res) => {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "show_featured_offers")).limit(1);
    const val = row?.value;
    const showFeaturedOffers = val === "true" || val === true || val === undefined;
    res.json({ showFeaturedOffers, value: String(showFeaturedOffers) });
  } catch (error) {
    res.json({ showFeaturedOffers: true, value: "true" });
  }
});

const DEFAULT_PRODUCT_SECTIONS = [
  { id: "image", visible: true, order: 1, label: "صورة المنتج والبدائل", title: "صورة المنتج" },
  { id: "title", visible: true, order: 2, label: "اسم المنتج والتصنيف وحالة التوفر", title: "اسم المنتج" },
  { id: "price", visible: true, order: 3, label: "السعر المباشر والمجموع الكلي", title: "السعر" },
  { id: "rating", visible: true, order: 4, label: "شارات التقييم وشارات الخدمة", title: "التقييمات" },
  { id: "description", visible: true, order: 5, label: "وصف المنتج والملاحظات", title: "تفاصيل وملاحظات المنتج:" },
  { id: "quantity", visible: true, order: 6, label: "تحديد الكمية وباقات الشحن", title: "حدد الكمية المطلوبة:" },
  { id: "add_to_cart", visible: true, order: 7, label: "زر الإضافة إلى السلة", title: "إضافة إلى السلة", button_text: "إضافة إلى السلة" },
  { id: "buy_now", visible: true, order: 8, label: "زر الشراء وتأكيد الطلب", title: "تأكيد الشراء الفوري", button_text: "تأكيد الشراء الفوري" },
  { id: "guarantees", visible: true, order: 9, label: "شارات الأمان والضمان الفوري", title: "ضمانات وأمان الخدمة في المتجر" },
  { id: "reviews", visible: true, order: 10, label: "آراء وتقييمات العملاء", title: "تقييمات وآراء العملاء على الخدمة" },
  { id: "related_products", visible: true, order: 11, label: "منتجات ذات صلة من نفس القسم", title: "منتجات ذات صلة بنفس القسم" },
  { id: "share_buttons", visible: true, order: 12, label: "أزرار المشاركة والمفضلة", title: "مشاركة والمفضلة" },
  { id: "specifications", visible: false, order: 13, label: "المواصفات التقنية والشحن", title: "المواصفات والتفاصيل التقنية" }
];

const DEFAULT_PRODUCT_CUSTOMIZATION = {
  image_size: "250px",
  price_color: "#FDE68A",
  button_color: "#C8A45C",
  button_text_color: "#1A1A1A",
  bg_color: "#1A1A1A",
  text_color: "#FFFFFF",
  border_color: "#C8A45C",
  border_radius: "16px",
  font_family: "Cairo",
  product_name_color: "#FFFFFF",
  info_box_bg_color: "#242424",
  default_unit_price: 0,
  total_amount: 0,
  direct_shipping_label: "مطلوب للشحن المباشر"
};

const handleGetProductPageSettings = async (_req: any, res: any) => {
  try {
    let dbConfig: any = null;
    try {
      const configRows = await db.select().from(productPageConfigTable).limit(1);
      if (Array.isArray(configRows) && configRows.length > 0) {
        dbConfig = configRows[0];
      }
    } catch (e) {
      // fallback
    }

    const rows = await db.select().from(settingsTable);
    const map = new Map<string, any>();
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (row.key) {
          let val = row.value;
          if (typeof val === "string") {
            try { val = JSON.parse(val); } catch {}
          }
          map.set(row.key, val);
        }
      }
    }

    const sections = dbConfig?.sections || map.get("product_page_layout") || DEFAULT_PRODUCT_SECTIONS;
    const customization = dbConfig?.customization || map.get("product_page_style") || DEFAULT_PRODUCT_CUSTOMIZATION;
    const useLegacy = map.get("use_legacy_product_page") ?? map.get("product_legacy_mode") ?? false;

    const result: Record<string, any> = {
      sections,
      customization,
      use_legacy_product_page: Boolean(useLegacy === true || useLegacy === "true"),
      // Backwards compatibility flat properties
      product_image_size: customization.image_size || map.get("product_image_size") || "250px",
      product_layout_order: Array.isArray(sections) ? sections.map((s: any) => s.id) : ["image", "title", "price", "description", "quantity", "buy_now", "reviews", "related_products", "guarantees"],
      product_show_reviews: map.get("product_show_reviews") !== undefined ? map.get("product_show_reviews") : true,
      product_show_related: map.get("product_show_related") !== undefined ? map.get("product_show_related") : true,
      product_show_guarantees: map.get("product_show_guarantees") !== undefined ? map.get("product_show_guarantees") : true,
      product_bg_color: customization.bg_color || map.get("product_bg_color") || "#1A1A1A",
      product_text_color: customization.text_color || map.get("product_text_color") || "#FFFFFF",
      product_button_color: customization.button_color || map.get("product_button_color") || "#C8A45C",
      product_border_color: customization.border_color || map.get("product_border_color") || "#C8A45C",
      product_legacy_mode: Boolean(useLegacy === true || useLegacy === "true"),
    };

    res.json(result);
  } catch (error) {
    res.json({
      sections: DEFAULT_PRODUCT_SECTIONS,
      customization: DEFAULT_PRODUCT_CUSTOMIZATION,
      use_legacy_product_page: false,
      product_image_size: "250px",
      product_bg_color: "#1A1A1A",
      product_text_color: "#FFFFFF",
      product_button_color: "#C8A45C",
      product_border_color: "#C8A45C",
      product_legacy_mode: false,
    });
  }
};

router.get("/public/product-page-settings", handleGetProductPageSettings);
router.get("/public/product-page-config", handleGetProductPageSettings);
router.get("/product-page-settings", handleGetProductPageSettings);
router.get("/product-page-config", handleGetProductPageSettings);


export default router;
