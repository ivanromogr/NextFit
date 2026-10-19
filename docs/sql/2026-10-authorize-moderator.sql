-- Account explicitly designated by the owner. Run only against the intended deployment,
-- after installing the panel schema. No passwords/tokens or other accounts are modified.
BEGIN;
SET LOCAL lock_timeout = '5s';
-- Set the chosen account in this transaction before running the DO block:
-- SET LOCAL nextfit.moderator_email = 'chosen-account@example.com';
DO $$
DECLARE
    matches integer;
    target_email text := lower(trim(current_setting('nextfit.moderator_email', true)));
BEGIN
    IF target_email IS NULL OR target_email = '' THEN
        RAISE EXCEPTION 'Set nextfit.moderator_email to the intended account before activation';
    END IF;
    SELECT count(*) INTO matches FROM (
        SELECT id FROM public.cliente WHERE lower(trim(email)) = target_email AND active
        UNION ALL
        SELECT id FROM public.entrenador WHERE lower(trim(email)) = target_email AND active
    ) candidate;
    IF matches <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one active NextFit account; no moderation permission granted';
    END IF;
    INSERT INTO public.moderation_operators (user_id, role, active)
    SELECT id, 'CLIENTE', true FROM public.cliente WHERE lower(trim(email)) = target_email AND active
    UNION ALL
    SELECT id, 'ENTRENADOR', true FROM public.entrenador WHERE lower(trim(email)) = target_email AND active
    ON CONFLICT (user_id, role) DO UPDATE SET active = true;
END $$;
COMMIT;
-- To revoke: set active=false on this same user_id/role. Each moderation request
-- checks this entitlement again; a client-side link or old JWT cannot preserve access.
