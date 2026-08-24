import { Router, type IRouter } from "express";
import { getOrCreateCurrentUser, getVipBadge, calculateVipLevel } from "../lib/currentUser.js";

const router: IRouter = Router();

router.get("/me", async (req, res) => {
  try {
    const u = await getOrCreateCurrentUser(req);
    const dynamicVip = calculateVipLevel(Number(u.totalSpent || 0), u.vipLevel ?? 1);
    const vipBadge = getVipBadge(dynamicVip);

    res.json({
      id: String(u.id),
      displayId: u.displayId || String(u.id),
      telegramId: u.telegramId || "",
      username: u.username,
      email: u.email || "",
      balanceUsd: Number(u.balanceUsd),
      balanceSyp: Number(u.balanceSyp),
      totalSpent: Number(u.totalSpent || 0),
      role: u.role,
      vipLevel: dynamicVip,
      vipBadge,
      avatarUrl: u.avatarUrl || null,
      identityMissing: false,
    });
  } catch (error: any) {
    res.status(200).json({
      id: "0",
      displayId: "1001",
      telegramId: "",
      username: "زائر متجر ShadXMini",
      email: "",
      balanceUsd: 0,
      balanceSyp: 0,
      totalSpent: 0,
      role: "user",
      vipLevel: 1,
      vipBadge: getVipBadge(1),
      avatarUrl: null,
      identityMissing: true,
      error: error?.message || "identity_missing",
    });
  }
});

export default router;
