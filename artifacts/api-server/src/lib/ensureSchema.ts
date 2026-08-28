import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let schemaEnsured = false;

export async function ensureDatabaseSchema() {
  if (schemaEnsured) return;
  try {
    // 1. Providers table & columns
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        image TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        display_style TEXT NOT NULL DEFAULT 'large'
      );
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_style TEXT DEFAULT 'large';
    `);

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

    // 1.1 Categories table columns
    await db.execute(sql`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS columns_count INTEGER DEFAULT 2;
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
      ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
    `);

    // 3.1 Product changes log table & enum
    try {
      await db.execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_change_type') THEN
            CREATE TYPE product_change_type AS ENUM ('profit', 'max_quantity');
          END IF;
        END
        $$;
      `);
    } catch (e) {
      console.warn("[DB Schema] Enum product_change_type check warning:", e);
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_changes_log (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        change_type TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        provider_snapshot JSONB,
        admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        changed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      ALTER TABLE product_changes_log ADD COLUMN IF NOT EXISTS product_id INTEGER;
      ALTER TABLE product_changes_log ADD COLUMN IF NOT EXISTS change_type TEXT;
      ALTER TABLE product_changes_log ADD COLUMN IF NOT EXISTS old_value TEXT;
      ALTER TABLE product_changes_log ADD COLUMN IF NOT EXISTS new_value TEXT;
      ALTER TABLE product_changes_log ADD COLUMN IF NOT EXISTS provider_snapshot JSONB;
      ALTER TABLE product_changes_log ADD COLUMN IF NOT EXISTS admin_id INTEGER;
      ALTER TABLE product_changes_log ADD COLUMN IF NOT EXISTS changed_at TIMESTAMP DEFAULT NOW();
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

    // 8. Notifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        target_type TEXT NOT NULL DEFAULT 'all',
        target_user_id INTEGER,
        title TEXT,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'sent',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'all';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_user_id INTEGER;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS content TEXT;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
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

    // 9. API Keys table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        key_value TEXT NOT NULL UNIQUE,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // 10. Order Messages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS order_messages (
        id SERIAL PRIMARY KEY,
        event TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        body TEXT NOT NULL
      )
    `);

    // 11. Banners table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        image TEXT NOT NULL,
        title TEXT NOT NULL,
        link TEXT,
        "order" INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Seed default order messages if empty
    const checkOrderMsg: any = await db.execute(sql`SELECT count(*)::int as c FROM order_messages`);
    if (Number(checkOrderMsg?.rows?.[0]?.c || 0) === 0) {
      await db.execute(sql`
        INSERT INTO order_messages (event, title, body)
        VALUES 
          ('accepted', 'تم قبول طلبك بنجاح', 'تم معالجة طلبك رقم #{order_number} بنجاح من قبل النظام.'),
          ('rejected', 'عذراً، تم رفض الطلب', 'نأسف لإبلاغك بأنه تم رفض الطلب رقم #{order_number}. برجاء التواصل مع الدعم الفني.'),
          ('wait', 'جاري معالجة الطلب', 'طلبك رقم #{order_number} قيد المراجعة والمعالجة حالياً.')
        ON CONFLICT (event) DO NOTHING
      `);
    }

    // Seed default ShamCash settings if missing
    const shamcashKeys = [
      { key: "shamcash_api_base_url", val: "https://sam-api.pro/api" },
      { key: "shamcash_api_key", val: process.env.SAM_API_KEY || "" },
      { key: "shamcash_shamcash_identifier", val: process.env.SAM_SHAMCASH_IDENTIFIER || "" },
      { key: "shamcash_invoice_expiry_minutes", val: 15 },
      { key: "shamcash_webhook_secret", val: process.env.SAM_WEBHOOK_SECRET || "" },
      { key: "public_api_base_url", val: process.env.PUBLIC_API_BASE_URL || process.env.RENDER_EXTERNAL_URL || "" },
      { key: "news_ticker_speed", val: 15 }
    ];
    for (const item of shamcashKeys) {
      const existing: any = await db.execute(sql`SELECT key FROM settings WHERE key = ${item.key}`);
      const rows = existing?.rows || existing;
      if (!rows || rows.length === 0) {
        await db.execute(sql`
          INSERT INTO settings (key, value)
          VALUES (${item.key}, ${JSON.stringify(item.val)}::jsonb)
          ON CONFLICT (key) DO NOTHING
        `);
      }
    }

    // Seed default maintenance settings if missing
    const maintenanceDefaultKeys = [
      { key: "maintenance_mode", val: false },
      { key: "maintenance_title", val: "الموقع قيد الصيانة المؤقتة" },
      { key: "maintenance_message", val: "نعمل حاليًّا على تنفيذ مجموعة من أعمال الصيانة والتحديث لتحسين أداء الموقع، وتعزيز مستوى الأمان، وتطوير تجربة المستخدم بشكل أفضل. نعتذر عن أي إزعاج قد يسببه ذلك، ونرجو منكم التفضل بالعودة لاحقًا." },
      { key: "maintenance_icon", val: "Wrench" },
      { key: "maintenance_contact_enabled", val: true },
      { key: "maintenance_contact_text", val: "تواصل معنا" },
      { key: "maintenance_contact_url", val: "/support" },
      { key: "maintenance_estimated_time", val: "" },
      { key: "use_legacy_product_form", val: false },
      { key: "use_legacy_dashboard", val: false },
    ];
    for (const item of maintenanceDefaultKeys) {
      const existing: any = await db.execute(sql`SELECT key FROM settings WHERE key = ${item.key}`);
      const rows = existing?.rows || existing;
      if (!rows || rows.length === 0) {
        await db.execute(sql`
          INSERT INTO settings (key, value)
          VALUES (${item.key}, ${JSON.stringify(item.val)}::jsonb)
          ON CONFLICT (key) DO NOTHING
        `);
      }
    }

    schemaEnsured = true;
    console.log("[DB Schema] Runtime schema verified and synchronized successfully.");
  } catch (error) {
    console.warn("[DB Schema] Error ensuring runtime schema columns:", error);
  }
}
