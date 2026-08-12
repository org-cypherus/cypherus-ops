# 03 - Back-end (Contrato de API)

> **Importante**: o back-end é implementado e versionado em um **repositório separado**. Este documento existe como **contrato de integração** para orientar o desenvolvimento do front-end (endpoints esperados, entidades e eventos) e como referência da stack acordada. Qualquer mudança de contrato deve ser sincronizada com o time/repositório de back-end.

Infraestrutura, containers e observabilidade: ver [`04-devops.md`](./04-devops.md).

---

## Stack de Referência (repositório externo)

| Camada | Tecnologia |
|---|---|
| Linguagem | Python |
| Framework web | FastAPI |
| ORM / Migrations | SQLAlchemy 2.0 + Alembic (ou SQLModel) |
| Fila | Arq ou Celery |
| Autenticação | PyJWT / python-jose (ou fastapi-users / Authlib) |
| Banco de dados | PostgreSQL |
| Cache / broker | Redis |
| Testes | Pytest |
| Containerização | Docker |
| Observabilidade (traces / métricas) | OpenTelemetry |
| Métricas | Prometheus |
| Dashboards de infra | Grafana |

Arquitetura: Clean Architecture, DDD (leve), REST API, preparado para microsserviços no futuro.

Decisão formal: [`decisions/ADR-004-backend-stack.md`](./decisions/ADR-004-backend-stack.md).

---

## Entidades Principais

| Entidade | Descrição |
|---|---|
| `Lead` | Registro comercial em prospecção/negociação |
| `User` | Usuário do sistema |
| `Role` | Perfil de acesso |
| `Permission` | Permissão granular por módulo/ação |
| `Contract` | Contrato gerado a partir de um Lead + Template |
| `Commission` | Comissão calculada sobre um pagamento |
| `Payment` | Pagamento vinculado a um contrato |
| `Campaign` | Campanha de origem do Lead |
| `Notification` | Notificação de evento do sistema |
| `CalendarEvent` | Compromisso/retorno na Agenda (V2) |
| `Attachment` | Arquivo anexado a uma entidade |
| `Timeline` | Evento de histórico de uma entidade (ex.: Lead) |
| `AuditLog` | Log de auditoria imutável |

---

## Convenções da API

- Base URL configurável via variável de ambiente (`NEXT_PUBLIC_API_URL` no front-end)
- Autenticação via `Authorization: Bearer <access_token>`
- Paginação padrão: `?page=&pageSize=` com resposta `{ data, total, page, pageSize }`
- Filtros via query string (`?status=&responsavelId=&origem=...`)
- Erros no formato padronizado: `{ statusCode, message, error }`
- Todas as datas em ISO 8601 (UTC)
- Documentação interativa esperada via OpenAPI/Swagger gerado pelo FastAPI (`/docs`)

---

## Endpoints Esperados

### Auth

```http
POST /login
POST /refresh
POST /logout
```

### Lead

```http
GET    /leads
GET    /leads/:id
POST   /leads
PATCH  /leads/:id
DELETE /leads/:id
```

### Kanban

```http
GET   /kanban
PATCH /kanban/move
```

### Contratos

```http
POST  /contracts
GET   /contracts
PATCH /contracts/:id
POST  /contracts/:id/sign
```

### Financeiro

```http
GET   /payments
POST  /payments
PATCH /payments/:id
```

### Dashboard

```http
GET /dashboard/admin
GET /dashboard/me
```

### Relatórios

```http
GET /reports/export
```

### Agenda (V2)

```http
GET    /calendar/events?from=&to=&assigneeId=&leadId=&type=&status=
GET    /calendar/events/:id
POST   /calendar/events
PATCH  /calendar/events/:id
DELETE /calendar/events/:id
POST   /calendar/events/:id/complete
POST   /calendar/events/:id/cancel
GET    /leads/:id/calendar-events
```

Detalhamento de campos, regras e notificações de retorno: [`modules/calendar.md`](./modules/calendar.md).

> Endpoints adicionais (Usuários, Perfis, Permissões, Anexos, Notificações, Auditoria, Distribuição de Leads) deverão seguir o mesmo padrão REST e serão detalhados incrementalmente em [`modules/`](./modules/) conforme forem implementados no back-end.

---

## Eventos / Integrações Relevantes para o Front-end

O front-end deve reagir (via refetch/invalidations do React Query, ou futuramente via WebSocket/SSE em V2) aos seguintes eventos de domínio:

- Lead criado / atualizado / movido no pipeline
- Contrato gerado / assinado
- Pagamento confirmado
- Comissão calculada
- Notificação criada
- Evento de agenda criado / atualizado / concluído / cancelado
- Lembretes de retorno do dia gerados (notificação agregada ou unitária)

No MVP, esses eventos são refletidos via polling/refetch do React Query. Jobs assíncronos (exportação, redistribuição, geração de PDF) rodam via Arq/Celery no back-end. Em V2, avaliar notificações em tempo real (WebSocket/SSE).

---

## Responsabilidade de Cada Repositório

| Responsabilidade | Front-end (este repo) | Back-end (repo externo) |
|---|---|---|
| Regras de negócio / validação definitiva | Validação de UX (Zod) | Fonte da verdade (Pydantic / domínio) |
| Persistência de dados | — | Sim (PostgreSQL + SQLAlchemy/Alembic) |
| Geração de PDF de contrato | Consome endpoint | Sim (job assíncrono quando necessário) |
| Cálculo de comissão | Exibe resultado | Sim |
| Autenticação / RBAC | Aplica guards de UI | Emite/valida JWT, RBAC definitivo |
| Filas / jobs assíncronos | — | Sim (Arq ou Celery + Redis) |
| Auditoria | Exibe logs | Gera e persiste logs |
| Métricas / traces | Instrumentação client (opcional) | OpenTelemetry + Prometheus + Grafana |
| Testes automatizados | Testes de componentes/E2E | Pytest |
