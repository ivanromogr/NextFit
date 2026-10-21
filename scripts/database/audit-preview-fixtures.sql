-- Read-only investigation of synthetic preview accounts whose response was lost.
-- Does not select password hashes, tokens, or any unrelated account.
-- A zero-row result means no active account matches these exact fixture markers.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';

SELECT 'cliente' AS fixture_role, id, email
FROM public.cliente
WHERE nombre = 'BetaPreview'
  AND apellido = 'Temporal'
  AND email ~ '^beta-preview-cliente-[0-9a-f]{20}@example[.]invalid$'
  AND active = true
  AND deleted_at IS NULL
UNION ALL
SELECT 'entrenador' AS fixture_role, id, email
FROM public.entrenador
WHERE nombre = 'BetaPreview'
  AND apellido = 'Temporal'
  AND email ~ '^beta-preview-entrenador-[0-9a-f]{20}@example[.]invalid$'
  AND active = true
  AND deleted_at IS NULL;

ROLLBACK;
