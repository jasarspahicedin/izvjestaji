-- Pokreni ovo u Supabase dashboardu: SQL Editor -> New query -> Run

create extension if not exists "pgcrypto";

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  visit_date date not null,
  visit_order integer not null default 1,
  strucni_saradnik text,
  mjesto text,
  posjecena_ustanova text,
  odjel_u_ustanovi text,
  doktor_u_ustanovi text,
  posjecena_apoteka text,
  komentar text,
  ostavljeni_uzorci text,
  ostavljeni_promo_artikli text,
  generalni_komentar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visits_user_date_idx on public.visits (user_id, visit_date, visit_order);

-- automatski azuriraj updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_visits_updated_at on public.visits;
create trigger trg_visits_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

-- Row Level Security: svaki korisnik vidi i mijenja SAMO svoje posjete.
-- Ovo je ono sto omogucava dodavanje vise korisnika kasnije bez ikakvih izmjena -
-- svaki novi nalog automatski dobija svoj izolovani prostor podataka.
alter table public.visits enable row level security;

drop policy if exists "select own visits" on public.visits;
create policy "select own visits" on public.visits
  for select using (auth.uid() = user_id);

drop policy if exists "insert own visits" on public.visits;
create policy "insert own visits" on public.visits
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own visits" on public.visits;
create policy "update own visits" on public.visits
  for update using (auth.uid() = user_id);

drop policy if exists "delete own visits" on public.visits;
create policy "delete own visits" on public.visits
  for delete using (auth.uid() = user_id);

-- NAPOMENA za buduce timske izvjestaje:
-- Ako kasnije zelis da npr. menadzer vidi izvjestaje vise saradnika,
-- najlakse je dodati kolonu "role" u profil korisnika i novu select policy
-- koja dozvoljava citanje redova drugih usera kad je role = 'manager'.
-- Javi se pa to dodamo kad zatreba.
