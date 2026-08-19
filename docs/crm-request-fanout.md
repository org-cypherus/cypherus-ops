# Reduzir o fan-out de GETs no CRM (via gateway)

O browser não fala com o gateway. Cada chamada passa por **BFF** (`/api/bff`) → **api-gateway** → **saas-crm**. O gateway é 1:1: não agrupa, não cacheia produto e o timeout upstream é 150s.

Em staging o CRM segura **uma conexão Postgres por request** o tempo todo. Burst de GETs em paralelo esgota o pool: rotas baratas (`GET /v1/plans`, 1 query) esperam segundos na fila.

Este arquivo lista **o que mudar neste repositório**. Mudanças no CRM (contrato) estão na fase 3, para o front não inventar payload.

Contrato da API: `saas-crm/docs/contrato-api-frontend.md`.

---

## 1. Como está hoje

Duas ondas. O `AuthGuard` só monta a página depois de `fetchMe()`.

```text
F5 / login
  └─ useSession → GET /v1/me
       └─ hydrateSession  Promise.all
            GET /v1/companies/{id}
            GET /v1/companies/{id}/features
            GET /v1/companies/{id}/subscriptions/current
            GET /v1/companies/{id}/users/{userId}/roles
            GET /v1/plans
  └─ (AuthGuard libera)
       /leads (home comercial)
            useKanban     GET /pipelines → GET /board → GET /users
            useLeads      GET /leads → GET /users          (mesmo no Kanban)
            fetchUsers    GET /users + GET /roles
                          + GET /users/{id}/roles  × N
                          + GET /users/{id}        × N   (payload inútil)
```

Cada linha acima é um hop BFF + um hop gateway + um checkout no pool do CRM.

`retry: 1` no React Query (exceto sessão) e o retry de GET no BFF após timeout do gateway **multiplicam** o burst quando o pool já está saturado.

Timeouts desalinhados:

| Trecho | Constante | Valor |
| --- | --- | --- |
| Browser → BFF | `API_CLIENT_TIMEOUT_MS` | 90s |
| BFF → gateway | `API_REQUEST_TIMEOUT_MS` | 50s |
| Gateway → CRM | `proxy_timeout_seconds` | 150s |

Se o CRM passar de 50s, o BFF aborta e o gateway **continua** ocupando a conexão no CRM. Um retry do client entra em cima.

---

## 2. Fase 1 — só front (sem mudar o CRM)

Objetivo: cortar GETs mortos, deixar de disparar a home inteira de uma vez e não retryar em cima de fila.

### 2.1 `fetchUsers` — matar o N+1

**Arquivo:** `src/modules/admin/services.ts`

`toAppUser` hoje faz, por usuário:

1. `GET .../users/{id}/roles` — necessário (lista não traz cargo)
2. `GET .../users/{id}` — **lixo**. `UserResponse` do CRM não tem `phone` nem `job_title`. O GET de detalhe devolve o mesmo que a lista.

Fazer:

- Mapear a lista (`GET .../users`) + um `GET .../roles` (catálogo, já existe).
- Cargo: um `GET .../users/{id}/roles` por pessoa. Não usar `Promise.all` em todos de uma vez; teto de concorrência 2 (ou série).
- `phone` / `team`: `""` até a fase 3. Não inventar campo no JSON.
- Quem só precisa de `{ id, name }` (filtro do Kanban, dono do lead) **não** chama `fetchUsers`. Ver 2.2.

`createUser` / `updateUser` podem continuar buscando cargo do usuário recém-salvo; não relistar a empresa inteira com N+1 só para devolver um item (`updateUser` hoje chama `fetchUsers()` no fim).

### 2.2 Um `GET /users` compartilhado

**Arquivos:** `src/modules/leads/services.ts`, `src/modules/leads/components/LeadsPageClient.tsx`, `src/lib/query/keys.ts`

Hoje `GET /users` sai até **três vezes** na home:

- `fetchOwnerMap()` no Kanban
- `fetchOwnerMap()` na listagem
- `fetchUsers()` no `useQuery` da página (filtro de responsável)

Fazer:

