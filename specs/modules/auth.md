# Módulo: Auth (Autenticação e Sessão)

## Objetivo

Autenticar usuários e manter sessão ativa de forma segura, servindo de base para o RBAC (ver [`admin.md`](./admin.md)).

---

## Fluxo (MVP)

```text
Tela de Login
  ↓
POST /login (email + senha)
  ↓
Recebe access_token + refresh_token
  ↓
Redireciona conforme perfil (Administrador / Gestor / Comercial / Financeiro / Jurídico)
```

## Endpoints consumidos

```http
POST /login
POST /refresh
POST /logout
```

## Regras

- Access token de curta duração; refresh token de duração maior, armazenado de forma segura (httpOnly cookie preferencialmente).
- Interceptor HTTP deve tentar `POST /refresh` automaticamente em caso de `401`, e só então redirecionar para o login se o refresh também falhar.
- Logout deve invalidar a sessão no client (limpar store/cache) e chamar `POST /logout`.
- Rotas protegidas exigem sessão válida (middleware do Next.js + guard client-side).
- Após login, o front deve carregar o usuário atual, **permissions**, **company**, **subscription** e **features** do plano para alimentar `PermissionGate`, `FeatureGate` e os guards de rota ([`ADR-006`](../decisions/ADR-006-entitlements.md)).
- Home pós-login respeita role ∩ features (`homePathForSession`): ex. Financeiro no Essencial não é enviado a `/financial`.

## Fora de escopo do MVP (V2)

- "Esqueci minha senha" / reset por email
- Login social (Google/Microsoft)
- MFA (autenticação em dois fatores)
- SSO
