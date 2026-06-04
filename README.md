# VM 2026 – Tippekonkurranse ⚽

Full-stack World Cup 2026 betting competition app for friends.  
**Frontend:** Vite + React + TypeScript + Tailwind CSS  
**Backend:** Express via Netlify Functions  
**Database:** Supabase (PostgreSQL)

---

## Kom i gang

### 1. Opprett Supabase-prosjekt

1. Gå til [supabase.com](https://supabase.com) og opprett en gratis konto
2. Lag et nytt prosjekt
3. Gå til **SQL Editor** og kjør innholdet i [`supabase/schema.sql`](supabase/schema.sql)
4. Gå til **Project Settings → API** og kopier:
   - **Project URL** → `SUPABASE_URL` og `VITE_SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_KEY`
   - **anon** key → `VITE_SUPABASE_ANON_KEY`

### 2. Seed databasen

```bash
# Kopier og fyll inn .env
cp .env.example .env

pnpm install
pnpm seed
```

### 3. Lokalt utvikling

```bash
pnpm dev   # starter API (3001) + Vite (5173) parallelt
```

---

## Deploy til Netlify

1. Koble GitHub-repoet til Netlify
2. Build command: `pnpm run build`
3. Publish directory: `dist`
4. Legg til disse miljøvariablene under **Site settings → Environment variables**:

| Variabel | Verdi |
|---|---|
| `SUPABASE_URL` | https://xxxx.supabase.co |
| `SUPABASE_SERVICE_KEY` | service_role nøkkel |
| `VITE_SUPABASE_URL` | https://xxxx.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | anon nøkkel |
| `ADMIN_PASSWORD` | velg et passord |
| `VITE_FOOTBALL_API_KEY` | (valgfri) football-data.org nøkkel |

---

## Poengsystem

| Runde | Maks poeng |
|---|---|
| Gruppespill ×72 | 5 |
| 16-delsfinale ×16 | 6 |
| 8-delsfinale ×8 | 8 |
| Kvartfinale ×4 | 10 |
| Semifinale ×2 | 12 |
| Bronsefinale ×1 | 14 |
| Finale ×1 | 50 |
| **Totalt** | **648** |

## Innsats

- Voksne: 350 kr · Barn: 50 kr (Vipps før kampstart)
