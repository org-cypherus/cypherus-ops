# Módulo: Contratos

## Objetivo

Permitir que a área comercial gere contratos a partir de um Lead, usando modelos (templates) com placeholders, até a assinatura e arquivamento.

---

## Fluxo

```text
Selecionar Lead → Selecionar Modelo → Preencher dados → Gerar PDF → Enviar assinatura → Assinado → Arquivado
```

## Modelos (Templates)

- Cadastro de templates (ex.: Contrato Pessoa Física, Pessoa Jurídica, Contrato Premium, Proposta de redução)
- Cada modelo tem um **`kind`**: `contract` (gera contrato jurídico) ou `reduction` (PDF da calculadora no lead, **não** cria contrato)
- Placeholders **dinâmicos**: `{{nome}}`, `{{cpf}}`, `{{valor}}`, `{{parcelas}}`, mais as chaves que existirem no arquivo. O CRM extrai `{{...}}` e devolve `placeholders[]`; a UI pode acrescentar
- Upload de **PDF/DOCX** com as variáveis no arquivo (logo/texto da empresa). Template só texto (`body`) continua válido até a migração
- Contrato de API (pedido ao CRM, o front não inventa path): [`docs/document-templates-api.md`](../../docs/document-templates-api.md)

## Telas

## Telas

- Wizard de geração de contrato (stepper: Lead → Modelo → Dados → PDF → Envio)
- Listagem de contratos (status: Rascunho, Enviado, Assinado, Arquivado)
- Detalhe do contrato (dados, PDF gerado, histórico de envio/assinatura)
- Gestão de Modelos (CRUD de templates, editor de placeholders)

## Endpoints consumidos

```http
POST  /contracts
GET   /contracts
PATCH /contracts/:id
POST  /contracts/:id/sign
POST  /contracts/:id/generate
GET   /contract-templates
POST  /contract-templates
```

Paths e `kind` definitivos: [`docs/document-templates-api.md`](../../docs/document-templates-api.md) — só entram no client depois do CRM atualizar `contrato-api-frontend.md`.

## Regras

- Contrato sempre vinculado a um Lead.
- PDF gerado é versionado (não sobrescreve silenciosamente).
- MVP: confirmação de assinatura via upload manual do documento assinado.
- V2: integração com provedor de assinatura eletrônica (ex.: Clicksign, DocuSign, Autentique) via webhook consumido pelo back-end.
- Contrato assinado atualiza o status do Lead, gera evento de Timeline e habilita o módulo Financeiro para aquele Lead.

## Permissões (RBAC)

- Perfil Jurídico tem acesso total ao módulo de Contratos.
- Comercial pode gerar/consultar contratos dos próprios leads.

## Entitlements (plano)

Feature `contracts` — **Profissional e Enterprise**. Inclui Jurídico (`/legal`) e blocos de contrato no Lead. Ver [`ADR-006`](../decisions/ADR-006-entitlements.md).
