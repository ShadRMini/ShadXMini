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
      .where(eq(vipMembershipsTable.hidden, false))
      .orderBy(desc(vipMembershipsTable.requiredAmount));

    if (!allLevels || allLevels.length === 0) return null;

    // Find the highest level the user qualifies for
    const suitableLevel = allLevels.find((lvl) => totalSpent >= Number(lvl.requiredAmount || 0));

    if (suitableLevel && Number(suitableLevel.levelOrder) !== Number(user.vipLevel || 1)) {
      const newVipLevel = Number(suitableLevel.levelOrder);
      await db
        .update(usersTable)
        .set({ vipLevel: newVipLevel })
        .where(eq(usersTable.id, userId));

      const lvlName = suitableLevel.nameAr
        ? `${suitableLevel.nameAr} (${suitableLevel.name})`
        : suitableLevel.name;

      try {
        await createInternalNotification({
          targetType: "user",
          targetUserId: userId,
          title: "تمت ترقيتك! 🎉",
          content: `تمت ترقيتك إلى مستوى ${lvlName} بخصم ${Number(suitableLevel.discountPercent || 0)}%`,
        });
      } catch (err) {
        console.warn("[VIP Notification Warning]:", err);
      }

      console.log(`[VIP Upgrade] User #${userId} upgraded to ${lvlName} (Level ${newVipLevel})`);
      return { upgraded: true, newLevel: suitableLevel };
    }

    return { upgraded: false, level: suitableLevel };
  } catch (err: any) {
    console.error("[VIP Update Error]:", err);
    return null;
  }
}
