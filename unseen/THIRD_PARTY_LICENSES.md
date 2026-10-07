# Third-party licences

## Scripture text
- **Berean Standard Bible (BSB)** — public domain. The bundled text in
  `server/app/content/bsb_verses.json` is used only so the hackathon demo runs
  offline. In production, verse text is fetched and verified live from the
  **YouVersion Platform API** under its terms.

## Fonts
- **Alegreya** and **Alegreya Sans** — SIL Open Font License 1.1.
  Licence files: `app/public/fonts/LICENSE-alegreya.txt`,
  `app/public/fonts/LICENSE-alegreya-sans.txt`.

## Runtime dependencies (app)
- React, React DOM (MIT)
- React Router (MIT)
- Zustand (MIT)
- Dexie (Apache-2.0)
- Vite, @vitejs/plugin-react, TypeScript (MIT / Apache-2.0)

## Runtime dependencies (server)
- FastAPI, Starlette (MIT)
- Uvicorn (BSD-3-Clause)
- httpx (BSD-3-Clause)
- Pydantic, pydantic-settings (MIT)
- redis-py (MIT)

## Services
- **Gloo AI Studio** — Completions V2 (guarded). Used for discernment,
  truth selection, composition and weekly insight when credentials are set.
- **YouVersion Platform** — Bible passages, verse search, verse of the day.

Run `npm ls` (in `app/`) and `pip freeze` (in `server/`) for exact versions.
