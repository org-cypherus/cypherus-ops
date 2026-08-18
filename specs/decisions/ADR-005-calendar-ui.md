# ADR-005 - UI e modelo da Agenda (Calendário)

## Status

Proposto

## Contexto

O roadmap V2 prevê **Agenda**. A necessidade imediata do cliente é:

1. Agendar **retorno** a partir do Lead (Comercial e Jurídico).
2. Receber **notificação no login** quando houver retorno(s) no dia.
3. Visualizar compromissos em grade **dias × horários**, semelhante ao Microsoft Teams.

Precisamos decidir: (a) se usamos lib de calendário pronta ou grade própria; (b) se o domínio é “evento de calendário” ou “tarefa”; (c) como encaixar notificações sem WebSocket ainda.

## Decisão

1. **Domínio = `CalendarEvent`**, com tipo principal `retorno`, além de `reuniao` e `outro`. Não misturar com o módulo futuro de **Tarefas** (checklist genérica).
2. **UI**: implementar grade própria com MUI + posicionamento absoluto por `startsAt`/`endsAt` (slots de 30 min), sem FullCalendar/BigCalendar nesta fase — menos peso de licença/CSS e alinhamento ao design system. Reavaliar lib se a vista Mês/drag-and-drop crescer demais.
3. **Vistas**: Semana (default), Dia e Mês. Desktop-first; mobile = lista do dia.
4. **Notificações**: reutilizar o drawer in-app atual. Back-end gera notificação idempotente “retornos do dia” no login / polling (sem WebSocket). Agregação quando N > 1.
5. **Vínculo com Lead**: `type=retorno` exige `leadId`; demais tipos podem ser avulsos.
6. **Permissões**: novas chaves `agenda:visualizar|criar|editar|excluir`, seguindo [`ADR-003`](./ADR-003-permissions.md).

## Consequências

- Front ganha módulo `src/modules/calendar` e rota `/calendar`.
- Contrato REST novo em `/calendar/events` (repo de back-end).
- Extensão opcional de `Notification` com `kind`/`meta` (retrocompatível).
- Sync Google/Outlook fica explicitamente fora; quando entrar, será outro ADR (provável Microsoft Graph / Google Calendar API).

## Alternativas consideradas

- **FullCalendar / react-big-calendar**: descartado na 1ª entrega por custo de customização visual vs. MUI e por escopo ainda focado em Semana + CRUD simples.
- **Só lista de lembretes sem grade**: não atende o pedido de visão tipo Teams.
- **Usar Timeline do Lead como “agenda”**: não dá visão diária/semanal do consultor nem notificação agregada no login.