- Query React Query `queryKeys.users` **ou** uma chave leve `queryKeys.userDirectory` com `GET .../users` (só id/nome/status).
- `fetchOwnerMap` lê o cache dessa query; não dispara axios solto.
- `LeadsPageClient` usa o diretório para o `<Select>` de responsável. `fetchUsers` (com cargos) só em `/admin/users`.

### 2.3 `/leads`: uma visão, uma query pesada

**Arquivo:** `src/modules/leads/components/LeadsPageClient.tsx`

- Kanban (`view` default): só `useKanban`. Não montar `useLeads`.
- Tabela (`?view=table`): só `useLeads`. Não montar `useKanban`.
- `enabled: view === "kanban"` / `enabled: view === "table"`.

`fetchKanban` ignora filtros (`_filters`). Ou aplica no client (origem, owner, etc.) ou para de aceitar params na query key — query key distinta com o mesmo payload cacheia errado e refetcha à toa.

### 2.4 `hydrateSession` — não abrir 5 GETs juntas

**Arquivo:** `src/modules/auth/services.ts`

`fetchMe` já fez `GET /v1/me` (user + `company_id` + permissions). O `Promise.all` seguinte é o primeiro comboio do pool.

Sem endpoint agregado (fase 3):

1. `GET .../companies/{id}` (nome/status no shell)
2. `GET .../companies/{id}/features` (guards de rota)
3. `GET .../users/{id}/roles` (label do cargo)
4. `GET .../subscriptions/current` + `GET /v1/plans` **em sequência** (plano é label; features já autorizam)

Não relançar `GET /v1/me` dentro do hydrate (`permissions` já vem do `fetchMe`). Login (`loginRequest`) continua precisando de `/me` **ou** das permissões no body do login — hoje o login não devolve permissions, então um `/me` depois do login é ok; não somar o `Promise.all` em cima.

`GET /v1/plans` é catálogo estático: cachear no React Query (`staleTime` alto, 5–15 min) e reusar no signup.

### 2.5 Retry

**Arquivos:** `src/lib/query/provider.tsx`, `src/app/api/bff/[[...path]]/route.ts`, `src/lib/api/config.ts`

- React Query: `retry: 0` no default **ou** `retry` só em 408/network, nunca em 5xx do BFF/gateway (pool saturado).
- BFF: **não** repetir GET genérico após timeout do gateway. Manter o retry só no `POST /v1/companies` (provisionamento idempotente / race documentada).
- Alinhar `API_REQUEST_TIMEOUT_MS` ao `proxy_timeout_seconds` do gateway **ou** documentar que o BFF cancela antes. Hoje 50s vs 150s deixa request zumbi no CRM.

Não subir timeout do browser para “esconder” lentidão.

### 2.6 Fora desta fase (não é este repo)

- Pool Postgres / LIFO / cache de principal: `saas-crm`.
- `httpx.AsyncClient()` por request no proxy: `api-gateway-fastapi`.
- Keep-alive / HTTP/2 no hop gateway→CRM: gateway.

---

## 3. Fase 2 — front, depois que a home parar de explodir

Ordem sugerida; cada item é independente.

| Onde | Problema | Mudança |
| --- | --- | --- |
| `src/modules/leads/services.ts` `fetchKanban` | `pipelines` depois `board` depois `users` (3 RTTs) | `Promise.all` de `getDefaultPipeline` + diretório de users **depois** do board, ou cachear pipeline default no React Query (`staleTime` 5 min) para o board não esperar lista toda vez |
| `moveLead` | `getDefaultPipeline()` de novo + `fetchKanban()` inteiro | Cache do pipeline; invalidar só o board |
| `fetchLead` | `Promise.all` lead + events + attachments + `GET /users` | Usar o diretório (2.2); ok manter os 3 GETs do lead (detalhe, usuário esperando) |
| `distributeLeads` | `Promise.all` de PATCH/POST por lead | Manter até existir endpoint em lote no CRM; não é boot |
| `src/app/(app)/admin/roles/page.tsx` | `Promise.all` de permissions por cargo | Sequenciar ou concorrência 2 |
| `src/modules/financial/services.ts` | `Promise.all` listagens | Só dispara nessas rotas; menor prioridade |
| Dialogs (`CreateLeadDialog`, `DistributeLeadsDialog`, agenda) | `useQuery(fetchUsers)` | Passar a usar o diretório (2.2), não `fetchUsers` |

---

