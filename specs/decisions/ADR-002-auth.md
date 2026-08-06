# ADR-002 - Estratégia de Autenticação

## Status

Aceito

## Contexto

O front-end precisa autenticar usuários contra a API externa (JWT, conforme [`../03-back-end.md`](../03-back-end.md)) e manter sessão de forma segura, suportando RBAC desde o MVP.

## Decisão

- Autenticação via **JWT** (access token + refresh token), emitidos pelo back-end FastAPI (PyJWT / python-jose ou fastapi-users / Authlib — ver [`ADR-004-backend-stack.md`](./ADR-004-backend-stack.md)).
- Refresh token armazenado preferencialmente em **cookie httpOnly** (mitiga XSS); access token mantido em memória no client.
- Interceptor no client HTTP (`lib/api`) trata `401` tentando `POST /refresh` automaticamente antes de forçar logout.
- Guards de rota implementados em duas camadas:
  1. Middleware do Next.js (bloqueio de rota antes de renderizar).
  2. Checagem client-side com `PermissionGate`/hooks (`usePermission`, `useSession`) para granularidade de UI.
- Dados de sessão e permissões carregados uma vez após login e mantidos via React Query (`GET /me` ou equivalente).

## Consequências

- Reduz superfície de ataque XSS ao evitar `localStorage` para tokens sensíveis.
- Exige que o back-end suporte cookies httpOnly com configuração CORS/SameSite compatível (a alinhar com o repositório de back-end).
- Login social, MFA e SSO ficam fora do MVP (ver [`../modules/auth.md`](../modules/auth.md)).

## Alternativas consideradas

- Tokens em `localStorage`: descartado por maior exposição a XSS.
- Sessão baseada em cookie de sessão simples (sem JWT): descartado por já haver decisão de JWT no lado do back-end.
