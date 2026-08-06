# 04 - DevOps (Infraestrutura, Containers e Observabilidade)

> Este documento define a base de DevOps do Cypher Ops. A implementação de containers e pipelines vive principalmente no repositório de back-end (e, quando aplicável, no de front-end). O objetivo é padronizar ambientes, deploy e observabilidade desde o MVP.

---

## Objetivos

- Ambiente local reproduzível via Docker
- Deploy previsível (staging → produção)
- Observabilidade desde o início (logs, métricas, traces)
- Separação clara entre app (API/front) e infraestrutura de dados (PostgreSQL, Redis)

---

## Stack de Infraestrutura

| Camada | Tecnologia |
|---|---|
| Containerização | Docker |
| Orquestração local | Docker Compose |
| Banco de dados | PostgreSQL |
| Cache / broker de fila | Redis |
| Traces / instrumentação | OpenTelemetry |
| Métricas | Prometheus |
| Dashboards de infra / SLOs | Grafana |
| Testes (API) | Pytest |

---

## Ambientes

| Ambiente | Propósito |
|---|---|
| `local` | Desenvolvimento (Docker Compose: API, Postgres, Redis; front via Next.js local) |
| `staging` | Homologação com dados de teste, mesma stack de observabilidade da produção |
| `production` | Ambiente real de clientes |

Variáveis de ambiente nunca devem ser commitadas. Usar `.env.example` como contrato e secrets no provedor de deploy.

---

## Containers (visão mínima)

### Serviços esperados no Compose (local / staging)

```text
api          → FastAPI (uvicorn/gunicorn)
worker       → worker Arq ou Celery (jobs assíncronos)
postgres     → PostgreSQL
redis        → Redis (cache + broker)
otel-collector (opcional no local) → OpenTelemetry Collector
prometheus   (opcional no local) → scrape de métricas
grafana      (opcional no local) → dashboards
```

O front-end Next.js pode rodar fora do Compose em desenvolvimento (`npm run dev`), apontando para `NEXT_PUBLIC_API_URL`. Em staging/produção, o front também deve ser containerizado ou servido via plataforma (Vercel / container).

### Princípios

- Imagens multi-stage, pequenas e previsíveis
- Healthchecks em `api`, `postgres` e `redis`
- Migrations (Alembic) executadas de forma controlada no startup/deploy (job/migration step), não de forma implícita e silenciosa em hot-reload
- Volumes nomeados para Postgres em local; backups gerenciados em staging/produção

---

## Observabilidade

### Logs

- Logs estruturados (JSON) na API e no worker
- Correlação por `request_id` / `trace_id`
- Níveis: DEBUG (local), INFO (staging/produção), ERROR sempre com contexto

### Traces (OpenTelemetry)

- Instrumentar FastAPI, SQLAlchemy, Redis e clientes HTTP
- Exportar traces para o Collector / backend APM escolhido
- Propagar contexto de trace entre API ↔ worker quando um job for enfileirado a partir de uma request

### Métricas (Prometheus)

Exemplos de métricas úteis no MVP:

- Latência e throughput por endpoint (`http_request_duration_seconds`)
- Taxa de erros 4xx/5xx
- Tamanho/atraso das filas (jobs pendentes, falhos, retries)
- Conexões ativas no pool do Postgres
- Uso de Redis (hits/misses, memória)

### Dashboards (Grafana)

Dashboards mínimos sugeridos:

1. **API Health** — latência, erro, RPS
2. **Jobs / Filas** — throughput, falhas, tempo de processamento
3. **Infra** — CPU/memória dos containers, Postgres, Redis
4. **Negócio (opcional no MVP)** — leads criados/dia, contratos assinados (via métricas custom ou queries)

Alertas iniciais sugeridos: API down, taxa de 5xx acima do limiar, fila com backlog crescente, Postgres indisponível.

---

## CI/CD (diretrizes)

Pipeline sugerido (GitHub Actions ou equivalente), nos repositórios de front e back:

1. Lint / type-check
2. Testes (Pytest no back; testes unitários/E2E no front)
3. Build da imagem Docker
4. Scan básico de vulnerabilidades (quando viável)
5. Deploy em staging (automático em `main` / tag)
6. Deploy em produção (manual ou via tag de release)

Migrations Alembic devem rodar como etapa explícita do deploy, com rollback plan documentado.

---

## Segurança operacional

- Secrets apenas via variáveis de ambiente / secret manager
- Rede interna entre `api`, `worker`, `postgres` e `redis`; expor apenas a porta HTTP da API (e o front)
- TLS em staging/produção
- CORS restrito à origem do front-end
- Backups periódicos do PostgreSQL e teste de restore

---

## Responsabilidades por repositório

| Item | Front-end (este repo) | Back-end (repo externo) |
|---|---|---|
| Dockerfile / Compose da API | — | Sim |
| Dockerfile do front | Sim (quando containerizado) | — |
| Postgres / Redis / worker | — | Sim |
| OpenTelemetry (API/worker) | Client opcional | Sim |
| Prometheus / Grafana | — | Sim (ou infra compartilhada) |
| Variáveis `NEXT_PUBLIC_*` | Sim | — |
| Secrets de DB / JWT / Redis | — | Sim |

---

## Fora de escopo do MVP (avaliar depois)

- Kubernetes / autoscaling avançado
- Service mesh
- Multi-região
- Feature flags remotos
- Chaos engineering
