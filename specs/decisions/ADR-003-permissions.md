# ADR-003 - Modelo de Permissões (RBAC)

## Status

Aceito

## Contexto

O sistema precisa de controle de acesso granular por módulo e ação (visualizar, criar, editar, excluir, exportar), suportando múltiplos perfis por usuário, conforme definido em [`../01-business-rules.md`](../01-business-rules.md#perfis-e-permissões-rbac).

## Decisão

- Modelo **RBAC** (Role-Based Access Control): usuário → um ou mais Perfis (Roles) → conjunto de Permissões por módulo/ação.
- Convenção de chave de permissão: `modulo:acao` (ex.: `crm:criar`, `financeiro:editar`, `relatorios:exportar`, `agenda:visualizar`).
- Permissões resolvidas no back-end e entregues ao front após login (ex.: `GET /me` retornando perfis + permissões efetivas).
- No front-end, permissões são consumidas via:
  - `PermissionGate`: componente declarativo para ocultar/desabilitar ações na UI.
  - `usePermission(key)`: hook para checagens imperativas (ex.: dentro de handlers).
  - Guards de rota no middleware do Next.js para bloquear acesso a seções inteiras (ex.: `/admin/*` apenas para Administrador).
- A checagem client-side é **apenas de UX**; a autorização definitiva sempre é validada pela API.
- Novas chaves do módulo Agenda (`agenda:*`) seguem o mesmo modelo; escopo de dados (próprios vs equipe) espelha o CRM — ver [`../modules/calendar.md`](../modules/calendar.md).
- **Entitlements por plano** (SaaS) são ortogonais ao RBAC: o cargo libera a ação, o plano da company libera o módulo. Ver [`ADR-006`](./ADR-006-entitlements.md). `PermissionGate` sozinho não basta para módulos Pro/Enterprise — usar `FeatureGate` / `canAccess`.

## Consequências

- Qualquer nova permissão introduzida no back-end deve ser refletida na constante/tipo de permissões do front-end (`lib/auth`), evitando strings mágicas espalhadas pelo código.
- Perfis customizados (além dos 5 padrão) ficam previstos para V2, sem exigir mudança estrutural no front-end (a UI já trabalha com a lista dinâmica de permissões recebida da API).
- Novos módulos devem declarar permissões **e** feature key do plano quando aplicável.

## Alternativas consideradas

- ACL por recurso individual (ex.: por Lead específico): descartado no MVP por complexidade desnecessária; pode ser avaliado futuramente para casos como "Lead compartilhado com outro vendedor".
