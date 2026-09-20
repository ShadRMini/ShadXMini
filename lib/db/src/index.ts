import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema/index.js";

const { Pool } = pg;

let pool: any;
let db: any;

if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in production. Refusing to run with JSON fallback.");
  }
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  } catch (e) {
    console.error("FATAL: Failed to connect to PostgreSQL in production:", e);
    process.exit(1);
  }
} else {
  try {
    if (process.env.DATABASE_URL) {
      pool = new Pool({ connectionString: process.env.DATABASE_URL });
      db = drizzle(pool, { schema });
    }
  } catch (e) {
    console.warn("[AI Studio] Error connecting to PostgreSQL in development:", e);
  }
}

if (!db) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production. Refusing to run with JSON fallback.");
  }
  console.warn("[AI Studio] DATABASE_URL not set or database offline — using smart fallback store");

  const STORE_PATH = path.resolve(process.cwd(), ".local_db_store.json");

  const DEFAULT_PAYMENT_METHODS = [
    {
      id: 1,
      code: "sham_cash",
      name: "شام كاش",
      subtitle: "تتطلب توثيق الحساب",
      instructions: "يرجى التحويل إلى عنوان المحفظة ثم إدخال رقم العملية للتأكيد الفوري.",
      walletAddress: "35147b5811bdc0bf07fdb11b85c8a5d",
      logoImage: "",
      qrImage: "",
      minAmount: 1,
      active: true,
      order: 1,
      category: "تلقائي",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 2,
      code: "syriatel_cash",
      name: "سيرياتيل كاش",
      subtitle: "شحن فوري",
      instructions: "يرجى التحويل إلى الرقم المعتمد وإرفاق إشعار الدفع.",
      walletAddress: "0991234567",
      logoImage: "",
      qrImage: "",
      minAmount: 1,
      active: true,
      order: 2,
      category: "فوري",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 3,
      code: "binance_pay",
      name: "Binance Pay",
      subtitle: "شحن فوري",
      instructions: "الدفع عبر معرف بينانس مع التأكيد السريع.",
      walletAddress: "xpay_binance@pay",
      logoImage: "",
      qrImage: "",
      minAmount: 1,
      active: true,
      order: 3,
      category: "فوري",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 4,
      code: "usdt_auto",
      name: "USDT تلقائي",
      subtitle: "شحن فوري",
      instructions: "تحويل شبكة TRC20 مع المعالجة التلقائية.",
      walletAddress: "TQn9Y2khEsLJW1ChVWFMSMeSTow5KaxnSE",
      logoImage: "",
      qrImage: "",
      minAmount: 5,
      active: true,
      order: 4,
      category: "فوري",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 5,
      code: "mtn_cash",
      name: "MTN Cash",
      subtitle: "مراجعة يدوية",
      instructions: "يرجى التحويل عبر MTN كاش ورفع إشعار العملية للمراجعة.",
      walletAddress: "0941234567",
      logoImage: "",
      qrImage: "",
      minAmount: 1,
      active: true,
      order: 5,
      category: "يدوي",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  let store: Record<string, any[]> = {
    payment_methods: DEFAULT_PAYMENT_METHODS,
  };

  try {
    if (fs.existsSync(STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8"));
      if (parsed && typeof parsed === "object") {
        store = { ...store, ...parsed };
        if (!store.payment_methods || store.payment_methods.length === 0) {
          store.payment_methods = DEFAULT_PAYMENT_METHODS;
        }
      }
    } else {
      fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("[Local DB Store] Error reading local store:", err);
  }

  function saveStore() {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
    } catch (err) {
      console.warn("[Local DB Store] Error saving local store:", err);
    }
  }

  function getTableName(table: any): string {
    if (!table) return "unknown";
    if (typeof table === "string") return table;
    const name =
      table?.[Symbol.for("drizzle:Name")] ||
      table?._?.name ||
      table?.name ||
      "unknown";
    return name;
  }

  function matchesCond(row: any, cond: any): boolean {
    if (!cond) return true;
    if (typeof cond !== "object") return true;

    // Check queryChunks if it's a Drizzle SQL object
    if (Array.isArray(cond.queryChunks)) {
      const chunks = cond.queryChunks;
      for (const chunk of chunks) {
        if (chunk && Array.isArray(chunk.queryChunks)) {
          const inner = chunk.queryChunks;
          const hasAnd = inner.some(
            (c: any) => c?.value && Array.isArray(c.value) && c.value.some((v: any) => String(v).includes(" and "))
          );
          const hasOr = inner.some(
            (c: any) => c?.value && Array.isArray(c.value) && c.value.some((v: any) => String(v).includes(" or "))
          );
          if (hasAnd) {
            const subConds = inner.filter((c: any) => c && c.queryChunks);
            return subConds.every((sub: any) => matchesCond(row, sub));
          }
          if (hasOr) {
            const subConds = inner.filter((c: any) => c && c.queryChunks);
            return subConds.some((sub: any) => matchesCond(row, sub));
          }
          return matchesCond(row, chunk);
        }
      }

      let colName = "";
      let targetVal: any = undefined;
      for (const chunk of chunks) {
        if (chunk && typeof chunk === "object" && chunk.name) {
          colName = chunk.name;
        } else if (
          chunk &&
          typeof chunk === "object" &&
          "value" in chunk &&
          !Array.isArray(chunk.value) &&
          chunk.value !== undefined
        ) {
          targetVal = chunk.value;
        }
      }
      if (colName && targetVal !== undefined) {
        const val = row[colName] ?? row[colName.replace(/_([a-z])/g, (_, g) => g.toUpperCase())];
        return String(val) === String(targetVal);
      }
    }
    return true;
  }

  pool = new Proxy({}, {
    get: (_, prop) => {
      if (prop === "query") return async () => ({ rows: [] });
      if (prop === "connect") return async () => ({ query: async () => ({ rows: [] }), release: () => {} });
      if (prop === "on") return () => {};
      if (prop === "end") return async () => {};
      return () => {};
    }
  });

  db = {
    select: () => {
      let selectedTable = "";
      let whereCond: any = null;
      let orderSpec: any = null;
      let limitCount: number | null = null;

      const chain: any = {
        from: (table: any) => {
          selectedTable = getTableName(table);
          return chain;
        },
        where: (cond: any) => {
          whereCond = cond;
          return chain;
        },
        orderBy: (spec: any) => {
          orderSpec = spec;
          return chain;
        },
        limit: (cnt: number) => {
          limitCount = cnt;
          return chain;
        },
        for: (_lockMode: string) => {
          return chain;
        },
        groupBy: () => chain,
        leftJoin: () => chain,
        innerJoin: () => chain,
        rightJoin: () => chain,
        then: (resolve: (v: any) => any, reject?: (v: any) => any) => {
          try {
            const rows = store[selectedTable] || [];
            let result = rows.filter((r) => matchesCond(r, whereCond));

            // Handle ordering
            if (orderSpec) {
              let orderCol = "order";
              let isDesc = false;
              if (orderSpec.queryChunks) {
                for (const chunk of orderSpec.queryChunks) {
                  if (chunk?.name) orderCol = chunk.name;
                  if (chunk?.value && Array.isArray(chunk.value) && chunk.value.some((v: any) => String(v).includes("desc"))) {
                    isDesc = true;
                  }
                }
              }
              result.sort((a, b) => {
                const va = a[orderCol] ?? a.id ?? 0;
                const vb = b[orderCol] ?? b.id ?? 0;
                return isDesc ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
              });
            }

            if (limitCount !== null) {
              result = result.slice(0, limitCount);
            }

            return Promise.resolve(result).then(resolve);
          } catch (e) {
            if (reject) return Promise.reject(e).catch(reject);
            throw e;
          }
        },
        catch: (reject: (v: any) => any) => {
          return chain.then((x: any) => x, reject);
        },
      };
      return chain;
    },

    insert: (table: any) => {
      const tableName = getTableName(table);
      let valuesData: any = null;

      const chain: any = {
        values: (data: any) => {
          valuesData = data;
          return chain;
        },
        returning: () => {
          if (!store[tableName]) store[tableName] = [];
          const list = store[tableName];
          const items = Array.isArray(valuesData) ? valuesData : [valuesData];
          const insertedItems = items.map((item) => {
            const maxId = list.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
            const newItem = {
              ...item,
              id: item.id !== undefined ? item.id : maxId + 1,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            };
            list.push(newItem);
            return newItem;
          });
          saveStore();
          return Promise.resolve(insertedItems);
        },
        then: (resolve: (v: any) => any) => {
          return chain.returning().then(resolve);
        },
        catch: (reject: (v: any) => any) => {
          return chain.returning().catch(reject);
        },
      };
      return chain;
    },

    update: (table: any) => {
      const tableName = getTableName(table);
      let setData: any = {};
      let whereCond: any = null;

      const chain: any = {
        set: (data: any) => {
          setData = data;
          return chain;
        },
        where: (cond: any) => {
          whereCond = cond;
          return chain;
        },
        returning: () => {
          if (!store[tableName]) store[tableName] = [];
          const list = store[tableName];
          const updated: any[] = [];
          for (let i = 0; i < list.length; i++) {
            if (matchesCond(list[i], whereCond)) {
              list[i] = {
                ...list[i],
                ...setData,
                updatedAt: new Date().toISOString(),
              };
              updated.push(list[i]);
            }
          }
          saveStore();
          return Promise.resolve(updated);
        },
        then: (resolve: (v: any) => any) => {
          return chain.returning().then(resolve);
        },
        catch: (reject: (v: any) => any) => {
          return chain.returning().catch(reject);
        },
      };
      return chain;
    },

    delete: (table: any) => {
      const tableName = getTableName(table);
      let whereCond: any = null;

      const chain: any = {
        where: (cond: any) => {
          whereCond = cond;
          return chain;
        },
        returning: () => {
          if (!store[tableName]) store[tableName] = [];
          const list = store[tableName];
          const remaining: any[] = [];
          const deleted: any[] = [];
          for (const item of list) {
            if (matchesCond(item, whereCond)) {
              deleted.push(item);
            } else {
              remaining.push(item);
            }
          }
          store[tableName] = remaining;
          saveStore();
          return Promise.resolve(deleted);
        },
        then: (resolve: (v: any) => any) => {
          return chain.returning().then(resolve);
        },
        catch: (reject: (v: any) => any) => {
          return chain.returning().catch(reject);
        },
      };
      return chain;
    },

    execute: async (sqlQuery: any) => {
      const str = String(sqlQuery?.queryChunks?.[0]?.value ?? sqlQuery?.strings?.[0] ?? sqlQuery ?? "").toLowerCase();
      if (str.includes("select count(*)") && str.includes("payment_methods")) {
        const count = store.payment_methods?.length || 0;
        return { rows: [{ c: count }] };
      }
      return { rows: [] };
    },

    transaction: async (cb: any) => cb(db),
  };
}

export { pool, db };
export * from "./schema/index.js";


