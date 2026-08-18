# Módulo: Agenda (Calendário Comercial + Jurídico)

## Objetivo

Permitir que Comercial e Jurídico **agendem retornos / compromissos vinculados a um Lead**, visualizem a agenda em grade (dias × horários, no estilo Microsoft Teams) e recebam **notificação no login (e ao longo do dia)** quando houver retornos a fazer.

Este módulo cobre o item **Agenda** do roadmap V2 em [`../00-product.md`](../00-product.md), priorizando o fluxo de **lembrete de retorno** (não sincronização com Google/Outlook nesta fase).

---

## Problema que resolve

Hoje o retorno ao cliente fica solto na timeline/WhatsApp. O consultor esquece, perde SLA interno e não há visão compartilhada do que está agendado no dia.

---

## Personas / Perfis

| Perfil | Uso principal |
|---|---|
| **Comercial** | Agendar retorno a partir do Lead; ver própria agenda; receber notificação de retornos do dia |
| **Jurídico** | Idem, no contexto do pipeline jurídico (`/legal` → detalhe do Lead) |
| **Gestor** | Ver agenda da equipe (filtro por responsável) |
| **Administrador** | Acesso total |

> “Consultor” na UI = usuário responsável pelo lead (cargo Comercial ou Jurídico). Não existe role `Consultor`.

---

## Escopo desta entrega (V2 — Agenda)

### Inclui

1. **Botão na tela do Lead** → abrir fluxo “Adicionar ao calendário”
2. **CRUD de eventos** (criar, editar, concluir, cancelar, excluir)
3. **Tela de calendário** (`/calendar`) com vistas Dia / Semana / Mês (padrão: Semana, estilo Teams)
4. **Notificação de retornos do dia** ao autenticar e enquanto o evento estiver pendente
5. **Vínculo obrigatório ou opcional com Lead** (retorno comercial/jurídico quase sempre vinculado)
6. **Registro na Timeline do Lead** ao criar/editar/concluir/cancelar evento
7. **Permissões RBAC** `agenda:*`
8. **Mocks MSW** alinhados ao contrato REST

### Fora de escopo (próximas iterações)

- Sync com Google Calendar / Outlook / Microsoft Graph
- Convites externos (e-mail/WhatsApp automático)
- Recorrência complexa (RRULE completo) — só “sem recorrência” + “diário/semanal simples” se necessário depois
- Tarefas genéricas desvinculadas de Lead (módulo Tarefas separado no roadmap)
- Notificações push / WebSocket (permanecem no item “Notificações em tempo real”)

---

## Entidade: `CalendarEvent`

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | sim | Identificador |
| `title` | string | sim | Ex.: “Retorno — Maria Silva” |
| `description` | string | não | Observação / roteiro do retorno |
| `type` | enum | sim | `retorno` \| `reuniao` \| `outro` |
| `status` | enum | sim | `agendado` \| `concluido` \| `cancelado` |
| `startsAt` | ISO 8601 | sim | Início (UTC) |
| `endsAt` | ISO 8601 | sim | Fim (UTC); duração mínima 15 min |
| `allDay` | boolean | sim | Default `false` |
| `leadId` | UUID \| null | não* | Lead vinculado (*obrigatório quando `type = retorno`) |
| `assigneeId` | UUID | sim | Usuário responsável (consultor) |
| `createdById` | UUID | sim | Quem criou |
| `remindAt` | ISO 8601 \| null | não | Momento de disparo da notificação; default = início do dia local de `startsAt` (00:00 no fuso do usuário) ou `startsAt` se horário definido |
| `completedAt` | ISO 8601 \| null | não | Preenchido ao concluir |
| `createdAt` / `updatedAt` | ISO 8601 | sim | Auditoria |

### Regras de validação

- `endsAt` > `startsAt`
- Duração máxima sugerida na UI: 8h (soft); API rejeita > 24h
- Não permitir sobreposição **bloqueante** no mesmo `assigneeId` (soft warning na UI; API permite com flag `force=true` — default soft)
- Comercial só cria/edita eventos **próprios** (ou de leads que possui)
- Jurídico só cria/edita eventos de leads no pipeline jurídico aos quais tem acesso
- Gestor/Admin podem criar em nome de outro `assigneeId`

---

## Fluxos principais

### F1 — Adicionar lembrete a partir do Lead

```text
Lead Detail → CTA "Agendar retorno"
  → Dialog / Drawer
      - Título (pré-preenchido: "Retorno — {nomeLead}")
      - Tipo (default: retorno)
      - Data + hora início / fim (ou duração)
      - Responsável (default: responsável do lead / usuário logado)
      - Descrição (opcional)
      - Lembrete: "No dia, ao logar" (default) | "X minutos antes"
  → Confirmar
      → POST /calendar/events
      → Timeline do Lead: "Retorno agendado para {data/hora} por {user}"
      → Toast de sucesso
      → Evento aparece em /calendar
```

