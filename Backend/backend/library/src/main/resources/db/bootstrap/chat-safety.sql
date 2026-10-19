-- Additive PostgreSQL schema for chat safety. No user/message data is changed.
-- Apply through the deployment's migration procedure; this file is not auto-run.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE IF NOT EXISTS public.chat_blocks (
    owner_id uuid NOT NULL,
    target_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    PRIMARY KEY (owner_id, target_id)
);
CREATE TABLE IF NOT EXISTS public.chat_reports (
    reporter_id uuid NOT NULL,
    message_id uuid NOT NULL,
    reported_user_id uuid NOT NULL,
    reason varchar(255) NOT NULL CHECK (reason IN ('HARASSMENT', 'SPAM', 'INAPPROPRIATE', 'OTHER')),
    created_at timestamp with time zone NOT NULL,
    status varchar(255) NOT NULL,
    PRIMARY KEY (reporter_id, message_id)
);
CREATE INDEX IF NOT EXISTS chat_reports_pending_idx ON public.chat_reports (status, created_at);
COMMIT;
