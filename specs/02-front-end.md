# 02 - Front-end (Fluxos, Telas, Componentes e UX)

> Este é o repositório de front-end do Cypher Ops. A API é consumida via REST a partir de um back-end externo (ver [`03-back-end.md`](./03-back-end.md)).

---

## Stack

- **Framework**: Next.js (App Router) + React + TypeScript
- **UI Kit**: MUI (Material UI)
- **Data fetching / cache**: React Query (TanStack Query)
- **Formulários**: React Hook Form + Zod (validação e schemas)
- **Estado global (client)**: Zustand
- **Tabelas**: TanStack Table
- **Listas grandes / performance**: TanStack Virtual
- **Animações**: Framer Motion

---

## Princípios de UX

- UX simples e extremamente rápida
- Zero telas poluídas
- Fluxos intuitivos
- Componentização máxima
- Dark Mode nativo
- Responsivo (desktop-first, com suporte a tablet/mobile)
- Acessibilidade (WCAG) como requisito, não como extra
- Feedback visual imediato (loading states, optimistic updates onde fizer sentido)

---

## Estrutura de Pastas (sugestão)

```text
src/
├── app/                        # Rotas (Next.js App Router)
│   ├── (auth)/
│   │   └── login/
│   ├── (app)/
│   │   ├── leads/
│   │   │   ├── page.tsx        # Listagem / Kanban
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Tela do Lead
│   │   ├── contracts/
│   │   ├── financial/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   └── admin/
│   │       ├── users/
│   │       ├── roles/
│   │       └── permissions/
│   └── layout.tsx
│
├── modules/                    # Domínio por módulo (feature-based)
│   ├── auth/
│   ├── leads/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/           # chamadas à API (React Query)
│   │   ├── schemas/            # Zod schemas
│   │   ├── store/              # Zustand slices
│   │   └── types/
│   ├── contracts/
│   ├── financial/
│   ├── dashboard/
│   ├── reports/
│   └── admin/
│
├── components/                 # Componentes de UI genéricos e reutilizáveis
│   ├── ui/                     # Wrappers sobre MUI (Button, Input, Modal, etc.)
│   ├── layout/                 # Shell, Sidebar, Topbar, Breadcrumbs
│   ├── table/                  # DataTable genérico (TanStack Table + Virtual)
│   ├── kanban/                 # Board, Column, Card
│   └── feedback/               # Toasts, EmptyState, ErrorState, Skeletons
│
├── lib/
│   ├── api/                    # Client HTTP (fetch/axios), interceptors, auth refresh
│   ├── query/                  # QueryClient, query keys
│   ├── auth/                   # Sessão, RBAC helpers, guards
│   └── utils/
│
├── hooks/                      # Hooks globais (useDebounce, usePermission, etc.)
├── theme/                      # Tema MUI (light/dark)
└── styles/
```

---

## Telas Principais

### 1. Login

- Formulário de autenticação (email + senha)
- Estados: loading, erro de credenciais, "esqueci minha senha" (V2)
- Redirecionamento por perfil após login

### 2. Pipeline / Kanban (tela inicial pós-login)

Board estilo Kanban, com colunas configuráveis representando o Pipeline.

Cada coluna deve possuir:

- Quantidade de leads
- Valor potencial somado
- Drag and drop de cards entre colunas
- Filtros (responsável, origem, período, prioridade, tags)
- Pesquisa por nome/CPF/telefone

Cada card do Kanban deve exibir, no mínimo:

- Nome do Lead
- Responsável (avatar)
- Valor
- Prioridade (indicador visual)
- Tempo na coluna atual

### 3. Tela do Lead

Principal tela de detalhe do sistema. Estrutura sugerida (seções colapsáveis / tabs):

```text
--------------------------------------
Nome | Status | Responsável
--------------------------------------
Informações pessoais
--------------------------------------
Informações comerciais
--------------------------------------
Dados financeiros
--------------------------------------
Timeline
--------------------------------------
Anexos
--------------------------------------
Contratos
--------------------------------------
Observações
--------------------------------------
```

Comportamentos:

- Edição inline dos campos (sem necessidade de "modo de edição" separado, quando possível)
- Mudança de Status deve ser possível diretamente no header
- Timeline em ordem cronológica reversa (mais recente primeiro), sem opção de exclusão
- Upload de anexos com drag and drop
- Ações rápidas: ligar, enviar WhatsApp, enviar email (V2 com integração real; MVP com deep link `tel:`/`https://wa.me`/`mailto:`)

### 4. Listagem de Leads (tabela)

