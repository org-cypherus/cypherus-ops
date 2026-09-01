# Modelos de documento (contrato e redução)

Um único mecanismo de template. O que muda é o **`kind`**: contrato jurídico vs proposta de redução (calculadora #32).

O browser não fala com o CRM. Tudo passa por **BFF** `/api/bff` → gateway → `saas-crm`. Este arquivo é o **pedido de contrato** para o CRM. O front **não inventa path nem campo** até isso estar em `saas-crm/docs/contrato-api-frontend.md`.

Fonte atual: [`contrato-api-frontend.md` §9.6 / §11.11](https://github.com/org-cypherus/saas-crm-api) (clone local). UI hoje: [`src/app/(app)/contracts/templates/page.tsx`](../src/app/(app)/contracts/templates/page.tsx), [`src/modules/contracts/services.ts`](../src/modules/contracts/services.ts).

---

## 1. Como está hoje

```http
POST   /companies/{id}/contract-templates     JSON { name, body, is_active? }
GET    /companies/{id}/contract-templates
PATCH  /companies/{id}/contract-templates/{id}
DELETE /companies/{id}/contract-templates/{id}

POST   /companies/{id}/leads/{lead_id}/contracts    { template_id, title, data? }
POST   /companies/{id}/contracts/{id}/generate      → nova versão PDF
GET    /companies/{id}/contracts/{id}/versions/{n}/content
```

- Body é **texto**. CRM detecta `{{chaves}}` e devolve `placeholders: string[]`.
- `data` no contrato: `Record<string, string>` (máx. 50 chaves, valor ≤ 2000). Merge lead + overrides.
- Placeholders conhecidos no CRM: `nome`, `cpf`, `rg`, `email`, `telefone`, `whatsapp`, `cep`, `endereco`, `cidade`, `estado`, `valor`, `parcelas`, `tipo_contrato` + custom.
- Generate interpola o **body texto** e gera PDF. Não há upload de `.pdf` / `.docx` modelo.
- Todo PDF gerado por esse fluxo é um **contrato** (ciclo DRAFT → GENERATED → SIGNED).

O wizard do Ops só manda `valor` em `data`. O restante vem do merge com o lead.

**Não serve** para a análise da calculadora: aquele PDF não é contrato, não pode entrar em `/contracts` nem avançar o lead para “Contrato enviado”.

---

## 2. Decisão de path (CRM fecha)

**Opção A (preferida):** estender `/contract-templates` com `kind` + arquivo opcional. O Ops já chama esse recurso.

**Opção B:** criar `/document-templates` e deprecar o path antigo. Só se o CRM recusar misturar “contrato” e “proposta” no mesmo CRUD.

Enquanto o CRM não publicar, o front continua em `/contract-templates` JSON. MSW da UI (item seguinte do plan) pode aceitar `kind` extra **só no mock**.

---

## 3. Proposta — opção A

`kind`: `contract` | `reduction`. Default `contract` (templates atuais).

### 3.1 CRUD de modelo

```http
POST   /companies/{id}/contract-templates
       Content-Type: multipart/form-data
       name, kind=contract|reduction, is_active?
       file?          # application/pdf | DOCX (officedocument.wordprocessingml.document)
       body?          # texto; obrigatório se não houver file (legado)
       placeholders?  # opcional; se omitido, CRM extrai {{...}} do file ou do body

GET    /companies/{id}/contract-templates?kind=contract|reduction

GET    /companies/{id}/contract-templates/{template_id}

PATCH  /companies/{id}/contract-templates/{template_id}
       multipart ou JSON: name?, kind?, is_active?, file?, body?, placeholders?

DELETE /companies/{id}/contract-templates/{template_id}
```

Resposta (estender `ContractTemplateResponse`, **não** quebrar campos atuais):

```json
{
  "id": "uuid",
  "name": "Análise pré-aprovada",
  "kind": "reduction",
  "body": "",
  "placeholders": ["nome", "cpf", "parcela_atual", "parcela_nova", "economia_mensal"],
  "file_name": "analise-financeira.pdf",
  "mime_type": "application/pdf",
  "has_file": true,
  "is_active": true
}
```

Regras:

- Template **só texto** continua válido sem `file` (migração). `has_file: false`, `body` como hoje.
- Com `file`: CRM extrai `{{chaves}}` do PDF/DOCX (texto do arquivo, não AcroForm). UI pode **acrescentar** chaves em `placeholders`.
- MIME: no mínimo PDF e DOCX. Tamanho: alinhar anexos (20 MiB) ou documentar teto menor.
- `kind` imutável depois de criado, **ou** PATCH permitido só se o template não estiver em uso — CRM decide e escreve no contrato oficial.
- 422 se `kind=reduction` e o plano não tiver o vertical de redução (quando #51 existir). Até lá, qualquer empresa com `contracts` pode ter os dois kinds.

### 3.2 Contrato (`kind=contract`) — generate inalterado

```http
POST   /companies/{id}/leads/{lead_id}/contracts
       { template_id, title, data?: Record<string,string> }

POST   /companies/{id}/contracts/{contract_id}/generate
GET    /companies/{id}/contracts/{contract_id}/versions/{version}/content
```

`template_id` tem que ser `kind=contract` (422 se for `reduction`).

`data` deixa de ser só `valor`: o wizard manda **todas** as chaves do `placeholders[]`. Merge continua: lead preenche conhecidas; o resto vem do form.

### 3.3 Proposta de redução (`kind=reduction`) — **não** é contrato

```http
POST   /companies/{id}/leads/{lead_id}/documents
       { kind: "reduction", template_id, data: Record<string,string> }
       → 201 { id, attachment_id, lead_id, template_id, created_at }
```

- CRM faz o merge no arquivo do template e grava um **anexo no lead** (mesmo storage de `POST .../leads/{id}/attachments`).
- **Não** cria linha em `/contracts`. **Não** muda status do lead.
- Permissão: `attachments.upload` **ou** `contracts.create` — CRM escolhe uma e documenta. O Ops não inventa.
- Download: `GET .../leads/{lead_id}/attachments/{attachment_id}/content` (já existe).
- 404 se template não for `kind=reduction`.
- 422 se `data` não cobrir placeholder obrigatório (CRM lista os missing).

Se o CRM preferir reusar generate:

```http
POST   /companies/{id}/contract-templates/{template_id}/render
       { lead_id, data }
       → PDF bytes ou { attachment_id }
```

só com `kind=reduction`. O path de cima (`/leads/.../documents`) deixa o PDF no lugar certo (ficha do lead).

---

## 4. `data` dinâmico

Nomes e quantidade vêm do template, não de uma lista fixa no front.

**Contrato — mapeamento conhecido (wizard pré-preenche, editável):**

| Placeholder | Origem |
| --- | --- |
| `nome` | `lead.name` |
| `cpf` / `cnpj` | `lead.cpf` |
| `rg` | `lead.rg` |
| `email` | `lead.email` |
| `telefone` | `lead.phone` |
| `whatsapp` | `lead.whatsapp` |
| `cep` | `lead.address.cep` |
| `endereco` | rua + número + bairro |
| `cidade` / `estado` | endereço |
| `valor` | valor do contrato / `process.totalValue` |
| `parcelas` | `process.installments` |
| `valor_parcela` | `process.installmentValue` |
| `banco` | `process.bank` |
| `tipo_contrato` | `process.contractType` |
| demais | input livre no wizard |

**Redução — além do lead, o cálculo da calculadora:**

| Placeholder | Origem |
| --- | --- |
| `parcela_atual` | calculadora |
| `parcela_nova` | calculadora |
| `parcelas_restantes` | calculadora |
| `economia_mensal` / `economia_total` | calculadora |
| `percentual_reducao` | calculadora |
| `valor_original_restante` | calculadora |
| `valor_estimado_quitacao` | calculadora |
| `consultor` | sessão (`name`) |

Chaves que o modelo tiver e a UI não conhecer = campo texto no form. Não descartar.

Valores sempre **string** (como hoje). Moeda/percentual formatados no front (`pt-BR`) antes do POST.

---

## 5. Fora deste contrato

- Overlay por coordenadas, AcroForm, assinatura no PDF da proposta.
- Enviar o PDF por WhatsApp (fase futura em [`whatsapp-integration.md`](./whatsapp-integration.md)).
- Trocar `POST /contracts/:id/generate` para multipart.
- White-label de placeholders por vertical (#51) — a lista dinâmica já permite omitir `banco` no modelo.

---

## 6. O que o Ops faz depois que o CRM fechar

1. Atualizar este arquivo com o path **real** (A ou B) copiado do contrato do CRM.
2. UI de modelos: upload + filtro `kind` + chips de variáveis (todo `wave2-templates-ui`).
3. Wizard: um campo por placeholder; `createContract` manda `data` completo.
4. Calculadora #32: select de templates `kind=reduction`, POST documents, preview/download/anexar.
5. MSW: multipart fake, extração de `{{x}}`, generate interpola `data`.

Até o CRM publicar: **só documentação**. Sem path novo no client.

---

## 7. Checklist para o CRM

- [ ] Confirmar opção A (`kind` em `/contract-templates`) ou B (`/document-templates`).
- [ ] Multipart no create/patch; JSON legado ainda aceito.
- [ ] `GET ?kind=`
- [ ] Endpoint de proposta no lead (não-contrato) + anexo.
- [ ] 422 documentado: kind errado, MIME, placeholder faltando, template em uso.
- [ ] Copiar a tabela de `data` para `contrato-api-frontend.md`.