### F2 — Notificação no login / no dia

```text
Usuário autentica (ou app já autenticado no início do dia)
  → GET /notifications (ou payload embutido em /me)
  → Para cada CalendarEvent com:
        assigneeId = usuário
        status = agendado
        startsAt no dia local do usuário (ou remindAt <= now)
        e notificação ainda não gerada/lida para aquele evento+dia
    → Notification:
        title: "Retornos do dia"
        body:  "Você tem N retorno(s) pendente(s)"  OU
               "Retorno: {leadName} às {hora}"
        href:  /calendar?date=YYYY-MM-DD  OU  /leads/{leadId}
```

Regras:

- Se houver **1 evento**: notificação específica com link para o Lead.
- Se houver **2+ eventos**: notificação agregada (“Você tem N retornos hoje”) + link para `/calendar?date=hoje`.
- Notificação é **recriada/atualizada** uma vez por dia por usuário (idempotente no back-end).
- Concluir o evento remove/atualiza o pendente (não reaparece no dia seguinte).
- Eventos `cancelado` / `concluido` não geram notificação.

### F3 — Visão de calendário (estilo Teams)

```text
/calendar
  Header: título "Agenda" | seletor Dia/Semana/Mês | navegar período | botão "Novo evento"
  Filtros: responsável (Gestor/Admin), tipo, status, somente meus
  Grade:
    - Eixo Y: horários (ex.: 07:00–20:00, slots de 30 min)
    - Eixo X: dias (vista Semana) ou um dia (vista Dia)
    - Blocos de evento com cor por tipo + status
  Clique no bloco → painel lateral (detalhe / editar / concluir / ir ao Lead)
  Clique em slot vazio → criar evento naquele horário
  Drag (opcional nesta entrega): remarcação por arraste — nice-to-have; se não couber, editar via formulário
```

Mobile: lista do dia + seletor de data (grade completa desktop-first).

### F4 — Concluir retorno

```text
Evento → "Marcar como concluído"
  → PATCH status=concluido
  → Timeline do Lead: "Retorno concluído"
  → Notificação do dia deixa de contar esse item
```

---

## Telas / Rotas

| Rota | Descrição | Permissão |
|---|---|---|
| `/calendar` | Visão principal Dia/Semana/Mês | `agenda:visualizar` |
| `/calendar?date=YYYY-MM-DD&view=week` | Deep link de período/vista | idem |
| `/leads/:id` | CTA “Agendar retorno” + lista curta de próximos eventos do Lead | `crm:editar` + `agenda:criar` |

Componentes sugeridos (front):

```text
src/modules/calendar/
  components/
    CalendarPageClient.tsx
    CalendarToolbar.tsx
    CalendarWeekView.tsx
    CalendarDayView.tsx
    CalendarMonthView.tsx
    CalendarEventBlock.tsx
    CalendarEventDrawer.tsx      # criar/editar/detalhe
    ScheduleFromLeadDialog.tsx   # CTA no Lead
    UpcomingLeadEvents.tsx       # lista no detalhe do Lead
  hooks.ts
  services.ts
  schemas.ts
  types.ts
```

Navegação: item **Agenda** na Sidebar (ícone calendário), visível para quem tem `agenda:visualizar`.

---

## Integração com Lead (CRM)

