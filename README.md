# Cypher Ops — Front-end

Plataforma SaaS para gestão comercial e administrativa de empresas prestadoras de serviço.

## Stack

Next.js 15 · React · TypeScript · MUI · React Query · React Hook Form · Zod · Zustand · TanStack Table · Framer Motion · MSW

## Desenvolvimento

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

**Login demo (mocks):** `ana@cypherops.com` / `123456`

Com `NEXT_PUBLIC_USE_MOCKS=true`, a API é simulada via MSW no contrato REST descrito em [`specs/03-back-end.md`](./specs/03-back-end.md).

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm test` — Vitest

## Estrutura

- `src/app` — rotas (App Router)
- `src/modules` — domínios (auth, leads, contracts…)
- `src/components` — UI compartilhada (shell, feedback, auth)
- `src/lib` — api, query, auth, utils
- `src/mocks` — handlers MSW
- `src/theme` — tema MUI light/dark
- `specs/` — documentação SDD

## Documentação

Comece por [`specs/00-product.md`](./specs/00-product.md).
