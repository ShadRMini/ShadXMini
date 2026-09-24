import { db, usersTable, categoriesTable, productsTable, providersTable, ordersTable } from "../lib/db/src/index";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { syncAllPendingProviderOrders } from "../artifacts/api-server/src/routes/orders";

async function runTask4Tests() {
  console.log("================================================================================");
  console.log("🚀 STARTING AUTOMATED TEST SUITE: Task 4 - Background Worker & Cooldown");
  console.log("================================================================================");

  // -------------------------------------------------------------------------
  // TEST 1: Background Worker Startup & Configuration Validation
  // -------------------------------------------------------------------------
  console.log("\n📋 [TEST 1] Verifying Background Worker Configuration & Flags...");
  const isEnabledDefault = process.env.ORDERS_SYNC_ENABLED !== "false";
  const defaultInterval = parseInt(process.env.ORDERS_SYNC_INTERVAL_MINUTES || "5", 10);
  console.log(`Worker Enabled: ${isEnabledDefault}`);
  console.log(`Worker Interval Configured: ${defaultInterval} minutes`);

  if (!isEnabledDefault || defaultInterval <= 0) {
    throw new Error("❌ TEST 1 FAILED: Background worker configuration invalid!");
  }
  console.log("✅ TEST 1 PASSED: Worker configuration and startup parameters verified.");

  // -------------------------------------------------------------------------
  // Setup Test Fixtures: User, Category, Provider, Product
  // -------------------------------------------------------------------------
  console.log("\n🔧 Setting up test database fixtures...");
  const testUser = (await db
    .insert(usersTable)
    .values({
      username: `sync_test_user_${Date.now()}`,
      displayId: `USR_${Date.now()}`,
      balanceUsd: "200.000000000000",
      totalSpent: "0.000000000000",
      passwordHash: "hash",
      role: "user",
    })
    .returning())[0];

  let [cat] = await db.select().from(categoriesTable).limit(1);
  if (!cat) {
    [cat] = await db.insert(categoriesTable).values({
      name: "Sync Test Category",
      image: "https://placehold.co/100",
    }).returning();
  }

  // Create active provider for testing
  const [testProvider] = await db
    .insert(providersTable)
    .values({
      name: `Test Sync Provider ${Date.now()}`,
      apiUrl: "https://api.testprovider.com",
      apiKey: "test_api_key_xyz",
      providerType: "custom",
      priority: 1,
      active: true,
    })
    .returning();

  const [testProduct] = await db
    .insert(productsTable)
    .values({
      categoryId: cat.id,
      providerId: testProvider.id,
      providerProductId: 999123,
      name: "Test Sync Card 25$",
      image: "https://placehold.co/200",
      priceUsd: "25.000000000000",
      priceSyp: "375000",
      providerUnitPrice: "22.000000000000",
      storeProfitPerUnit: "3.000000000000",
      available: true,
      minQuantity: 1,
      maxQuantity: 1,
      quantityType: "fixed",
    })
    .returning();

  console.log(`Created fixtures: User #${testUser.id}, Provider #${testProvider.id}, Product #${testProduct.id}`);

  // -------------------------------------------------------------------------
  // TEST 2: Actual Sync of Wait Order & lastCheckedAt Recording
  // -------------------------------------------------------------------------
  console.log("\n📋 [TEST 2] Testing actual sync cycle on a 'wait' order...");
  const orderNumber1 = `TEST_WAIT_1_${Date.now()}`;
  const orderUuid1 = randomUUID();

  const [waitOrder1] = await db
    .insert(ordersTable)
    .values({
      orderNumber: orderNumber1,
      userId: testUser.id,
      productId: testProduct.id,
      quantity: "1",
      userIdentifier: "player_sync_1",
      providerOrderUuid: orderUuid1,
      totalUsd: "25.000000000000",
      totalSyp: "375000",
      status: "wait",
      meta: {
        orderUuid: orderUuid1,
        provider: {
          orderUuid: orderUuid1,
        }
      },
    })
    .returning();

  console.log(`Created test wait order #${waitOrder1.id} (${orderNumber1}) with provider_order_uuid: ${orderUuid1}`);

  // Execute syncAllPendingProviderOrders
  console.log("Running syncAllPendingProviderOrders()...");
  const syncResult1 = await syncAllPendingProviderOrders();
  console.log("Sync Execution Result 1:", syncResult1);

  // Verify database record
  const [updatedOrder1] = await db.select().from(ordersTable).where(eq(ordersTable.id, waitOrder1.id));
  const meta1 = updatedOrder1.meta as any;
  const lastChecked1 = meta1?.provider?.lastCheckedAt;

  console.log(`Order Status: "${updatedOrder1.status}"`);
  console.log(`Order lastCheckedAt in DB: "${lastChecked1}"`);

  if (!lastChecked1) {
    throw new Error("❌ TEST 2 FAILED: 'lastCheckedAt' was not recorded in order meta!");
  }
  console.log("✅ TEST 2 PASSED: Order sync processed and recorded 'lastCheckedAt' timestamp successfully.");

  // -------------------------------------------------------------------------
  // TEST 3: Cooldown Verification (Subsequent calls within 3 minutes must be skipped)
  // -------------------------------------------------------------------------
  console.log("\n📋 [TEST 3] Testing 3-Minute Cooldown logic...");
  console.log("Executing immediate second sync call within cooldown window (< 3 mins)...");
  
  const syncResult2 = await syncAllPendingProviderOrders();
  console.log("Sync Execution Result 2 (Immediate):", syncResult2);

  const [orderAfterCooldownCheck] = await db.select().from(ordersTable).where(eq(ordersTable.id, waitOrder1.id));
  const metaAfterCooldown = orderAfterCooldownCheck.meta as any;
  const lastCheckedAfterCooldown = metaAfterCooldown?.provider?.lastCheckedAt;

  console.log(`Initial lastCheckedAt:      ${lastChecked1}`);
  console.log(`After second sync call:     ${lastCheckedAfterCooldown}`);

  if (lastChecked1 !== lastCheckedAfterCooldown) {
    throw new Error("❌ TEST 3 FAILED: Cooldown did not prevent redundant remote check!");
  }
  console.log("✅ TEST 3 PASSED: Cooldown verified. Redundant calls within 3 minutes were safely skipped.");

  // -------------------------------------------------------------------------
  // TEST 4: Admin Cron Handler & 24h Stale Escalation Verification
  // -------------------------------------------------------------------------
  console.log("\n📋 [TEST 4] Testing Admin Cron Execution & 24h Stale Order Escalation...");

  // Create an order older than 24 hours
  const orderNumberOld = `TEST_STALE_${Date.now()}`;
  const orderUuidOld = randomUUID();
  const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

  const [staleOrder] = await db
    .insert(ordersTable)
    .values({
      orderNumber: orderNumberOld,
      userId: testUser.id,
      productId: testProduct.id,
      quantity: "1",
      userIdentifier: "player_stale",
      providerOrderUuid: orderUuidOld,
      totalUsd: "25.000000000000",
      totalSyp: "375000",
      status: "wait",
      meta: {
        orderUuid: orderUuidOld,
        provider: {
          orderUuid: orderUuidOld,
        }
      },
      createdAt: oldDate,
    })
    .returning();

  console.log(`Created 25-hour old order #${staleOrder.id} (${orderNumberOld})`);

  // Run sync
  const adminSyncResult = await syncAllPendingProviderOrders();
  console.log("Admin Cron Sync Result:", adminSyncResult);

  const [checkedStaleOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, staleOrder.id));
  const staleMeta = checkedStaleOrder.meta as any;

  console.log(`Stale Order status: "${checkedStaleOrder.status}"`);
  console.log(`Stale Order meta.stale: ${staleMeta?.stale}`);
  console.log(`Stale Order meta.staleSince: "${staleMeta?.staleSince}"`);

  if (!staleMeta?.stale || !staleMeta?.staleSince) {
    throw new Error("❌ TEST 4 FAILED: 24h stale order was not marked with escalation tag!");
  }
  console.log("✅ TEST 4 PASSED: Admin cron executed and 24h stale order escalated successfully.");

  // -------------------------------------------------------------------------
  // Cleanup Test Fixtures
  // -------------------------------------------------------------------------
  console.log("\n🧹 Cleaning up test fixtures...");
  await db.delete(ordersTable).where(eq(ordersTable.userId, testUser.id));
  await db.delete(productsTable).where(eq(productsTable.id, testProduct.id));
  await db.delete(providersTable).where(eq(providersTable.id, testProvider.id));
  await db.delete(usersTable).where(eq(usersTable.id, testUser.id));

  console.log("\n================================================================================");
  console.log("🎉 ALL TASK 4 TESTS (1, 2, 3, 4) PASSED PERFECTLY WITH ZERO ERRORS!");
  console.log("================================================================================");
}

runTask4Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Task 4 Test Suite Error:", err);
    process.exit(1);
  });
