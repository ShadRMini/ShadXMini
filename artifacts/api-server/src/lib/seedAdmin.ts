import bcrypt from "bcryptjs";
import { db, adminsTable, usersTable } from "@workspace/db";
import { count, eq, or, sql } from "drizzle-orm";

export async function seedSuperAdmin() {
  try {
    const adminUsername = process.env.ADMIN_SEED_USERNAME?.trim();
    const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim();
    const rawPassword = process.env.ADMIN_SEED_PASSWORD?.trim();

    // Check if any admin already exists in the system
    const existingAdminsCount = await db
      .select({ val: count() })
      .from(adminsTable);

    const totalAdmins = Number(existingAdminsCount[0]?.val ?? 0);
    if (totalAdmins > 0) {
      console.log("[Seed] Admin accounts already exist (%d found). Skipping initial admin seed.", totalAdmins);
      return;
    }

    // Only create initial admin if credentials are provided in env
    if (!adminUsername || !adminEmail || !rawPassword) {
      console.log("[Seed] No admin accounts exist, but ADMIN_SEED_USERNAME, ADMIN_SEED_EMAIL, or ADMIN_SEED_PASSWORD not set. Skipping seed.");
      return;
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // 1. Create super admin in adminsTable
    await db.insert(adminsTable).values({
      username: adminUsername,
      password: hashedPassword,
      fullName: `${adminUsername} Super Admin`,
      email: adminEmail,
      role: "super_admin",
      active: true,
      permissions: { all: true },
    });
    console.log("[Seed] Super Admin created in admins table:", adminEmail);

    // 2. Seed into users table for unified store/client access if not exists
    const existingUsers = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.username, adminUsername), eq(usersTable.email, adminEmail)))
      .limit(1);

    if (existingUsers.length === 0) {
      let nextDisplayId = "1001";
      try {
        const maxResult: any = await db.execute(
          sql`SELECT COALESCE(MAX(NULLIF(regexp_replace(display_id, '\D', '', 'g'), '')::INTEGER), 1000) + 1 as next FROM users`
        );
        const nextVal = maxResult?.rows?.[0]?.next ?? maxResult?.[0]?.next;
        if (nextVal) nextDisplayId = String(nextVal);
      } catch {
        nextDisplayId = String(Date.now()).slice(-6);
      }

      await db.insert(usersTable).values({
        displayId: nextDisplayId,
        username: adminUsername,
        email: adminEmail,
        passwordHash: hashedPassword,
        role: "super_admin",
        vipLevel: 4,
        balanceUsd: "0",
        balanceSyp: "0",
      });
      console.log("[Seed] Super Admin created in users table with displayId:", nextDisplayId, adminEmail);
    }
  } catch (error) {
    console.error("[Seed Super Admin Error]:", error);
  }
}

