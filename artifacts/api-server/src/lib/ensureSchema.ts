import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

let schemaEnsured = false;

export async function ensureDatabaseSchema() {
  if (schemaEnsured) return;
  try {
    // 0. Admins table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'admin',
        permissions JSONB,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

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
      );
    `);

    // 5.1 Banners table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS banners (
        id SERIAL PRIMARY KEY,
        image TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        link TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        featured BOOLEAN NOT NULL DEFAULT false,
        show_discover_btn BOOLEAN NOT NULL DEFAULT false,
        show_auto_exec_btn BOOLEAN NOT NULL DEFAULT false,
        show_reliable_btn BOOLEAN NOT NULL DEFAULT false,
        show_featured_btn BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE banners ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE banners ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
      ALTER TABLE banners ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
      ALTER TABLE banners ADD COLUMN IF NOT EXISTS show_discover_btn BOOLEAN DEFAULT false;
      ALTER TABLE banners ADD COLUMN IF NOT EXISTS show_auto_exec_btn BOOLEAN DEFAULT false;
      ALTER TABLE banners ADD COLUMN IF NOT EXISTS show_reliable_btn BOOLEAN DEFAULT false;
      ALTER TABLE banners ADD COLUMN IF NOT EXISTS show_featured_btn BOOLEAN DEFAULT false;
      ALTER TABLE banners ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
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
      { key: "use_legacy_api_products", val: false },
      { key: "use_legacy_users_page", val: false },
      { key: "use_legacy_settings_page", val: false },
      { key: "use_legacy_theme_page", val: false },
      { key: "use_legacy_social_links_page", val: false },
      { key: "use_legacy_banners_page", val: false },
      { key: "show_featured_offers", val: true },
      { key: "theme_primary", val: "#C8A45C" },
      { key: "theme_secondary", val: "#B8954A" },
      { key: "theme_accent", val: "#FDE68A" },
      { key: "theme_background", val: "#1A1A1A" },
      { key: "theme_text_primary", val: "#FFFFFF" },
      { key: "theme_font_arabic", val: "Changa" },
      { key: "theme_font_english", val: "Inter" },
      { key: "theme_border_radius", val: "16" },
      { key: "theme_shadow", val: "medium" },
      { key: "theme_default_mode", val: "dark" },
      { key: "theme_font_size", val: "14" },
      { key: "theme_logo_size", val: "80px" },
      { key: "admin_login_title", val: "ShadMini" },
      { key: "admin_login_subtitle", val: "لوحة الإدارة الفاخرة" },
      { key: "admin_dashboard_welcome", val: "مرحبًا بك في لوحة إدارة ShadMini" },
      { key: "product_image_size", val: "250px" },
      { key: "product_layout_order", val: ["image", "title", "price", "description", "quantity", "buttons", "reviews", "related", "guarantees"] },
      { key: "product_show_reviews", val: true },
      { key: "product_show_related", val: true },
      { key: "product_show_guarantees", val: true },
      { key: "product_bg_color", val: "#1A1A1A" },
      { key: "product_text_color", val: "#FFFFFF" },
      { key: "product_button_color", val: "#C8A45C" },
      { key: "product_border_color", val: "#C8A45C" },
      { key: "product_legacy_mode", val: false },
      { key: "use_legacy_product_page", val: false },
      {
        key: "product_page_layout",
        val: [
          { id: "image", visible: true, order: 1, label: "صورة المنتج والبدائل" },
          { id: "title", visible: true, order: 2, label: "اسم المنتج والتصنيف وحالة التوفر" },
          { id: "price", visible: true, order: 3, label: "السعر المباشر والمجموع الكلي" },
          { id: "rating", visible: true, order: 4, label: "شارات التقييم وشارات الخدمة" },
          { id: "description", visible: true, order: 5, label: "وصف المنتج والملاحظات" },
          { id: "quantity", visible: true, order: 6, label: "تحديد الكمية وباقات الشحن" },
          { id: "buy_now", visible: true, order: 7, label: "زر الشراء وتأكيد الطلب" },
          { id: "guarantees", visible: true, order: 8, label: "شارات الأمان والضمان الفوري" },
          { id: "reviews", visible: true, order: 9, label: "آراء وتقييمات العملاء" },
          { id: "related_products", visible: true, order: 10, label: "منتجات ذات صلة من نفس القسم" },
          { id: "share_buttons", visible: true, order: 11, label: "أزرار المشاركة والمفضلة" },
          { id: "specifications", visible: false, order: 12, label: "المواصفات التقنية والشحن" }
        ]
      },
      {
        key: "product_page_style",
        val: {
          image_size: "250px",
          price_color: "#FDE68A",
          button_color: "#C8A45C",
          button_text_color: "#1A1A1A",
          bg_color: "#1A1A1A",
          text_color: "#FFFFFF",
          border_color: "#C8A45C",
          border_radius: "16px",
          font_family: "Cairo"
        }
      },
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

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_page_config (
        id SERIAL PRIMARY KEY,
        sections JSONB NOT NULL DEFAULT '[]',
        customization JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const existingConfig: any = await db.execute(sql`SELECT id FROM product_page_config LIMIT 1`);
    const configRows = existingConfig?.rows || existingConfig;
    if (!configRows || configRows.length === 0) {
      await db.execute(sql`
        INSERT INTO product_page_config (id, sections, customization) VALUES (
          1,
          '[
            {"id": "image", "visible": true, "order": 1, "label": "صورة المنتج والبدائل", "title": "صورة المنتج"},
            {"id": "title", "visible": true, "order": 2, "label": "اسم المنتج والتصنيف وحالة التوفر", "title": "اسم المنتج"},
            {"id": "price", "visible": true, "order": 3, "label": "السعر المباشر والمجموع الكلي", "title": "السعر"},
            {"id": "description", "visible": true, "order": 4, "label": "وصف المنتج والملاحظات", "title": "الوصف"},
            {"id": "quantity", "visible": true, "order": 5, "label": "تحديد الكمية وباقات الشحن", "title": "اختيار الكمية"},
            {"id": "add_to_cart", "visible": true, "order": 6, "label": "زر الإضافة إلى السلة", "title": "إضافة إلى السلة", "button_text": "إضافة إلى السلة"},
            {"id": "buy_now", "visible": true, "order": 7, "label": "زر الشراء وتأكيد الطلب", "title": "شراء الآن", "button_text": "شراء الآن"},
            {"id": "guarantees", "visible": true, "order": 8, "label": "شارات الأمان والضمان الفوري", "title": "الضمان والراحة"},
            {"id": "reviews", "visible": true, "order": 9, "label": "آراء وتقييمات العملاء", "title": "التقييمات والمراجعات"},
            {"id": "related_products", "visible": true, "order": 10, "label": "منتجات ذات صلة من نفس القسم", "title": "منتجات قد تعجبك"},
            {"id": "share_buttons", "visible": true, "order": 11, "label": "أزرار المشاركة والمفضلة", "title": "مشاركة والمفضلة"},
            {"id": "specifications", "visible": false, "order": 12, "label": "المواصفات التقنية والشحن", "title": "المواصفات والتفاصيل"}
          ]'::JSONB,
          '{
            "image_size": "medium",
            "price_color": "#FDE68A",
            "button_color": "#C8A45C",
            "button_text_color": "#1A1A1A",
            "bg_color": "#1A1A1A",
            "text_color": "#FFFFFF",
            "border_color": "#C8A45C",
            "border_radius": "16px",
            "font_family": "Cairo"
          }'::JSONB
        ) ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 12. Social Links table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS social_links (
        id SERIAL PRIMARY KEY,
        platform TEXT NOT NULL,
        url TEXT NOT NULL,
        label TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        icon TEXT
      );

      ALTER TABLE social_links ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
      ALTER TABLE social_links ADD COLUMN IF NOT EXISTS icon TEXT;
    `);

    const checkSocialLinks: any = await db.execute(sql`SELECT count(*)::int as c FROM social_links`);
    if (Number(checkSocialLinks?.rows?.[0]?.c || 0) === 0) {
      await db.execute(sql`
        INSERT INTO social_links (platform, label, url, "order", active)
        VALUES 
          ('telegram', 'قناة التحديثات والمعروضات', 'https://t.me/shadx_official', 1, true),
          ('whatsapp', 'خدمة العملاء الفورية', 'https://wa.me/963900000000', 2, true),
          ('instagram', 'الانستغرام - العروض واليوميات', 'https://instagram.com/shadx_official', 3, true),
          ('phone', 'الخط الساخن المباشر', 'tel:+963900000000', 4, true)
        ON CONFLICT DO NOTHING
      `);
    }

    schemaEnsured = true;
    console.log("[DB Schema] Runtime schema verified and synchronized successfully.");
  } catch (error) {
    console.warn("[DB Schema] Error ensuring runtime schema columns:", error);
  }
}