Alternativa à visão Kanban, para análise tabular:

- Colunas configuráveis pelo usuário
- Ordenação, filtros avançados, paginação/virtualização
- Seleção em massa (para redistribuição, exportação, tags em lote)
- Importação/Exportação (CSV/Excel)

### 5. Contratos

- Wizard de geração: Selecionar Lead → Selecionar Modelo → Preencher dados → Gerar PDF → Enviar assinatura
- Listagem de contratos com status (Rascunho, Enviado, Assinado, Arquivado)
- Tela de gestão de Modelos/Templates com editor de placeholders

### 6. Financeiro

- Listagem de pagamentos (recebidos, pendentes, inadimplentes)
- Tela de detalhe do pagamento vinculado ao contrato/lead
- Tela de comissões (por vendedor, por período)
- Configuração de regras de comissão (Administrador)

### 7. Dashboard Comercial (por colaborador)

Indicadores:

- Leads ativos
- Leads fechados
- Taxa de conversão
- Valor vendido
- Meta (progresso)
- Comissão acumulada
- Tempo médio de fechamento

### 8. Dashboard Administrativo (visão geral)

KPIs:

- Leads recebidos
- Leads por origem
- Conversão geral / por vendedor
- Receita (mensal/anual)
- Ticket médio
- Tempo médio de fechamento
- Contratos assinados / pendentes

Gráficos: linha, barra, pizza, funil.

### 9. Relatórios

- Filtros: período, vendedor, origem, campanha, status, cidade, estado
- Exportação: Excel, CSV, PDF

### 10. Administração

- **Usuários**: CRUD (Nome, Email, Telefone, Cargo, Time, Status)
- **Perfis**: gestão de perfis (Administrador, Gestor, Comercial, Financeiro, Jurídico)
- **Permissões**: matriz de permissões por módulo (visualizar, criar, editar, excluir, exportar)

### 11. Pesquisa Global

- Componente de busca acessível a partir do header em qualquer tela
- Busca por nome, CPF, telefone, email, contrato
- Resultados agrupados por tipo de entidade

---

## Componentes Compartilhados (base de design system)

- `DataTable`: tabela genérica com paginação, ordenação, filtros, seleção (TanStack Table + Virtual)
- `KanbanBoard` / `KanbanColumn` / `KanbanCard`: board reutilizável para Pipeline
- `Timeline`: componente de linha do tempo (usado na tela do Lead e em Auditoria)
- `FormField*`: wrappers de inputs MUI integrados a React Hook Form + Zod
- `FileUploader`: upload com drag and drop, preview e progresso
- `StatusBadge`: badge padronizado para status de Lead/Contrato/Pagamento
- `PermissionGate`: componente que oculta/desabilita ações conforme RBAC do usuário
- `EmptyState` / `ErrorState` / `Skeleton`: estados de carregamento e vazio padronizados
- `ConfirmDialog`: confirmação de ações destrutivas (excluir, redistribuir, etc.)
- `Toast/Snackbar`: feedback de ações (sucesso/erro)

---

## Gestão de Estado

- **Servidor (dados remotos)**: React Query — cache, invalidação, refetch, mutations otimistas
- **Cliente (UI/local)**: Zustand — filtros ativos, estado do board, preferências de UI, sessão
- Evitar duplicar estado de servidor em Zustand; Zustand é para estado que não vem da API

---

## Autenticação e Autorização (front-end)

- Login gera tokens (access + refresh) — ver contrato em [`modules/auth.md`](./modules/auth.md)
- Guards de rota por perfil/permissão (middleware do Next.js + checagem client-side)
- `PermissionGate` para ocultar ações na UI conforme RBAC
- Refresh automático de token via interceptor no client HTTP

---

## Requisitos Não Funcionais (Front-end)

- Responsivo (breakpoints MUI padrão)
- Dark Mode (tema alternável, persistido)
- Performance: lazy loading de rotas/componentes pesados, virtualização de listas grandes
- Internacionalização preparada (estrutura de strings desde o MVP, mesmo que só pt-BR inicialmente)
- Acessibilidade (WCAG 2.1 AA como meta)
- SEO preparado para futuras landing pages públicas
- Testes automatizados (unitários + integração de componentes)
- Monitoramento de erros no client (ex.: Sentry) e logs estruturados

---

## Fora de Escopo deste Repositório

- Implementação da API/back-end (repositório separado)
- Infraestrutura de banco de dados, filas (BullMQ/Redis) e workers
- Lógica de geração de PDF/assinatura eletrônica no servidor (o front apenas consome os endpoints correspondentes)
