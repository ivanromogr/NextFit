-- Read-only inventory. Contains no account emails, tokens, passwords or message bodies.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT current_database() AS database_name, current_setting('server_version') AS version,
       pg_database_size(current_database()) AS database_bytes;
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
SELECT t.relname AS table_name, c.conname AS constraint_name, c.contype AS kind,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
ORDER BY t.relname, c.conname;
SELECT CASE WHEN storage_key LIKE 'cld\_%' ESCAPE '\' THEN 'cloudinary' ELSE 'legacy_local' END AS provider,
       count(*) AS files, coalesce(sum(size), 0) AS declared_bytes
FROM public.uploaded_files
GROUP BY 1;
SELECT count(*) AS active_internal_operators FROM public.moderation_operators WHERE active;
COMMIT;
