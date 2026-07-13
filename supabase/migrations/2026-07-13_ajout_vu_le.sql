-- =============================================================================
--  Migration : ajout de la date de visionnage (vu_le)
--  ---------------------------------------------------------------------------
--  À exécuter dans le SQL Editor de Supabase UNIQUEMENT si ta base a été créée
--  avec une version de schema.sql antérieure à cette fonctionnalité.
--  (Une base neuve créée avec le schema.sql à jour contient déjà tout ceci.)
--
--  Idempotent : réexécutable sans risque.
-- =============================================================================

-- 1. La colonne date de visionnage (nullable).
alter table public.bibliotheque
  add column if not exists vu_le timestamptz;

-- 2. Le trigger qui horodate la complétion sans écraser une date existante.
create or replace function public.remplir_vu_le()
returns trigger as $$
begin
  if new.statut = 'termine' and new.vu_le is null then
    new.vu_le := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_remplir_vu_le on public.bibliotheque;
create trigger trg_remplir_vu_le
  before insert or update on public.bibliotheque
  for each row execute function public.remplir_vu_le();
