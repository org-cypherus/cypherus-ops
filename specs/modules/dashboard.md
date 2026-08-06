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
- Dados atualizados via React Query (revalidação periódica); tempo real avaliado em V2

## Permissões (RBAC)

- `dashboard:visualizar`
- Dashboard Administrativo visível apenas para Administrador/Gestor; Dashboard Comercial visível para todos os perfis comerciais (dados restritos ao próprio usuário, salvo Gestor/Administrador).