## 4. Fase 3 — precisa de contrato no CRM

Sem isso o front continua obrigado a vários GETs para montar `SessionUser` e a tabela de usuários. **Não inventar campos.** Combinar com `saas-crm` e atualizar `docs/contrato-api-frontend.md` lá.

### 4.1 Bootstrap de sessão

Hoje `GET /v1/me` devolve `user`, `company_id`, `permissions`. O front ainda precisa de company, features, subscription, plan code e role.

Opção A (preferida): ampliar `GET /v1/me` com:

- `company` (`id`, `name`, `status`)
- `features` (mesmo shape de `GET .../features`)
- `subscription` (`plan_id`, `status`) + `plan` (`id`, `code`, `name`) **ou** `plan_code` já resolvido
- `roles` (lista atual do usuário, mesmo shape de `GET .../users/{id}/roles`)

Opção B: `GET /v1/session` novo e deprecar o fan-out no front.

Com A ou B, `hydrateSession` vira **um** GET (`/me` ou `/session`). `loginRequest` hidrata com o mesmo endpoint.

### 4.2 Lista de usuários com cargo e perfil

`GET .../users` hoje: `UserResponse` sem `phone`, `job_title`, sem roles.

Incluir no item (ou embed opcional `?include=roles`):

- `phone`, `job_title` (já existem na entidade)
- `roles: [{ id, code, name }]` (ou o cargo principal)

Aí `fetchUsers` = **um** GET. `GET .../users/{id}` só no detalhe/edição.

### 4.3 Board com nomes dos owners

`GET .../pipelines/{id}/board` já pode trazer `owner_name` (ou o presenter de leads). Aí some `fetchOwnerMap` no Kanban.

Não bloquear a fase 1 nisso.

---

## 5. Arquivos deste repo

| Arquivo | Fase | O quê |
| --- | --- | --- |
| `src/modules/admin/services.ts` | 1 | N+1; `updateUser` sem relistar tudo |
| `src/modules/leads/services.ts` | 1–2 | `fetchOwnerMap` via query cache; Kanban/leads |
| `src/modules/leads/components/LeadsPageClient.tsx` | 1 | `enabled` por view; diretório em vez de `fetchUsers` |
| `src/modules/auth/services.ts` | 1, 3 | Sequenciar hydrate; depois um GET |
| `src/lib/query/provider.tsx` | 1 | `retry` |
| `src/lib/query/keys.ts` | 1 | `userDirectory` se não reusar `users` |
| `src/app/api/bff/[[...path]]/route.ts` | 1 | Retry de GET |
| `src/lib/api/config.ts` | 1 | Timeouts vs gateway |
| Dialogs de lead/agenda que chamam `fetchUsers` | 2 | Diretório |
| `src/modules/auth/hooks.ts` | 3 | `fetchMe` continua; payload maior |

Testes: Vitest dos adapters/services (mapear users sem GET de detalhe). MSW: handlers de `/users/{id}` deixam de ser obrigatórios no boot da home.

---

## 6. Critério de pronto (fase 1)

No Network (aba `/leads`, Kanban, 2 usuários na empresa), **depois do login já hidratado**:

- **Não** há `GET .../users/{uuid}` (detalhe).
- **No máximo um** `GET .../users` (lista).
- **Não** há `GET .../leads` junto com `GET .../board`.
- `GET .../users/{id}/roles` só se a UI daquela tela mostrar cargo — na home, zero.
- Falha 502/503 de lista **não** dispara segunda tentativa imediata.

Sessão fria (F5 com cookie):

- Um `GET /v1/me` e as GETs de hydrate **em série** (ou no máximo 2 em voo), não 5.

Staging: o mesmo F5 não deve empilhar `/plans` e `/me` em 5–20s por espera de pool. Confirmar nos logs do CRM (`db_pool_wait` se estiver ligado).

---

## 7. Ordem de implementação

1. `fetchUsers` + diretório (2.1, 2.2) — maior corte de GETs por usuário.
2. `LeadsPageClient` uma view (2.3).
3. Retry / BFF (2.5) — evita amplificar o que restar.
4. `hydrateSession` sequencial (2.4).
5. Fase 2 pontual (pipeline cache, dialogs).
6. Fase 3 com o CRM (bootstrap + lista rica).
