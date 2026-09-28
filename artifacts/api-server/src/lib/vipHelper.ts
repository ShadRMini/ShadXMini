import { db, usersTable, vipMembershipsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { createInternalNotification } from "./notifications";

export async function updateUserVipLevel(userId: number) {
  try {
    if (!userId || isNaN(userId)) return null;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) return null;

    const totalSpent = Number(user.totalSpent || 0);

    const allLevels = await db
      .select()
      .from(vipMembershipsTable)
      .where(eq(vipMembershipsTable.hidden, false));

    if (!allLevels || allLevels.length === 0) return null;

    // Numerically sort levels descending by requiredAmount, then by levelOrder descending
    const sortedLevels = [...allLevels].sort((a, b) => {
      const amtA = Number(a.requiredAmount || 0);
      const amtB = Number(b.requiredAmount || 0);
      if (amtB !== amtA) return amtB - amtA;
      return Number(b.levelOrder || 0) - Number(a.levelOrder || 0);
    });

    // Find the highest level the user qualifies for based on dynamic requiredAmount
    const dynamicLevel = sortedLevels.find((lvl) => totalSpent >= Number(lvl.requiredAmount || 0));
    const dynamicVip = dynamicLevel ? Number(dynamicLevel.levelOrder || 1) : 1;

    // Current VIP level from DB
    const currentVip = Number(user.vipLevel ?? 1);

    // Key fix: Never downgrade an admin-assigned VIP level
    const finalVip = Math.max(currentVip, dynamicVip);

    if (finalVip !== currentVip) {
      await db
        .update(usersTable)
        .set({ vipLevel: finalVip })
        .where(eq(usersTable.id, userId));

      const upgradedLevel = sortedLevels.find((lvl) => Number(lvl.levelOrder) === finalVip) || dynamicLevel;
      const lvlName = upgradedLevel?.nameAr
        ? `${upgradedLevel.nameAr} (${upgradedLevel.name})`
        : (upgradedLevel?.name || `VIP ${finalVip}`);

      try {
        await createInternalNotification({
          targetType: "user",
          targetUserId: userId,
          title: "تمت ترقيتك! 🎉",
          content: `تمت ترقيتك إلى مستوى ${lvlName} بخصم ${Number(upgradedLevel?.discountPercent || 0)}%`,
        });
      } catch (err) {
        console.warn("[VIP Notification Warning]:", err);
      }

      console.log(`[VIP Upgrade] User #${userId} (Total Spent: $${totalSpent}) upgraded to ${lvlName} (Level ${finalVip})`);
      return { upgraded: true, newLevel: upgradedLevel };
    }

    return { upgraded: false, level: sortedLevels.find((lvl) => Number(lvl.levelOrder) === currentVip) || dynamicLevel };
  } catch (err: any) {
    console.error("[VIP Update Error]:", err);
    return null;
  }
}

// Alias for convenience
export const checkAndUpgradeVipLevel = updateUserVipLevel;
