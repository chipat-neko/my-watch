-- =============================================================================
--  Migration : note personnelle par épisode
--  ---------------------------------------------------------------------------
--  À exécuter dans le SQL Editor de Supabase SI ta base a été créée avant cette
--  fonctionnalité. Idempotent : réexécutable sans risque.
-- =============================================================================

alter table public.episodes_vus
  add column if not exists note numeric(3,1);
