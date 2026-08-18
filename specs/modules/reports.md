# Módulo: Relatórios

## Objetivo

Permitir exportação de dados operacionais e comerciais para análise externa.

---

## Filtros

- Período
- Vendedor
- Origem
- Campanha
- Status
- Cidade
- Estado

## Formatos de exportação

- Excel
- CSV
- PDF

## Endpoints consumidos

```http
GET /reports/export
```

## Telas

- Tela de configuração de relatório: seleção de filtros + formato de exportação
- Histórico de exportações geradas pelo usuário (opcional, V2)

## Considerações de UI

- Geração de relatório deve ser assíncrona quando o volume de dados for grande (feedback de "processando" + notificação/link de download quando pronto)
- Reaproveitar componente `DataTable` para pré-visualização dos dados antes da exportação

## Permissões (RBAC)

- `relatorios:exportar`

## Entitlements (plano)

Feature `dashboard_advanced` — Relatórios a partir do **Profissional**. Ver [`ADR-006`](../decisions/ADR-006-entitlements.md).
