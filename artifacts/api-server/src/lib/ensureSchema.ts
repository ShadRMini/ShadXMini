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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS total_spent NUMERIC(24, 12) DEFAULT 0;
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
      { key: "use_legacy_about_page", val: false },
      { key: "use_legacy_deposit_page", val: false },
      { key: "use_legacy_sidebar", val: false },
      {
        key: "deposit_page_config",
        val: {
          title: "شحن الرصيد",
          subtitle: "اختر طريقة الدفع المناسبة وقم بشحن محفظتك بسهولة وأمان",
          sections: {
            header: { visible: true, title: "شحن الرصيد", description: "أضف رصيداً إلى محفظتك واستمتع بخدماتنا" },
            payment_methods: { visible: true, title: "طرق الدفع المتاحة", description: "اختر طريقة الدفع المناسبة لك" },
            amounts: { visible: true, title: "المبالغ المقترحة", description: "اختر المبلغ الذي ترغب في شحنه", suggested_amounts: [10, 25, 50, 100, 250, 500] },
            custom_amount: { visible: true, label: "مبلغ مخصص", placeholder: "أدخل المبلغ الذي ترغب في شحنه", min: 1, max: 10000, currency: "USD" },
            instructions: {
              visible: true,
              title: "تعليمات الشحن",
              content: "يرجى اتباع التعليمات التالية لإتمام عملية الشحن بنجاح...",
              steps: [
                "اختر طريقة الدفع المناسبة",
                "أدخل المبلغ الذي ترغب في شحنه",
                "اتبع التعليمات الخاصة بطريقة الدفع المختارة",
                "تأكد من إدخال البيانات بشكل صحيح"
              ]
            }
          },
          payment_methods_list: [
            {
              id: "sham_cash",
              name: "شام كاش",
              icon: "Landmark",
              description: "الدفع عبر محفظة شام كاش",
              active: true,
              order: 1,
              fields: [
                { label: "رقم المحفظة", type: "text", required: true, placeholder: "أدخل رقم محفظة شام كاش" }
              ]
            },
            {
              id: "syriatel_cash",
              name: "سيريتل كاش",
              icon: "Smartphone",
              description: "الدفع عبر خدمة سيريتل كاش",
              active: true,
              order: 2,
              fields: [
                { label: "رقم الهاتف", type: "text", required: true, placeholder: "أدخل رقم هاتفك" }
              ]
            },
            {
              id: "bank_transfer",
              name: "تحويل بنكي",
              icon: "Landmark",
              description: "التحويل البنكي المباشر",
              active: true,
              order: 3,
              fields: [
                { label: "اسم البنك", type: "text", required: true, placeholder: "اسم البنك" },
                { label: "رقم الحساب", type: "text", required: true, placeholder: "رقم الحساب" },
                { label: "اسم المستفيد", type: "text", required: true, placeholder: "اسم المستفيد" }
              ]
            }
          ],
          styles: {
            bg_color: "#1A1A1A",
            text_color: "#FFFFFF",
            title_color: "#C8A45C",
            card_bg: "#2D2D2D",
            card_border: "#C8A45C/20",
            input_bg: "#3D3D3D",
            input_text: "#FFFFFF",
            input_border: "#4B5563",
            input_focus_border: "#C8A45C",
            button_bg: "#C8A45C",
            button_text: "#1A1A1A",
            button_hover: "#B8954A",
            border_radius: "16px",
            font_family: "Cairo",
            amount_button_bg: "#2D2D2D",
            amount_button_text: "#C8A45C",
            amount_button_active_bg: "#C8A45C",
            amount_button_active_text: "#1A1A1A"
          }
        }
      },
      {
        key: "about_us_config",
        val: {
          title: "من نحن",
          subtitle: "نحن منصة رقمية متكاملة تقدم حلولاً مبتكرة في عالم التجارة الإلكترونية والخدمات الرقمية",
          sections: [
            {
              id: "intro",
              type: "text",
              title: "قصتنا",
              content: "بدأت رحلتنا في تقديم أسرع وأرقى الخدمات الرقمية للبطاقات والشحن وباقات الألعاب بطرق سريعة وآمنة بأسعار منافسة ومعالجة فورية.",
              image: "",
              order: 1,
              visible: true
            },
            {
              id: "mission",
              type: "text",
              title: "رسالتنا",
              content: "تمكين الأفراد والشركات من الوصول إلى كافة الخدمات والبطاقات الرقمية بسهولة، سرعة وأمان لا مثيل له.",
              image: "",
              order: 2,
              visible: true
            },
            {
              id: "vision",
              type: "text",
              title: "رؤيتنا",
              content: "أن نكون الخيار الأول والمنصة الرائدة والأكثر موثوقية في المنطقة لتوفير حلول الشحن الرقمي والخدمات الإلكترونية.",
              image: "",
              order: 3,
              visible: true
            },
            {
              id: "team",
              type: "team",
              title: "فريقنا المتميز",
              members: [
                { name: "أحمد علي", role: "المدير التنفيذي", image: "", bio: "خبرة تزيد عن 8 سنوات في إدارة المنصات الرقمية وخدمات الدفع." },
                { name: "سارة المحمود", role: "مديرة الدعم والعمليات", image: "", bio: "متخصصة في جودة الخدمة ودعم العملاء الفوري على مدار الساعة." }
              ],
              order: 4,
              visible: true
            },
            {
              id: "stats",
              type: "stats",
              title: "إحصائيات المنصة",
              statistics: [
                { label: "عميل سعيد", value: "+10,000" },
                { label: "طلب مكتمل", value: "+50,000" },
                { label: "سرعة التنفيذ", value: "فوري" },
                { label: "ساعات الدعم", value: "24/7" }
              ],
              order: 5,
              visible: true
            },
            {
              id: "contact",
              type: "contact",
              title: "تواصل معنا مباشرة",
              email: "support@shadx.com",
              phone: "+963 900 000 000",
              address: "دمشق، سوريا",
              order: 6,
              visible: true
            }
          ],
          style: {
            bg_color: "#1A1A1A",
            text_color: "#FFFFFF",
            title_color: "#C8A45C",
            section_bg: "#2D2D2D",
            border_radius: "16px",
            font_family: "Cairo"
          }
        }
      },
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
      { key: "support_whatsapp", val: "+963900000000" },
      { key: "support_telegram", val: "ShadMiniSupport" },
      { key: "support_email", val: "support@shadmini.com" },
      { key: "support_phone", val: "+963900000000" },
      {
        key: "contact_page_config",
        val: {
          title: "تواصل معنا",
          subtitle: "نحن هنا لمساعدتك. تواصل معنا عبر أي من القنوات التالية",
          channels: [
            {
              id: "whatsapp",
              name: "واتساب",
              icon: "MessageCircle",
              value: "+963900000000",
              link: "https://wa.me/963900000000",
              color: "#25D366",
              active: true,
              order: 1
            },
            {
              id: "telegram",
              name: "تليجرام",
              icon: "Send",
              value: "@ShadXMiniSupport",
              link: "https://t.me/ShadXMiniSupport",
              color: "#0088CC",
              active: true,
              order: 2
            },
            {
              id: "email",
              name: "البريد الإلكتروني",
              icon: "Mail",
              value: "support@shadxmini.com",
              link: "mailto:support@shadxmini.com",
              color: "#C8A45C",
              active: true,
              order: 3
            },
            {
              id: "phone",
              name: "الهاتف",
              icon: "Phone",
              value: "+963 900 000 000",
              link: "tel:+963900000000",
              color: "#3B82F6",
              active: true,
              order: 4
            }
          ],
          sections: {
            channels: { visible: true, title: "قنوات التواصل" },
            form: { visible: true, title: "أرسل لنا رسالة", subtitle: "أو أرسل لنا رسالة مباشرة" },
            faq: { visible: true, title: "الأسئلة الشائعة" },
            map: { visible: false, title: "موقعنا", embed_url: "" }
          },
          form_fields: {
            name: { visible: true, label: "الاسم الكامل", placeholder: "أدخل اسمك الكامل", required: true },
            email: { visible: true, label: "البريد الإلكتروني", placeholder: "أدخل بريدك الإلكتروني", required: true },
            subject: { visible: true, label: "الموضوع", placeholder: "اختر الموضوع", required: true, options: ["استفسار عام", "مشكلة تقنية", "اقتراح", "شكوى", "أخرى"] },
            message: { visible: true, label: "الرسالة", placeholder: "اكتب رسالتك هنا...", required: true }
          },
          faq: [
            { id: "faq1", question: "كيف يمكنني شحن رصيدي؟", answer: "يمكنك شحن رصيدك من خلال صفحة المحفظة باستخدام طرق الدفع المتاحة.", order: 1 },
            { id: "faq2", question: "ما هي مدة معالجة الطلبات؟", answer: "يتم معالجة الطلبات عادة خلال دقائق، وقد تستغرق بعض الطلبات حتى 24 ساعة.", order: 2 },
            { id: "faq3", question: "كيف أتوثيق حسابي؟", answer: "يمكنك توثيق حسابك من خلال صفحة توثيق الهوية في القائمة الجانبية.", order: 3 }
          ],
          styles: {
            bg_color: "#1A1A1A",
            card_bg: "#2D2D2D",
            title_color: "#C8A45C",
            text_color: "#E5E7EB",
            border_color: "#C8A45C"
          }
        }
      },
      { key: "use_legacy_contact_page", val: false },
      { key: "guest_preview_enabled", val: true },
      { key: "guest_preview_message", val: "أنت الآن في وضع الاستعراض كزائر. يرجى تسجيل الدخول أو إنشاء حساب جديد للوصول إلى كافة الميزات وإتمام عمليات الشراء والشحن." },
      { key: "guest_preview_banner_text", val: "وضع استعراض الزائر مفعّل — سجل الدخول للتمتع بكافة الخدمات" },
      { key: "guest_preview_login_button", val: "تسجيل الدخول" },
      { key: "guest_preview_register_button", val: "إنشاء حساب" },
      { key: "guest_preview_allow_contact", val: true },
      { key: "guest_preview_allow_about", val: true },
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
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'new',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

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

    // 13. Identity Verifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS identity_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        id_front_image TEXT NOT NULL,
        id_back_image TEXT NOT NULL,
        selfie_image TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        rejection_reason TEXT,
        reviewed_by INTEGER,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS reviewed_by INTEGER;
      ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
    `).catch((err: any) => {
      console.warn("[ensureSchema] identity_verifications alter warning:", err?.message);
    });

    // 14. VIP Memberships table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vip_memberships (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        name_ar TEXT NOT NULL DEFAULT '',
        level_order INTEGER NOT NULL DEFAULT 1,
        required_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
        profit_pct NUMERIC(5, 2),
        badge_color TEXT DEFAULT '#C8A45C',
        badge TEXT,
        benefits JSONB DEFAULT '[]',
        description TEXT,
        hidden BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS name_ar TEXT DEFAULT '';
      ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS level_order INTEGER DEFAULT 1;
      ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0;
      ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS profit_pct NUMERIC(5, 2);
      ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS badge_color TEXT DEFAULT '#C8A45C';
      ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS badge TEXT;
      ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]';
      ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;
      ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE vip_memberships ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

    // Insert or update the 5 standard ready-made VIP levels
    await db.execute(sql`
      INSERT INTO vip_memberships (id, name, name_ar, level_order, required_amount, discount_percent, badge_color, benefits, description, hidden)
      VALUES 
        (1, 'Pro', 'بروتو', 1, 0, 0.00, '#9CA3AF', '["مستوى أساسي", "لا خصومات"]'::jsonb, 'المستوى الأساسي لجميع المستخدمين الجدد', false),
        (2, 'Silver', 'فضي', 2, 300, 5.00, '#C0C0C0', '["خصم 5%", "دعم أولوية"]'::jsonb, 'مستوى فضي مع خصومات ومزايا إضافية', false),
        (3, 'Gold', 'ذهبي', 3, 500, 10.00, '#C8A45C', '["خصم 10%", "توصيل مجاني", "دعم أولوية"]'::jsonb, 'مستوى ذهبي مع خصومات ومزايا مميزة', false),
        (4, 'Diamond', 'ماسي', 4, 1000, 15.00, '#60A5FA', '["خصم 15%", "توصيل مجاني", "دعم مباشر", "هدايا شهرية"]'::jsonb, 'مستوى ماسي مع خصومات ومزايا حصرية', false),
        (5, 'VIP', 'VIP', 5, 2500, 20.00, '#A855F7', '["خصم 20%", "كل المزايا السابقة", "مدير حساب مخصص", "دخول مبكر للعروض"]'::jsonb, 'مستوى VIP مع كل المزايا الحصرية', false)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Sync sequence to avoid collision when creating new levels
    await db.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('vip_memberships', 'id'),
        COALESCE((SELECT MAX(id) FROM vip_memberships), 5),
        true
      );
    `).catch(() => null);

    // Ensure legacy interface settings defaults
    await db.execute(sql`
      INSERT INTO settings (key, value) VALUES 
        ('use_legacy_sidebar', 'false'),
        ('use_legacy_auth_pages', 'false'),
        ('use_legacy_product_form', 'false'),
        ('use_legacy_dashboard', 'false'),
        ('use_legacy_api_products', 'false'),
        ('use_legacy_users_page', 'false'),
        ('use_legacy_settings_page', 'false'),
        ('use_legacy_theme_page', 'false'),
        ('use_legacy_social_links_page', 'false'),
        ('use_legacy_banners_page', 'false'),
        ('use_legacy_contact_page', 'false'),
        ('use_legacy_about_page', 'false'),
        ('use_legacy_deposit_page', 'false'),
        ('use_legacy_product_page', 'false')
      ON CONFLICT (key) DO NOTHING;
    `).catch(() => null);

    // Ensure auth_pages_config default setting
    const defaultAuthConfigJson = JSON.stringify({
      login: {
        title: "تسجيل الدخول",
        subtitle: "مرحباً بك مجدداً",
        branding: {
          title: "أهلاً بعودتك!",
          subtitle: "سجل دخولك للوصول إلى حسابك وخدماتك",
          icon: "LogIn",
          benefits: [
            { icon: "Shield", text: "حساب آمن ومحمي" },
            { icon: "Zap", text: "خدمات سريعة وموثوقة" },
            { icon: "Headphones", text: "دعم فني على مدار الساعة" }
          ]
        },
        fields: {
          usernameLabel: "اسم المستخدم أو البريد الإلكتروني",
          usernamePlaceholder: "أدخل اسم المستخدم أو البريد",
          passwordLabel: "كلمة المرور",
          passwordPlaceholder: "أدخل كلمة المرور",
          showForgotPassword: true,
          forgotPasswordText: "نسيت كلمة السر؟",
          submitButtonText: "تسجيل الدخول",
          switchToRegisterText: "ليس لديك حساب؟",
          switchToRegisterLink: "إنشاء حساب جديد"
        },
        showGoogleButton: true,
        googleButtonText: "تسجيل الدخول بحساب Google",
        showDivider: true,
        dividerText: "أو"
      },
      register: {
        title: "إنشاء حساب جديد",
        subtitle: "انضم إلينا الآن",
        branding: {
          title: "انضم إلينا",
          subtitle: "أنشئ حسابك الآن وابدأ تجربتك",
          icon: "UserPlus",
          benefits: [
            { icon: "Package", text: "خدمات متنوعة وحصرية" },
            { icon: "ShieldCheck", text: "حساب آمن ومحمي" },
            { icon: "Zap", text: "تنفيذ فوري للطلبات" },
            { icon: "Headphones", text: "دعم فني على مدار الساعة" }
          ]
        },
        fields: {
          usernameLabel: "اسم المستخدم",
          usernamePlaceholder: "أدخل اسم المستخدم",
          usernameHint: "اختر اسم مستخدم فريد",
          passwordLabel: "كلمة المرور",
          passwordPlaceholder: "أدخل كلمة المرور",
          confirmPasswordLabel: "تأكيد كلمة المرور",
          confirmPasswordPlaceholder: "أعد إدخال كلمة المرور",
          emailLabel: "البريد الإلكتروني",
          emailPlaceholder: "example@email.com",
          submitButtonText: "إنشاء الحساب",
          switchToLoginText: "لديك حساب بالفعل؟",
          switchToLoginLink: "تسجيل الدخول"
        },
        passwordRequirements: {
          enabled: true,
          title: "متطلبات كلمة المرور",
          showMinLength: true,
          minLength: 8,
          showUppercase: true,
          uppercaseText: "حرف كبير (A-Z)",
          showLowercase: true,
          lowercaseText: "حرف صغير (a-z)",
          showNumber: true,
          numberText: "رقم واحد (0-9)",
          showSpecial: true,
          specialText: "رمز خاص (@#$%)"
        },
        emailVerification: {
          enabled: true,
          hintText: "سيتم إرسال رمز تحقق لتأكيد البريد الإلكتروني"
        },
        showGoogleButton: true,
        googleButtonText: "التسجيل بحساب Google",
        showDivider: true,
        dividerText: "أو"
      },
      common: {
        backToHomeText: "العودة للصفحة الرئيسية",
        styles: {
          titleColor: "#C8A45C",
          subtitleColor: "#9CA3AF",
          labelColor: "#E5E7EB",
          inputTextColor: "#FFFFFF",
          inputBgColor: "#3D3D3D",
          inputBorderColor: "#4B5563",
          inputFocusBorderColor: "#C8A45C",
          buttonBgColor: "#C8A45C",
          buttonTextColor: "#1A1A1A",
          buttonHoverColor: "#B8954A",
          brandingBgColor: "#C8A45C",
          brandingTextColor: "#FFFFFF",
          brandingIconColor: "#FFFFFF"
        }
      }
    });

    await db.execute(sql`
      INSERT INTO settings (key, value) VALUES ('auth_pages_config', ${defaultAuthConfigJson}::jsonb)
      ON CONFLICT (key) DO NOTHING;
    `).catch(async () => {
      // Fallback if column is text or json
      await db.execute(sql`
        INSERT INTO settings (key, value) VALUES ('auth_pages_config', ${defaultAuthConfigJson})
        ON CONFLICT (key) DO NOTHING;
      `).catch(() => null);
    });

    // Ensure Guest Preview (استطلاع الزائر الجديد) default settings
    await db.execute(sql`
      INSERT INTO settings (key, value) VALUES 
        ('guest_preview_enabled', 'true'),
        ('guest_preview_title', '"مرحباً بك في ShadMini"'),
        ('guest_preview_subtitle', '"استعرض الأقسام الآن، وسجّل دخولك للاستفادة من كل المزايا"'),
        ('guest_preview_login_button', '"تسجيل الدخول"'),
        ('guest_preview_register_button', '"إنشاء حساب جديد"'),
        ('guest_preview_note', '"لا يمكنك الشراء أو استخدام المتجر بدون حساب. اضغط على أي قسم أو منتج للتسجيل."')
      ON CONFLICT (key) DO NOTHING;
    `).catch(async () => {
      const guestDefaults = [
        { key: "guest_preview_enabled", val: "true" },
        { key: "guest_preview_title", val: "مرحباً بك في ShadMini" },
        { key: "guest_preview_subtitle", val: "استعرض الأقسام الآن، وسجّل دخولك للاستفادة من كل المزايا" },
        { key: "guest_preview_login_button", val: "تسجيل الدخول" },
        { key: "guest_preview_register_button", val: "إنشاء حساب جديد" },
        { key: "guest_preview_note", val: "لا يمكنك الشراء أو استخدام المتجر بدون حساب. اضغط على أي قسم أو منتج للتسجيل." }
      ];
      for (const item of guestDefaults) {
        await db.execute(sql`
          INSERT INTO settings (key, value) VALUES (${item.key}, ${JSON.stringify(item.val)}::jsonb)
          ON CONFLICT (key) DO NOTHING;
        `).catch(() => null);
      }
    });

    // 15. Ensure payment_methods table and seed default methods
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS payment_methods (
          id SERIAL PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          subtitle TEXT NOT NULL,
          instructions TEXT,
          wallet_address TEXT,
          logo_image TEXT,
          qr_image TEXT,
          min_amount NUMERIC(12, 2) NOT NULL DEFAULT 1,
          active BOOLEAN NOT NULL DEFAULT true,
          "order" INTEGER NOT NULL DEFAULT 0,
          category TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      await db.execute(sql`
        ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS category TEXT;
        ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
        ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      `).catch(() => null);

      const checkPaymentMethods: any = await db.execute(sql`SELECT count(*)::int as c FROM payment_methods`);
      const count = Number(checkPaymentMethods?.rows?.[0]?.c ?? checkPaymentMethods?.[0]?.c ?? 0);
      if (count === 0) {
        await db.execute(sql`
          INSERT INTO payment_methods (id, code, name, subtitle, instructions, wallet_address, logo_image, qr_image, min_amount, active, "order", category)
          VALUES
            (1, 'sham_cash', 'شام كاش', 'تتطلب توثيق الحساب', 'يرجى التحويل إلى عنوان المحفظة ثم إدخال رقم العملية للتأكيد الفوري.', '35147b5811bdc0bf07fdb11b85c8a5d', '', '', 1, true, 1, 'تلقائي'),
            (2, 'syriatel_cash', 'سيرياتيل كاش', 'شحن فوري', 'يرجى التحويل إلى الرقم المعتمد وإرفاق إشعار الدفع.', '0991234567', '', '', 1, true, 2, 'فوري'),
            (3, 'binance_pay', 'Binance Pay', 'شحن فوري', 'الدفع عبر معرف بينانس مع التأكيد السريع.', 'xpay_binance@pay', '', '', 1, true, 3, 'فوري'),
            (4, 'usdt_auto', 'USDT تلقائي', 'شحن فوري', 'تحويل شبكة TRC20 مع المعالجة التلقائية.', 'TQn9Y2khEsLJW1ChVWFMSMeSTow5KaxnSE', '', '', 5, true, 4, 'فوري'),
            (5, 'mtn_cash', 'MTN Cash', 'مراجعة يدوية', 'يرجى التحويل عبر MTN كاش ورفع إشعار العملية للمراجعة.', '0941234567', '', '', 1, true, 5, 'يدوي')
          ON CONFLICT (code) DO NOTHING;
        `);

        await db.execute(sql`
          SELECT setval(
            pg_get_serial_sequence('payment_methods', 'id'),
            COALESCE((SELECT MAX(id) FROM payment_methods), 5),
            true
          );
        `).catch(() => null);
        console.log("[DB Schema] Seeded 5 payment methods successfully.");
      }
    } catch (pmErr) {
      console.warn("[DB Schema] Error seeding payment_methods:", pmErr);
    }

    schemaEnsured = true;
    console.log("[DB Schema] Runtime schema verified and synchronized successfully.");
  } catch (error) {
    console.warn("[DB Schema] Error ensuring runtime schema columns:", error);
  }
}
