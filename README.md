# Cypher Ops — Front-end

Plataforma SaaS para gestão comercial e administrativa de empresas prestadoras de serviço.

## Stack

Next.js 15 · React · TypeScript · MUI · React Query · React Hook Form · Zod · Zustand · TanStack Table · Framer Motion · MSW

## Integração com a API

O browser **não** chama o API Gateway direto. As rotas de negócio passam por um BFF em `/api/bff`, que:

1. Emite o JWT do gateway (`POST /api/auth/token`) com `GATEWAY_CLIENT_ID` / `GATEWAY_CLIENT_SECRET` (somente server-side)
2. Encaminha para `{GATEWAY_URL}/api/...` com `Authorization` (gateway) e `X-Upstream-Authorization` (JWT do usuário)
3. Guarda os tokens do CRM em cookies httpOnly

```bash
cp .env.example .env.local
```

Variáveis server-side: `GATEWAY_URL`, `GATEWAY_CLIENT_ID`, `GATEWAY_CLIENT_SECRET`, `GATEWAY_TARGET_SERVICE=saas-crm`.

A visão de **plataforma** só abre com sessão de staff (`POST /v1/platform/auth/login`, JWT `typ=platform`). E-mail `@cypherops.com.br` em um usuário de tenant **não** libera o console.

No mock local:

- Tenant: qualquer usuário de `src/mocks/data.ts` / senha `123456` (ex.: `ops@cypherops.com.br` continua tenant)
- Plataforma: `staff@cypherops.com.br` / `123456`

`NEXT_PUBLIC_USE_MOCKS=true` liga o MSW (demo local). O padrão da integração é `false`.

O IP de saída do Next precisa estar em `allowed-ips` do cliente no gateway.

## Desenvolvimento

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Docker

O back-end (API, Postgres, Redis) vive em outro repositório. Este Compose sobe só o Next.js; o BFF continua falando com o gateway via `GATEWAY_*`.

```bash
cp .env.example .env.local
docker compose --env-file .env.local up --build
```

`--env-file` injeta `NEXT_PUBLIC_*` no **build** da imagem. `GATEWAY_*` entram em runtime pelo `env_file` do serviço. Alterar `NEXT_PUBLIC_*` exige rebuild (`--build`).

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm test` — Vitest

## Estrutura

- `src/app` — rotas (App Router) e BFF (`src/app/api/bff`)
- `src/modules` — domínios (auth, leads, contracts…)
- `src/components` — UI compartilhada (shell, feedback, auth)
- `src/lib` — api, query, auth, utils
- `src/mocks` — handlers MSW
- `src/theme` — tema MUI light/dark
- `specs/` — documentação SDD

## Documentação

Comece por [`specs/00-product.md`](./specs/00-product.md).

Fan-out de GETs no CRM (o que mudar neste repo): [`docs/crm-request-fanout.md`](./docs/crm-request-fanout.md).
