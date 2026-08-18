# Módulo: Dashboard

## Objetivo

Fornecer visibilidade de indicadores comerciais e administrativos em tempo (quase) real.

---

## Dashboard Comercial (por colaborador)

Cada colaborador possui um dashboard próprio, com:

- Leads ativos
- Leads fechados
- Conversão
- Valor vendido
- Meta
- Comissão
- Tempo médio de fechamento

Endpoint: `GET /dashboard/me`

## Dashboard Administrativo (visão geral)

KPIs:

- Leads recebidos
- Leads por origem
- Conversão geral
- Conversão por vendedor
- Receita (mensal/anual)
- Ticket médio
- Tempo médio de fechamento
- Contratos assinados / pendentes

Gráficos: linha, barra, pizza, funil.

Endpoint: `GET /dashboard/admin`

## Considerações de UI

- Cards de indicador com skeleton de carregamento
- Gráficos com biblioteca compatível com MUI (avaliar `@mui/x-charts` ou `recharts`)
- Filtro de período global no topo do dashboard
- Toggle de privacidade (olho / olho cortado) para mostrar ou ocultar valores monetários; preferência persistida no client
- Dados atualizados via React Query (revalidação periódica); tempo real avaliado em V2
- Role **Administrador** usa somente o Dashboard Administrativo (`/dashboard/admin`) quando o plano inclui `dashboard_advanced`; não permanece na visão comercial

## Permissões (RBAC)

- `dashboard:visualizar`
- Dashboard Administrativo visível apenas para Administrador/Gestor; Dashboard Comercial visível para todos os perfis comerciais (dados restritos ao próprio usuário, salvo Gestor/Administrador).

## Entitlements (plano)

Ver [`ADR-006`](../decisions/ADR-006-entitlements.md).

| Feature | Conteúdo |
|---|---|
| `dashboard_basic` | KPIs essenciais + funil (Essencial+) |
| `dashboard_advanced` | + valor vendido, meta, comissão, meta vs realizado; rota `/dashboard/admin` e Relatórios |
| `dashboard_custom` | Flag Enterprise — widgets personalizados (UI placeholder) |
