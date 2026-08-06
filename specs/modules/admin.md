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

- Listagem/CRUD de usuários
- Gestão de perfis (criação de perfis customizados, V2)
- Matriz de permissões (tabela: módulos x ações, com toggle por perfil)

## Regras

- Um usuário pode ter mais de um perfil (composição de permissões).
- Alterações em usuários/perfis/permissões geram entrada de Auditoria.
- Ações não autorizadas são bloqueadas na UI via `PermissionGate` e reforçadas pela API.

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
