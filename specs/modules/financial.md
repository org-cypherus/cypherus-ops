# Módulo: Financeiro

## Objetivo

Gerenciar pagamentos e comissões decorrentes de contratos assinados.

---

## Fluxo

```text
Contrato → Pagamento → Confirmado → Comissão → Finalizado
```

## Funcionalidades

- Contas recebidas
- Contas pendentes
- Inadimplência
- Pagamentos
- Recebimentos

## Comissão

Configurável pelo Administrador:

- Comissão fixa
- Comissão percentual
- Regras por plano/produto

Exemplo:

```text
Plano A → 15%
Plano B → 20%
```

## Telas

- Listagem de pagamentos com filtros (status, período, vendedor, contrato)
- Detalhe do pagamento (vínculo com contrato/lead, histórico)
- Painel de inadimplência
- Tela de comissões (por vendedor, por período), com detalhamento da base de cálculo
- Configuração de regras de comissão (Administrador)

## Endpoints consumidos

```http
GET   /payments
POST  /payments
PATCH /payments/:id
```

> Endpoints de comissão a serem detalhados junto ao back-end (ex.: `GET /commissions`, `GET /commissions/rules`).

## Regras

- Pagamento sempre vinculado a um contrato (e, por consequência, a um Lead).
- Pagamento confirmado dispara cálculo automático de comissão.
- Inadimplência calculada a partir de pagamentos pendentes com vencimento ultrapassado.

## Permissões (RBAC)

- `financeiro:visualizar`
- `financeiro:editar`

Perfil Financeiro tem acesso completo; demais perfis (exceto Administrador) não visualizam por padrão.

## Entitlements (plano)

- Feature `financial` — **Profissional e Enterprise** (módulo `/financial`).
- Feature `commissions` — painel e regras de comissão (mesmo tier no catálogo atual).
- Ver [`ADR-006`](../decisions/ADR-006-entitlements.md).
