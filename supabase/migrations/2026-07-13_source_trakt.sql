-- =============================================================================
--  Migration : autoriser la source d'entrée "import_trakt"
--  ---------------------------------------------------------------------------
--  À exécuter dans le SQL Editor de Supabase SI ta base a été créée avant le
--  connecteur Trakt.tv. Idempotent : réexécutable sans risque.
-- =============================================================================

alter table public.bibliotheque
  drop constraint if exists bibliotheque_source_check;

alter table public.bibliotheque
  add constraint bibliotheque_source_check
  check (source in ('manuel', 'import_tvtime', 'import_netflix', 'import_trakt'));
