-- Additive PostgreSQL migration; apply after 2026-10-chat-safety.sql.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.chat_reports ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
ALTER TABLE public.chat_reports ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;
CREATE TABLE IF NOT EXISTS public.moderation_operators (
    user_id uuid NOT NULL,
    role varchar(255) NOT NULL CHECK (role IN ('CLIENTE', 'ENTRENADOR')),
    active boolean NOT NULL DEFAULT false,
    PRIMARY KEY (user_id, role)
);
CREATE TABLE IF NOT EXISTS public.chat_restrictions (
    user_id uuid PRIMARY KEY,
    active boolean NOT NULL,
    reporter_id uuid NOT NULL,
    message_id uuid NOT NULL,
    updated_at timestamp with time zone NOT NULL
);
CREATE TABLE IF NOT EXISTS public.moderation_audit (
    id uuid PRIMARY KEY,
    operator_id uuid NOT NULL,
    operator_role varchar(255) NOT NULL,
    reporter_id uuid NOT NULL,
    message_id uuid NOT NULL,
    target_id uuid NOT NULL,
    action varchar(255) NOT NULL,
    note varchar(1000) NOT NULL,
    created_at timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS moderation_audit_report_idx ON public.moderation_audit (reporter_id, message_id, created_at);
COMMIT;
