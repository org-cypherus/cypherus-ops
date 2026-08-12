# Módulo: Administração (Usuários, Perfis, Permissões)

## Objetivo

Gerenciar usuários, perfis de acesso e permissões granulares (RBAC) da plataforma.

---

## Usuários

CRUD completo. Campos:

- Nome
- Email
- Telefone
- Cargo
- Time
- Status

## Perfis

| Perfil | Escopo de acesso |
|---|---|
| Administrador | Acesso total ao sistema |
| Gestor | Visualiza e gerencia a equipe |
| Comercial | Acesso restrito aos próprios leads |
| Financeiro | Acesso ao módulo financeiro |
| Jurídico | Acesso ao módulo de contratos |

## Permissões

RBAC granular por módulo. Cada módulo possui seu próprio conjunto de permissões.

Exemplo:

**CRM**: visualizar, criar, editar, excluir

**Financeiro**: visualizar, editar

**Dashboard**: visualizar

**Relatórios**: exportar

## Telas

- Listagem/CRUD de usuários (com indicador de uso do limite de assentos)
- Gestão de perfis (criação de perfis customizados, V2; gated por `advanced_permissions`)
- Matriz de permissões (tabela: módulos x ações, com toggle por perfil; gated por `advanced_permissions`)
- Recursos Enterprise (`/admin/enterprise`)
- Configuração da regra padrão de distribuição de leads (opções conforme o plano)

## Regras

- Um usuário pode ter mais de um perfil (composição de permissões).
- Alterações em usuários/perfis/permissões geram entrada de Auditoria.
- Ações não autorizadas são bloqueadas na UI via `PermissionGate` / `FeatureGate` e reforçadas pela API.
- Criação e reativação de usuário **Ativo** respeitam o limite `max_users` do plano da company ([`ADR-006`](../decisions/ADR-006-entitlements.md)).
- Matriz de permissões e perfis customizados exigem feature `advanced_permissions` (Profissional+).
- Estratégia padrão de distribuição de leads é limitada pelo tier (Essencial: manual/RR; Pro: + automática/equipe; Enterprise: + redistribuição).

## Enterprise (API / Webhooks / Personalizações)

Rota `/admin/enterprise` e cards na home de Administração.

- Features `api`, `webhooks`, `customizations` — somente Enterprise.
- Fora do plano: upsell; no plano: UI placeholder “em breve” (flags já resolvidas na sessão).
- Detalhe: [`ADR-006`](../decisions/ADR-006-entitlements.md).

## Endpoints esperados (a confirmar com o back-end)

```http
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id

GET    /roles
POST   /roles
PATCH  /roles/:id

GET    /permissions
PATCH  /roles/:id/permissions
```

## Auditoria

Toda ação relevante do sistema gera log de auditoria (usuário, entidade, campo, valor antes/depois, data/hora). Ver regras completas em [`../01-business-rules.md`](../01-business-rules.md#auditoria).

Tela de consulta de auditoria: filtros por entidade, usuário e período.
