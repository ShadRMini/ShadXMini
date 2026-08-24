import bcrypt from "bcryptjs";
import { db, adminsTable, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

export async function seedSuperAdmin() {
  try {
    const adminUsername = "ShadMini";
    const adminEmail = "shadyrahimox@gmail.com";
    const rawPassword = "qhA-qTp-2yF-S6K";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 1. Seed into admins table
    const existingAdmins = await db
      .select()
      .from(adminsTable)
      .where(or(eq(adminsTable.username, adminUsername), eq(adminsTable.email, adminEmail)))
      .limit(1);

    if (existingAdmins.length === 0) {
      await db.insert(adminsTable).values({
        username: adminUsername,
        password: hashedPassword,
        fullName: "ShadMini Super Admin",
        email: adminEmail,
        role: "super_admin",
        active: true,
        permissions: { all: true },
      });
      console.log("[Seed] Super Admin created in admins table:", adminEmail);
    } else {
      await db
        .update(adminsTable)
        .set({
          username: adminUsername,
          password: hashedPassword,
          fullName: "ShadMini Super Admin",
          email: adminEmail,
          role: "super_admin",
          active: true,
        })
        .where(eq(adminsTable.id, existingAdmins[0]!.id));
      console.log("[Seed] Super Admin updated in admins table:", adminEmail);
    }

    // 2. Seed into users table for unified access
    const existingUsers = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.username, adminUsername), eq(usersTable.email, adminEmail)))
      .limit(1);

    if (existingUsers.length === 0) {
      await db.insert(usersTable).values({
        displayId: "1001",
        username: adminUsername,
        email: adminEmail,
        passwordHash: hashedPassword,
        role: "super_admin",
        vipLevel: 4,
        balanceUsd: "1000",
        balanceSyp: "0",
      });
      console.log("[Seed] Super Admin created in users table:", adminEmail);
    } else {
      await db
        .update(usersTable)
        .set({
          username: adminUsername,
          email: adminEmail,
          passwordHash: hashedPassword,
          role: "super_admin",
          vipLevel: 4,
          banned: false,
        })
        .where(eq(usersTable.id, existingUsers[0]!.id));
      console.log("[Seed] Super Admin updated in users table:", adminEmail);
    }
  } catch (error) {
    console.error("[Seed Super Admin Error]:", error);
  }
}
