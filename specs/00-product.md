# 00 - Visão do Produto

> Versão: 0.1.0
> Metodologia: Spec Driven Development (SDD)
> Escopo deste repositório: **Front-end**. A API/back-end é implementada e versionada em repositório separado e consumida via REST.

---

## Objetivo

Desenvolver uma plataforma SaaS para gerenciamento completo da operação comercial e administrativa de empresas prestadoras de serviço.

O sistema deverá centralizar:

- Captação de Leads
- CRM Comercial
- Gestão do Pipeline
- Contratos
- Financeiro
- Administração
- Dashboards
- Relatórios
- Gestão de Usuários
- Permissões

A plataforma deverá ser modular, escalável e preparada para crescimento futuro.

---

## Problema

Hoje empresas de prestação de serviço normalmente utilizam diversas ferramentas diferentes:

- Planilhas
- CRM
- WhatsApp
- Assinatura de contratos
- Financeiro
- Dashboards

Isso gera:

- perda de informação
- retrabalho
- dificuldade para acompanhar indicadores
- pouca automação
- baixa produtividade

A proposta é unificar tudo em um único sistema.

---

## Público Alvo

Empresas prestadoras de serviço.

### Exemplo inicial (primeiro cliente)

Empresa especializada em:

- Revisão de contratos
- Redução de juros abusivos
- Consultoria financeira

O sistema deverá ser suficientemente genérico para atender diversos segmentos futuramente.

---

## Contexto do Negócio (primeiro cliente)

**Quem é o cliente?**
Empresa prestadora de serviço especializada em revisão de contratos e redução de juros abusivos.

**Como ele trabalha hoje?**
Utiliza diversas ferramentas diferentes: planilhas, WhatsApp, assinatura de contratos, financeiro manualmente.

**Quais problemas queremos resolver?**
Perda de informação, retrabalho, dificuldade para acompanhar indicadores, pouca automação, baixa produtividade.

**O que o sistema precisa fazer?**
Centralizar toda a operação em uma única plataforma, com a possibilidade de evoluir para um ecossistema completo.

**Como o usuário utiliza cada funcionalidade?**
O usuário poderá utilizar o sistema através de uma interface web e, futuramente, mobile.

---

## Arquitetura Geral

### Front-end (este repositório)

Stack sugerida:

- Next.js
- React
- TypeScript
- MUI
- React Query
- React Hook Form
- Zod
- Zustand
- TanStack Table
- TanStack Virtual
- Framer Motion

### Back-end (repositório externo)

Stack de referência (implementada em outro repositório):

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
| Observabilidade (traces/métricas) | OpenTelemetry |
| Métricas | Prometheus |
| Dashboards de infra | Grafana |

Arquitetura:

- Clean Architecture
- DDD (leve)
- REST API
- Preparado para microsserviços no futuro

> O front-end consome a API via HTTP/REST. O contrato de integração está descrito em [`03-back-end.md`](./03-back-end.md). A infraestrutura e observabilidade estão em [`04-devops.md`](./04-devops.md).

---

## Módulos do Produto

1. CRM (Leads + Pipeline)
2. Contratos
3. Financeiro
4. Dashboards (Comercial e Administrativo)
5. Relatórios
6. Administração (Usuários, Perfis, Permissões)
7. Distribuição de Leads
8. Notificações
9. Uploads / Anexos
10. Pesquisa Global
11. Auditoria

Detalhamento de cada módulo em [`modules/`](./modules/).

---

## Requisitos Não Funcionais

- Responsivo
- Dark Mode
- Performance
- Lazy Loading
- Internacionalização preparada
- Acessibilidade (WCAG)
- SEO (Landing Pages)
- Testes automatizados (Pytest no back-end; testes de componentes no front-end)
- Logs estruturados
- Observabilidade (OpenTelemetry + Prometheus + Grafana)
- Docker Ready

---

## Roadmap

### MVP

- Login
- Usuários
- Permissões
- CRUD Leads (Cadastro, Atualização, Movimentação do Pipeline, Acompanhamento) — com possibilidade de importar/exportar dados de outras fontes
- Kanban
- Dashboard Comercial
- Dashboard Administrativo
- Contratos
- Financeiro básico
- Distribuição de Leads (Manual, Round Robin, Distribuição por equipe, Distribuição automática, Redistribuição)

### V2

- WhatsApp
- Email
- Assinatura eletrônica
- Automações
- Webhooks
- API pública
- Agenda
- Tarefas
- Comentários
- Notificações em tempo real

### V3

- IA para atendimento
- IA para classificação de Leads
- IA para criação de contratos
- IA para sumarização de histórico
- IA para previsão de conversão
- IA para recomendação de ações

---

## Princípios do Projeto

- UX simples e extremamente rápida
- Zero telas poluídas
- Fluxos intuitivos
- Componentização máxima
- Escalabilidade
- Código limpo
- Arquitetura modular
- Alta produtividade para o usuário

---

## Visão de Longo Prazo

O objetivo do Cypher Ops é se tornar uma plataforma modular para gestão da operação de empresas prestadoras de serviço.

A primeira versão será focada na gestão comercial (CRM), oferecendo uma experiência simples, eficiente e centralizada para acompanhamento de leads, negociações, contratos e indicadores.

Conforme o produto evoluir e novas necessidades forem identificadas junto aos clientes, novos módulos poderão ser adicionados, como:

- Financeiro
- Contratos
- Jurídico
- Atendimento (Tickets)
- Business Intelligence
- Automações
- Integrações (WhatsApp, E-mail, APIs)
- Inteligência Artificial
- Portal do Cliente
- Aplicativo Mobile

Toda a arquitetura deverá ser projetada de forma modular, permitindo que novos domínios sejam incorporados sem impactar os módulos existentes.

---

## Estrutura de Documentação (SDD)

```text
specs/
│
├── 00-product.md        # Visão do produto (este documento)
├── 01-business-rules.md # Todas as regras de negócio
├── 02-front-end.md      # Fluxos, telas, componentes e UX
├── 03-back-end.md       # Contrato de API consumido pelo front-end (implementação em outro repo)
├── 04-devops.md         # Infraestrutura, containers e observabilidade
│
├── modules/
│   ├── auth.md
│   ├── crm.md
│   ├── contracts.md
│   ├── financial.md
│   ├── dashboard.md
│   ├── reports.md
│   └── admin.md
│
└── decisions/
    ├── ADR-001-stack.md
    ├── ADR-002-auth.md
    ├── ADR-003-permissions.md
    └── ADR-004-backend-stack.md
```
