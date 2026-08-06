# ADR-004 - Stack do Back-end

## Status

Aceito

## Contexto

O back-end do Cypher Ops é desenvolvido em repositório separado e precisa de uma stack alinhada com a equipe, com boa produtividade para APIs REST, jobs assíncronos, autenticação JWT e observabilidade desde o MVP. A stack anterior sugerida (NestJS + Prisma + BullMQ) foi substituída pela decisão do sócio responsável pelo back-end.

## Decisão

Adotar a seguinte stack no repositório de API:

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
| Observabilidade | OpenTelemetry |
| Métricas | Prometheus |
| Dashboards de infra | Grafana |

Arquitetura permanece: Clean Architecture, DDD (leve), REST API, preparada para evolução modular.

Detalhes de infraestrutura: [`../04-devops.md`](../04-devops.md). Contrato de API para o front: [`../03-back-end.md`](../03-back-end.md).

## Consequências

- O front-end continua consumindo REST/JWT; a troca de NestJS → FastAPI **não altera** o contrato esperado de endpoints, desde que o time de API preserve paths e payloads.
- Tipagem e validação no back passam a ser centradas em Pydantic (nativo do FastAPI).
- Jobs assíncronos (exportações, PDFs, redistribuição de leads) usam Arq ou Celery com Redis como broker.
- Observabilidade deixa de ser “nice to have” e entra como requisito de stack (OTel + Prometheus + Grafana).
- Escolhas ainda abertas a confirmar no kickoff do repo de API: SQLAlchemy puro vs SQLModel; Arq vs Celery; PyJWT vs fastapi-users/Authlib.

## Alternativas consideradas

- NestJS + Prisma + BullMQ: descartada em favor da stack Python acordada pela equipe de back-end.
- Django + DRF: descartada nesta fase por preferência a FastAPI (async, OpenAPI automático, menor acoplamento).
