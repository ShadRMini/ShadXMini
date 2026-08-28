import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let schemaEnsured = false;

export async function ensureDatabaseSchema() {
  if (schemaEnsured) return;
  try {
    // 1. Providers table & columns
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS providers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        api_url TEXT,
        api_key TEXT,
        notes TEXT,
        priority INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        provider_type TEXT DEFAULT 'custom',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS name TEXT;
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS api_url TEXT;
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS api_key TEXT;
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS provider_type TEXT DEFAULT 'custom';
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS products_endpoint TEXT;
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS profile_endpoint TEXT;
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS order_endpoint TEXT;
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS check_endpoint TEXT;
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS token_header TEXT;
      ALTER TABLE providers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `);

    // 2. Deposits table columns
    await db.execute(sql`
      ALTER TABLE deposits ADD COLUMN IF NOT EXISTS telegram_message_id INTEGER;
      ALTER TABLE deposits ADD COLUMN IF NOT EXISTS proof_image TEXT;
      ALTER TABLE deposits ADD COLUMN IF NOT EXISTS amount_syp NUMERIC(14, 2);
    `);

    // 3. Products table columns
    await db.execute(sql`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS provider_unit_price NUMERIC(16, 8);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS store_profit_per_unit NUMERIC(16, 8) DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS final_unit_price NUMERIC(16, 8);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS min_quantity INTEGER;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS max_quantity INTEGER;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_type TEXT DEFAULT 'fixed';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_values JSONB;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS provider_id INTEGER;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
      ALTER TABLE products ADD COLUMN IF NOT EXISTS provider_product_id INTEGER;
    `);

    // 4. Users table columns
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS display_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by INTEGER;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 1;
    `);

    // 5. Settings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      )
    `);

    // 6. Tickets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_name TEXT,
        user_email TEXT,
        subject TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 7. Ticket messages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL,
        sender_type TEXT NOT NULL DEFAULT 'user',
        sender_name TEXT NOT NULL DEFAULT 'user',
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Seed default ticket if table is empty
    const checkTickets: any = await db.execute(sql`SELECT count(*)::int as c FROM tickets`);
    if (Number(checkTickets?.rows?.[0]?.c || 0) === 0) {
      const insertedTicket: any = await db.execute(sql`
        INSERT INTO tickets (id, user_name, user_email, subject, status, priority, created_at, updated_at)
        VALUES 
          (43, 'Kasem omari', 'alhedra4@gmail.com', 'طلب وكالة / API', 'pending', 'high', NOW(), NOW()),
          (42, 'Kasem omari', 'alhedra4@gmail.com', 'طلب وكالة / API', 'pending', 'medium', NOW() - interval '1 hour', NOW() - interval '1 hour')
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `);
      await db.execute(sql`
        INSERT INTO ticket_messages (ticket_id, sender_type, sender_name, message, created_at)
        VALUES 
          (43, 'user', 'Kasem omari', 'من اين استطيع شراء الدومين المطلوب', NOW()),
          (42, 'user', 'Kasem omari', 'السلام عليكم، أود تفعيل ميزة الربط المباشر API لحسابي', NOW() - interval '1 hour')
      `);
    }

    schemaEnsured = true;
    console.log("[DB Schema] Runtime schema verified and synchronized successfully.");
  } catch (error) {
    console.warn("[DB Schema] Error ensuring runtime schema columns:", error);
  }
}
