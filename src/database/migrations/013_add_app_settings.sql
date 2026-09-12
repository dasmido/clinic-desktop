CREATE TABLE app_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  clinic_name TEXT NOT NULL DEFAULT 'عيادتي',
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'IQD')),
  print_paper_size TEXT NOT NULL DEFAULT 'A4' CHECK (print_paper_size IN ('A4', '80MM')),
  telegram_bot_token TEXT NOT NULL DEFAULT '',
  telegram_chat_id TEXT NOT NULL DEFAULT '',
  telegram_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_settings (id) VALUES (1);
