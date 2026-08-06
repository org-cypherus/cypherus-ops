# ADR-001 - Escolha de Stack

## Status

Aceito

## Contexto

O Cypher Ops precisa de uma stack de front-end moderna, produtiva e que suporte os requisitos de performance, responsividade, dark mode e componentização máxima definidos em [`../02-front-end.md`](../02-front-end.md). O back-end é desenvolvido em repositório separado, portanto esta decisão cobre exclusivamente o front-end.

## Decisão

Adotar:

- **Next.js (App Router) + React + TypeScript**: SSR/SSG quando necessário, ecossistema maduro, tipagem forte.
- **MUI**: design system consistente, componentes acessíveis prontos, theming (dark mode) nativo.
- **React Query**: cache e sincronização de dados de servidor, evitando reinventar cache/loading/error handling.
- **React Hook Form + Zod**: formulários performáticos com validação declarativa e tipada, compartilhando schemas entre formulário e tipos.
- **Zustand**: estado de UI/cliente leve, sem boilerplate de Redux.
- **TanStack Table + TanStack Virtual**: tabelas performáticas com grandes volumes de dados (leads, relatórios).
- **Framer Motion**: microanimações e transições para reforçar a percepção de "extremamente rápido".

## Consequências

- Curva de aprendizado moderada para quem não conhece React Query/Zustand, mitigada por padronização em `lib/query` e `modules/*/store`.
- Separação clara de responsabilidades: estado de servidor (React Query) nunca deve ser duplicado em Zustand.
- Dependência de disponibilidade/estabilidade do contrato de API do repositório de back-end (ver [`../03-back-end.md`](../03-back-end.md)).

## Alternativas consideradas

- Redux Toolkit no lugar de Zustand: descartado por maior boilerplate para o escopo do projeto.
- Tailwind + Radix no lugar de MUI: descartado nesta fase para priorizar velocidade de entrega com um design system completo pronto.
