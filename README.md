# Terenski izvještaji

Web aplikacija za unos terenskih posjeta (stručni saradnici, ustanove, apoteke, doktori)
sa generisanjem dnevnih i sedmičnih izvještaja u Word (.docx) formatu.

## Šta aplikacija radi

- Login/registracija (email + lozinka), svaki korisnik ima svoje privatne podatke
- Unos posjeta sa poljima: Datum, Stručni saradnik, Mjesto, Posjećena ustanova, Odjel u ustanovi,
  Doktor u ustanovi, Posjećena apoteka, Komentar, Ostavljeni uzorci, Ostavljeni promo artikli, Generalni komentar
- Nijedno polje nije obavezno
- Autocomplete za tekstualna polja na osnovu ranije unesenih vrijednosti
- Više posjeta po danu, sa dugmadima "Prethodna posjeta" / "Sljedeća posjeta"
- Dugme "Dnevni izvještaj" - preuzima Word dokument sa svim posjetama tog dana
- Dugme "Sedmični izvještaj" - preuzima Word dokument sa svim posjetama cijele sedmice (pon-ned)
- Responzivno za mobitel

## Arhitektura

- **Frontend**: React + Vite + Tailwind (statička aplikacija, može na bilo koji hosting)
- **Baza + login**: [Supabase](https://supabase.com) (besplatan plan je dovoljan za početak)
- **Word export**: generiše se u browseru (biblioteka `docx`), bez potrebe za serverom

Podaci su izolovani po korisniku pomoću Row Level Security u bazi - svaki novi nalog
automatski vidi samo svoje podatke. To znači da dodavanje novih korisnika kasnije
**ne zahtijeva nikakve izmjene koda** - samo se nove osobe registruju.

## 1. Postavljanje Supabase baze

1. Napravi besplatan nalog na [supabase.com](https://supabase.com) i novi projekat.
2. Idi u **SQL Editor** -> New query, zalijepi sadržaj fajla `supabase/schema.sql` i pokreni (Run).
   Ovo pravi tabelu `visits` i sigurnosna pravila (RLS).
3. Idi u **Authentication -> Providers** i provjeri da je Email prijava uključena (uključena je po defaultu).
   - Ako ne želiš da korisnici moraju potvrđivati email prije prijave (korisno dok testiraš sam),
     idi u **Authentication -> Settings** i isključi "Confirm email".
4. Idi u **Settings -> API** i kopiraj:
   - `Project URL`
   - `anon public` ključ

## 2. Pokretanje lokalno

```bash
npm install
cp .env.example .env
# otvori .env i zalijepi svoj Project URL i anon key
npm run dev
```

Aplikacija se otvara na `http://localhost:5173`. Registruj se sa svojim email/lozinkom
i počni unositi posjete.

## 3. Deploy na internet (da bude trajno dostupna)

Najlakše preko [Vercel](https://vercel.com) (besplatno za ovakav projekat):

1. Napravi git repozitorij od ovog foldera i push-uj na GitHub.
2. Na Vercel-u: "Add New Project" -> uveži GitHub repo.
3. U podešavanjima projekta (Environment Variables) dodaj:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Vercel automatski prepoznaje da je Vite projekat.

(Isto tako radi i na Netlify-u ili bilo kom drugom static hosting servisu.)

## Dodavanje novih korisnika

Za sada nema posebnog "admin" panela - svako ko zna link aplikacije se može sam
registrovati (dugme "Registruj se" na login ekranu), i automatski dobija svoj
izolovani prostor za podatke. Ako želiš da to ograničiš (npr. samo pozivnicom),
to se podešava u Supabase -> Authentication -> Settings ("Allow new users to sign up").

## Buduće proširenje: timski/menadžerski pregled

Ako kasnije zatreba da npr. menadžer vidi izvještaje više saradnika na jednom mjestu,
to se dodaje kroz:
- kolonu `role` na korisničkom profilu,
- dodatnu RLS politiku koja dozvoljava čitanje tuđih redova kada je `role = 'manager'`,
- mali admin ekran sa filterom po saradniku.

Struktura baze je već pripremljena za ovo (svaki red ima `user_id`), tako da je ovo
dodatak, a ne prepravka postojećeg.
