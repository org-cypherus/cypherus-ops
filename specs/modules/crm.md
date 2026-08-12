# Módulo: CRM (Leads + Pipeline)

## Objetivo

Principal módulo da plataforma. Responsável por:

- Cadastro de leads
- Atualização
- Movimentação do pipeline
- Acompanhamento

---

## Entidade: Lead

Ver estrutura completa de campos em [`../01-business-rules.md`](../01-business-rules.md#lead).

Grupos de dados:

- Dados pessoais (Nome, CPF, RG, Data nascimento, Email, Telefone, WhatsApp)
- Endereço (CEP, Rua, Número, Bairro, Cidade, Estado)
- Dados comerciais (Origem, Campanha, Canal, Responsável, Data cadastro, Status, Prioridade, Tags)
- Dados do processo (Banco, Nº parcelas, Valor parcela, Valor financiado, Valor total, Tipo contrato, Observações)
- Timeline (histórico, nunca apagado)

## Telas

- **Kanban** (`/leads`): board por status do pipeline, com filtros, busca, drag and drop
- **Listagem em tabela** (`/leads?view=table`): alternativa tabular com colunas configuráveis
- **Detalhe do Lead** (`/leads/:id`): ver estrutura completa em [`../02-front-end.md`](../02-front-end.md#3-tela-do-lead)
  - Inclui CTA **Agendar retorno** e seção de próximos eventos (módulo Agenda — [`calendar.md`](./calendar.md))

## Pipeline padrão

```text
Novo Lead → Contato realizado → Em negociação → Contrato enviado → Contrato assinado → Pagamento confirmado → Concluído
```

## Integração com Agenda (V2)

- Criar `CalendarEvent` a partir do Lead (`type=retorno`, `leadId` obrigatório).
- Toda criação/remarcação/conclusão/cancelamento gera entrada imutável na Timeline.
- Deep link da notificação de retorno pode abrir o Lead ou `/calendar?date=...`.

## Distribuição de Leads

- Manual
- Round Robin
- Distribuição por equipe
- Distribuição automática
- Redistribuição

Ver regras completas em [`../01-business-rules.md`](../01-business-rules.md#distribuição-de-leads).

## Endpoints consumidos

```http
GET    /leads
GET    /leads/:id
POST   /leads
PATCH  /leads/:id
DELETE /leads/:id
GET    /kanban
PATCH  /kanban/move
```

## Import/Export

- Importação de leads via planilha/CSV (mapeamento de colunas na UI, validação antes de confirmar)
- Exportação da base de leads (respeitando filtros ativos e permissões do usuário)

## Permissões (RBAC)

- `crm:visualizar`
- `crm:criar`
- `crm:editar`
- `crm:excluir`

Comercial só visualiza/edita os próprios leads; Gestor visualiza a equipe; Administrador tem acesso total.
