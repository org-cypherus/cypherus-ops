# ADR-006 - Entitlements por plano da empresa (tier ∩ RBAC)

## Status

Aceito

## Contexto

O Cypher Ops passou de operação single-tenant para **SaaS por assinatura** (Essencial / Profissional / Enterprise). O RBAC de [`ADR-003`](./ADR-003-permissions.md) continua necessário (cargo controla ações), mas **não basta**: módulos Pro/Enterprise não podem aparecer só porque o role tem a permission.

Precisávamos de um modelo canônico de:

1. Onde mora o tier (usuário vs empresa).
2. Como combinar plano e cargo no front.
3. O que esconder na nav vs o que mostrar em URL direta (upsell).

## Decisão

1. **Tier pertence à Company**, não ao User. Cadeia: `User → Company → Subscription(planCode) → features/limites`.
2. Todos os usuários da mesma company compartilham o mesmo `planCode` e o mesmo mapa de `features` resolvido.
3. **Acesso efetivo** = interseção:
   - `hasFeature(feature)` (plano da company)
   - `hasPermission(permission)` (cargo / RBAC)
   - `canAccess(feature, permission?) = hasFeature ∧ (permission? hasPermission : true)`
4. A sessão (`/login`, `/me`) entrega `company`, `subscription` e `features` já resolvidas do catálogo do plano (overrides por empresa podem ser aplicados no back-end antes de serializar `features`).
5. **UX**:
   - Sidebar: **esconde** itens sem `canAccess`.
   - URL direta: **upsell de plano** se a feature estiver off; mensagem de **sem permissão** se a feature estiver on e o role falhar.
   - Não misturar as duas mensagens.
6. Front consome via `useCompanyPlan` / `useFeature` / `useCanAccess`, `FeatureGate` e `FeatureRouteGuard`. Catálogo tipado em `src/lib/billing/`.
7. Limites (`max_users`) e modos (distribuição, dashboards) também derivam do plano; API reforça (403) além da UI.

### Matriz resumida

| Capacidade | Essencial | Profissional | Enterprise |
|---|---|---|---|
| CRM / Kanban / histórico | ✅ | ✅ | ✅ |
| Distribuição | manual / RR | + automática / equipe | + redistribuição avançada |
| Dashboard | básico | comercial + admin | + personalizado (flag) |
| Agenda / Contratos / Financeiro | ❌ | ✅ | ✅ |
| Permissões granulares | básicas | ✅ | ✅ |
| API / Webhooks / personalizações | ❌ | ❌ | ✅ (UI placeholder) |
| `max_users` | 5 | 15 | ilimitado |

Feature keys canônicas: `crm`, `kanban`, `lead_history`, `lead_distribution`, `lead_distribution_advanced`, `dashboard_basic`, `dashboard_advanced`, `dashboard_custom`, `agenda`, `contracts`, `financial`, `commissions`, `advanced_permissions`, `api`, `webhooks`, `customizations`, `max_users`.

## Consequências

- [`ADR-003`](./ADR-003-permissions.md) permanece válido para RBAC; entitlements são camada ortogonal.
- Novos módulos devem declarar **permission** e **feature key** (ou documentar “só RBAC”).
- Demo MSW usa 3 companies (um tier cada) com vários users na mesma company compartilhando features.
- Provisioning real (signup → company + subscription) fica no back-end; o front já carrega `planCode` escolhido no signup.

## Alternativas consideradas

- **Entitlement por User**: rejeitado — o comercial e o admin da mesma empresa pagam o mesmo plano.
- **Só esconder na UI sem features na sessão**: rejeitado — front precisa de fonte explícita; API continua sendo a autoridade.
- **404 seco em URL direta**: rejeitado em favor de upsell (“Disponível no Profissional/Enterprise”).
