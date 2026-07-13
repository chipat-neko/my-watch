-- =============================================================================
--  Schéma de base de données My Watch (à exécuter dans Supabase)
--  ---------------------------------------------------------------------------
--  Comment l'utiliser :
--    1. Ouvre ton projet Supabase -> onglet "SQL Editor".
--    2. Colle l'intégralité de ce fichier et clique sur "Run".
--
--  On crée deux tables :
--    - bibliotheque   : les films/séries suivis par l'utilisateur
--    - episodes_vus   : les épisodes marqués comme vus
--
--  La sécurité au niveau ligne (RLS - Row Level Security) garantit que chaque
--  utilisateur ne peut lire et modifier QUE ses propres données.
-- =============================================================================

-- -----------------------------------------------------------------------------
--  Table : bibliotheque
-- -----------------------------------------------------------------------------
create table if not exists public.bibliotheque (
  id             uuid primary key default gen_random_uuid(),
  -- Propriétaire de la ligne : référence l'utilisateur connecté.
  utilisateur_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id        bigint not null,                 -- Identifiant TMDb du titre
  type           text not null check (type in ('film', 'serie')),
  titre          text not null,                   -- Copie du titre (affichage rapide)
  chemin_affiche text,                            -- Copie du chemin d'affiche TMDb
  statut         text not null default 'a_voir'
                   check (statut in ('a_voir', 'en_cours', 'termine', 'abandonne')),
  note_perso     numeric(3,1),                    -- Note perso sur 10 (ex : 8.5)
  source         text not null default 'manuel'
                   check (source in ('manuel', 'import_tvtime', 'import_netflix', 'import_trakt')),
  ajoute_le      timestamptz not null default now(),
  vu_le          timestamptz,                     -- Date de visionnage (si connue)
  -- Un même titre ne peut être présent qu'une fois par utilisateur.
  unique (utilisateur_id, tmdb_id, type)
);

-- -----------------------------------------------------------------------------
--  Trigger : renseigne automatiquement la date de visionnage (vu_le)
--  ---------------------------------------------------------------------------
--  Dès qu'une entrée est créée ou passe au statut "termine" sans date de
--  visionnage, on l'horodate. Une vu_le DÉJÀ renseignée n'est jamais écrasée
--  (ex : date d'historique conservée lors d'un import).
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
--  Table : episodes_vus
-- -----------------------------------------------------------------------------
create table if not exists public.episodes_vus (
  id             uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references auth.users (id) on delete cascade,
  serie_id       bigint not null,                 -- Id TMDb de la série
  episode_id     bigint not null,                 -- Id TMDb de l'épisode
  saison         int not null,
  numero         int not null,
  note           numeric(3,1),                    -- Note perso de l'épisode sur 10 (optionnelle)
  vu_le          timestamptz not null default now(),
  -- Un épisode ne peut être marqué "vu" qu'une seule fois par utilisateur.
  unique (utilisateur_id, episode_id)
);

-- Index pour accélérer la récupération des épisodes vus d'une série.
create index if not exists idx_episodes_vus_serie
  on public.episodes_vus (utilisateur_id, serie_id);

-- -----------------------------------------------------------------------------
--  Sécurité au niveau ligne (RLS)
-- -----------------------------------------------------------------------------
alter table public.bibliotheque enable row level security;
alter table public.episodes_vus enable row level security;

-- Politique : l'utilisateur ne voit et ne modifie que SES lignes.
-- (auth.uid() renvoie l'identifiant de l'utilisateur connecté.)
create policy "biblio_proprietaire" on public.bibliotheque
  for all
  using (auth.uid() = utilisateur_id)
  with check (auth.uid() = utilisateur_id);

create policy "episodes_proprietaire" on public.episodes_vus
  for all
  using (auth.uid() = utilisateur_id)
  with check (auth.uid() = utilisateur_id);
