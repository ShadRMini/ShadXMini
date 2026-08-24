import { Router, type IRouter } from "express";
import { db, userFavoritesTable, productsTable, categoriesTable } from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getOrCreateCurrentUser } from "../lib/currentUser.js";
import { addUnitPrices } from "../lib/pricing.js";

const router: IRouter = Router();

// GET /api/favorites - Get list of favorite products for the current user
router.get("/favorites", async (req, res) => {
  try {
    const user = await getOrCreateCurrentUser(req);
    const favs = await db
      .select({
        favoriteId: userFavoritesTable.id,
        favoritedAt: userFavoritesTable.createdAt,
        product: productsTable,
        categoryName: categoriesTable.name,
      })
      .from(userFavoritesTable)
      .innerJoin(productsTable, eq(userFavoritesTable.productId, productsTable.id))
      .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
      .where(eq(userFavoritesTable.userId, user.id))
      .orderBy(desc(userFavoritesTable.createdAt));

    const formatted = favs.map(({ favoriteId, favoritedAt, product: p, categoryName }) => {
      const finalPriceUsd =
        p.finalUnitPrice != null
          ? Number(p.finalUnitPrice)
          : Number(addUnitPrices(p.providerUnitPrice ?? p.basePriceUsd ?? 0, p.storeProfitPerUnit ?? p.priceUsd ?? 0));
      const minQty = p.minQuantity ?? (p.minQty != null ? Number(p.minQty) : 1);
      const safeMinQty = Number.isFinite(Number(minQty)) && Number(minQty) > 0 ? Number(minQty) : 1;

      return {
        favoriteId: String(favoriteId),
        favoritedAt: favoritedAt.toISOString(),
        id: String(p.id),
        name: p.name,
        categoryId: String(p.categoryId),
        categoryName: categoryName || "عام",
        image: p.image,
        order: p.order,
        priceUsd: finalPriceUsd,
        minTotalUsd: Number((finalPriceUsd * safeMinQty).toFixed(8)),
        priceSyp: Number(p.priceSyp),
        productType: p.productType,
        available: p.available,
        minQty: safeMinQty,
        maxQty: p.maxQuantity ?? (p.maxQty != null ? Number(p.maxQty) : undefined),
        description: p.description ?? undefined,
        featured: p.featured,
        isFavorite: true,
      };
    });

    return res.json(formatted);
  } catch (error: any) {
    if (error.statusCode === 401) {
      return res.status(401).json({ error: "يرجى تسجيل الدخول لعرض المفضلة" });
    }
    console.error("[Favorites Error]:", error);
    return res.status(500).json({ error: "فشل استرجاع المفضلة" });
  }
});

// POST /api/favorites/:productId - Add product to favorites
router.post("/favorites/:productId", async (req, res) => {
  try {
    const user = await getOrCreateCurrentUser(req);
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ error: "معرف المنتج غير صالح" });
    }

    // Check if product exists
    const prod = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
    if (prod.length === 0) {
      return res.status(404).json({ error: "المنتج غير موجود" });
    }

    // Check if already in favorites
    const existing = await db
      .select()
      .from(userFavoritesTable)
      .where(and(eq(userFavoritesTable.userId, user.id), eq(userFavoritesTable.productId, productId)))
      .limit(1);

    if (existing.length > 0) {
      return res.json({ success: true, message: "المنتج موجود بالفعل في المفضلة", isFavorite: true });
    }

    await db.insert(userFavoritesTable).values({
      userId: user.id,
      productId,
    });

    return res.json({ success: true, message: "تمت إضافة المنتج إلى المفضلة", isFavorite: true });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return res.status(401).json({ error: "يرجى تسجيل الدخول لإضافة المنتج للمفضلة" });
    }
    console.error("[Add Favorite Error]:", error);
    return res.status(500).json({ error: "فشل إضافة المنتج للمفضلة" });
  }
});

// DELETE /api/favorites/:productId - Remove product from favorites
router.delete("/favorites/:productId", async (req, res) => {
  try {
    const user = await getOrCreateCurrentUser(req);
    const productId = parseInt(req.params.productId, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ error: "معرف المنتج غير صالح" });
    }

    await db
      .delete(userFavoritesTable)
      .where(and(eq(userFavoritesTable.userId, user.id), eq(userFavoritesTable.productId, productId)));

    return res.json({ success: true, message: "تمت إزالة المنتج من المفضلة", isFavorite: false });
  } catch (error: any) {
    if (error.statusCode === 401) {
      return res.status(401).json({ error: "يرجى تسجيل الدخول لإزالة المنتج من المفضلة" });
    }
    console.error("[Remove Favorite Error]:", error);
    return res.status(500).json({ error: "فشل إزالة المنتج من المفضلة" });
  }
});

export default router;
