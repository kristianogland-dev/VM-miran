# VM 2026 – Tippekonkurranse ⚽

En full-stack webapplikasjon for fotball-VM 2026 tippekonkurranse blant venner.

## Kom i gang

### Krav
- Node.js 18+
- pnpm

### Installasjon

```bash
pnpm install
```

### Oppsett

Kopier `.env.example` til `.env` og fyll inn:

```env
VITE_FOOTBALL_API_KEY=din_api_nøkkel   # fra football-data.org (gratis tier)
ADMIN_PASSWORD=velg_et_passord
PORT=3001
```

> **API-nøkkel:** Registrer deg gratis på [football-data.org](https://www.football-data.org/) for live-resultater.

### Kjør lokalt

```bash
# Start både API-server og Vite-dev-server
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

### Bygg for produksjon

```bash
pnpm build
```

---

## Funksjoner

- **Poengtabell** – live rangeringsliste med auto-oppdatering hvert 60. sekund
- **Kamper** – live/kommende/ferdig-tabs med live-resultater fra football-data.org API
- **Mine tips** – lås inn tips for alle 72 gruppekamper + sluttspillkamper
- **Deltakere** – legg til/vis deltakere med innsatsstatus
- **Admin** – skriv inn resultater, omberegn poeng, marker betalingsstatus

## Poengsystem

| Runde | Maks poeng |
|---|---|
| Gruppespill (×72) | 5 |
| 16-delsfinale (×16) | 6 |
| 8-delsfinale (×8) | 8 |
| Kvartfinale (×4) | 10 |
| Semifinale (×2) | 12 |
| Bronsefinale (×1) | 14 |
| Finale (×1) | 50 |
| **Totalt** | **648** |

## Innsats

- Voksne: 350 kr (Vipps før kampstart)
- Barn: 50 kr

## Teknisk stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS
- **Backend:** Express.js + better-sqlite3 (SQLite)
- **Live-data:** football-data.org API