Na **Tela do Lead** ([`../02-front-end.md`](../02-front-end.md#3-tela-do-lead)):

- Ação rápida no header/actions: **Agendar retorno**
- Seção colapsável **Agenda** (ou bloco sob Timeline): próximos eventos vinculados (`GET /leads/:id/calendar-events`)
- Cada item: data/hora, tipo, status, link “abrir na agenda”

Eventos de timeline (imutáveis):

| Ação | Texto sugerido |
|---|---|
| Criar | `Retorno agendado para {dd/MM/yyyy HH:mm}` |
| Remarcar | `Retorno remarcado para {dd/MM/yyyy HH:mm}` |
| Concluir | `Retorno concluído` |
| Cancelar | `Retorno cancelado` |

---

## Notificações

Estende a lista de eventos em [`../01-business-rules.md`](../01-business-rules.md#notificações):

| Evento | Quando | Destinatário |
|---|---|---|
| `calendar.reminders.due` | Login / início do dia / polling de notificações | `assigneeId` |
| `calendar.event.assigned` | Quando Gestor cria evento para outro usuário | novo `assigneeId` |
| `calendar.event.updated` | Remarcação material (data/hora) | `assigneeId` |

Payload mínimo da `Notification`:

```ts
{
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
  kind?: "calendar_reminder" | "calendar_assigned" | "calendar_updated" | string;
  meta?: { eventIds?: string[]; leadId?: string; date?: string };
}
```

> `kind` / `meta` são extensões retrocompatíveis do modelo atual de notificação in-app.

---

## Endpoints consumidos

```http
GET    /calendar/events?from=&to=&assigneeId=&leadId=&type=&status=
GET    /calendar/events/:id
POST   /calendar/events
PATCH  /calendar/events/:id
DELETE /calendar/events/:id
POST   /calendar/events/:id/complete
POST   /calendar/events/:id/cancel

GET    /leads/:id/calendar-events
```

### Contratos (resumo)

**POST `/calendar/events`**

```json
{
  "title": "Retorno — Maria Silva",
  "description": "Ligar para confirmar envio de documentos",
  "type": "retorno",
  "startsAt": "2026-08-15T14:00:00.000Z",
  "endsAt": "2026-08-15T14:30:00.000Z",
  "allDay": false,
  "leadId": "uuid",
  "assigneeId": "uuid",
  "remindAt": null
}
```

**GET `/calendar/events`** → `{ data: CalendarEvent[], total, page?, pageSize? }`  
Filtro temporal obrigatório: `from` + `to` (ISO), janela máxima 62 dias por request.

Job/back-end (repo externo): ao processar lembretes do dia, criar/atualizar notificações idempotentes (`userId` + `date` + conjunto de `eventIds`).

---

## Permissões (RBAC)

| Permissão | Descrição |
|---|---|
| `agenda:visualizar` | Ver calendário e eventos permitidos |
| `agenda:criar` | Criar eventos |
| `agenda:editar` | Editar / concluir / cancelar |
| `agenda:excluir` | Excluir eventos |

Atribuição sugerida:

| Perfil | Permissões |
|---|---|
| Administrador | todas |
| Gestor | visualizar, criar, editar |
| Comercial | visualizar, criar, editar (somente próprios / leads próprios) |
| Jurídico | visualizar, criar, editar (somente próprios / leads jurídicos acessíveis) |
| Financeiro | — |

Detalhe de escopo de dados (próprios vs equipe) espelha as regras de CRM.

## Entitlements (plano)

Feature `agenda` — **Profissional e Enterprise**. No Essencial, o módulo some da nav e CTAs do Lead; URL `/calendar` mostra upsell. Acesso efetivo = `agenda` ∩ `agenda:*`. Ver [`ADR-006`](../decisions/ADR-006-entitlements.md).

---

## Critérios de aceite

1. Na tela do Lead, usuário com `agenda:criar` **e** company com feature `agenda` vê o botão **Agendar retorno** e consegue criar um evento vinculado.
2. O evento aparece na grade de `/calendar` no dia/horário corretos.
3. Ao logar no dia do evento (com evento `agendado`), o usuário recebe notificação de retorno(s) pendente(s).
4. Clicar na notificação leva ao calendário do dia ou ao Lead correspondente.
5. Concluir o retorno atualiza status, timeline do Lead e remove o item da contagem de pendências do dia.
6. Company no Essencial não vê Agenda na nav nem CTAs no Lead; `/calendar` exibe upsell.
6. Comercial não vê/edita agenda de outro comercial; Gestor vê a equipe.
7. Jurídico consegue o mesmo fluxo a partir de leads do pipeline jurídico.
8. Vista Semana exibe eixo de horários + dias com blocos posicionados (experiência próxima ao Teams).

---

## Dependências

- Módulo CRM (Lead + Timeline) — [`crm.md`](./crm.md)
- Notificações in-app existentes (`NotificationsDrawer`)
- Auth / RBAC — [`auth.md`](./auth.md), [`ADR-003`](../decisions/ADR-003-permissions.md)
- Contrato API — [`../03-back-end.md`](../03-back-end.md)
- ADR de UI do calendário — [`ADR-005`](../decisions/ADR-005-calendar-ui.md)

---

## Ordem de implementação sugerida (front)

1. Types + Zod schemas + services + query keys  
2. MSW: store de eventos + handlers + seeds  
3. `ScheduleFromLeadDialog` no `LeadDetail`  
4. Página `/calendar` (Semana primeiro; depois Dia/Mês)  
5. Extensão de notificações (kind/meta + seeds do dia)  
6. Permissões + item na Sidebar  
7. Lista de próximos eventos no Lead + timeline events  
8. Testes de componentes críticos (dialog + posicionamento de blocos)
