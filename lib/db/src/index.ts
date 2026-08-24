import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

let pool: any;
let db: any;

try {
  if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  }
} catch (e) {
  console.warn("[AI Studio] Error connecting to PostgreSQL:", e);
}

if (!db) {
  console.warn("[AI Studio] DATABASE_URL not set or database offline — using fallback mock");
  pool = new Proxy({}, {
    get: (_, prop) => {
      if (prop === "query") return async () => ({ rows: [] });
      if (prop === "connect") return async () => ({ query: async () => ({ rows: [] }), release: () => {} });
      if (prop === "on") return () => {};
      if (prop === "end") return async () => {};
      return () => {};
    }
  });

  const queryChain: any = {
    from: () => queryChain,
    where: () => queryChain,
    orderBy: () => queryChain,
    groupBy: () => queryChain,
    limit: () => queryChain,
    offset: () => queryChain,
    leftJoin: () => queryChain,
    innerJoin: () => queryChain,
    rightJoin: () => queryChain,
    values: () => queryChain,
    set: () => queryChain,
    returning: () => queryChain,
    then: (resolve: (v: any) => any) => Promise.resolve([]).then(resolve),
    catch: (reject: (v: any) => any) => Promise.resolve([]).catch(reject),
  };

  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
  };

  db = new Proxy({}, {
    get: (_, prop) => {
      if (prop === "query") return new Proxy({}, { get: () => noOp });
      if (prop === "select" || prop === "insert" || prop === "update" || prop === "delete") {
        return () => queryChain;
      }
      if (prop === "transaction") {
        return async (cb: any) => cb(db);
      }
      return async () => [];
    },
  });
}

export { pool, db };
export * from "./schema/index.js";

