# Integração WhatsApp (V2)

O comercial já fala com o lead no WhatsApp. Na V1 isso **não** passa pelo CRM: o Ops só guarda o número e abre o app do consultor. Integração real (envio, recebimento, templates HSM) é **V2**, orçamento separado — ver [`docs/proposta-comercial-v1.md`](./proposta-comercial-v1.md) e [`specs/02-front-end.md`](../specs/02-front-end.md).

**Esta onda não altera produto.** O deep link `wa.me` em [`LeadDetail.tsx`](../src/modules/leads/components/LeadDetail.tsx) permanece. Este arquivo fecha canal, dono e fases para quando o `saas-crm` implementar.

---

## 1. Como está hoje

| Superfície | Comportamento |
| --- | --- |
| Campo `whatsapp` no lead | Cadastro / edição; fallback para `phone` no adapter |
| Ação rápida no detalhe | `https://wa.me/55{só dígitos}` — conversa no celular/WhatsApp Web **do consultor** |
| Timeline | Tipo `WhatsApp` é registro **manual** (o consultor anota o que aconteceu) |
| Contrato / calculadora | PDF baixa no browser; **não** vai para o WhatsApp |

Nada disso usa token da Meta, webhook ou template aprovado. A conversa não fica na empresa: some se o consultor sair.

---

## 2. Canal

**Preferido:** [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) (Meta). Oficial, WABA por empresa, templates HSM, webhooks.

**Alternativa** (se a empresa não tiver WABA / Cloud API ainda): Evolution API ou Z-API (instância própria). Mesmo contrato interno no CRM: o Ops **não** escolhe o provedor no browser. O CRM adapta o conector.

Não misturar os dois no mesmo tenant sem feature flag no CRM.

---

## 3. Dono

| Peça | Onde vive |
| --- | --- |
| Credencial WABA / token / phone_number_id | `saas-crm` (secret por empresa). **Nunca** no bundle do Ops nem em `NEXT_PUBLIC_*` |
| Envio (HSM / sessão) | `saas-crm` |
| Webhook inbound (Meta → CRM) | `saas-crm` (URL pública, validação de assinatura) |
| Templates HSM (aprovação Meta) | `saas-crm` + painel da empresa |
| Proxy | `api-gateway` 1:1, como o resto |
| UI | `cypher-ops` consome thread/timeline via BFF `/api/bff` |

O Ops só mostra o que o CRM já persistiu. Retry, fila e 24h de janela de sessão são problema do CRM.

---

## 4. Identidade

A conversa é da **empresa** (WABA do tenant), não do chip pessoal do consultor.

- Número de origem = telefone da WABA cadastrado na empresa.
- O consultor aparece como **actor** no evento da timeline (`actor_name` / `user_id`), não como remetente do WhatsApp.
- Deep link `wa.me` (V1) usa o WhatsApp **pessoal** — incompatível com essa identidade. Por isso a V2 **não** substitui `wa.me` no mesmo PR da fase 1: o botão antigo continua até a inbox (fase 3) estar usável.

---

## 5. Fases

Ordem bloqueante. Cada fase fecha sozinha.

### Fase 1 — HSM de saída + evento na timeline

O consultor dispara um template aprovado (ex.: “recebemos seu cadastro”, “proposta em anexo — link”).

- CRM: `POST .../leads/{id}/whatsapp/messages` (nome ilustrativo) com `template_name` + variáveis.
- Sucesso grava evento de timeline (`WHATSAPP_OUTBOUND` ou equivalente) com recorte do texto, **sem** o payload bruto da Meta.
- Falha (número inválido, template rejeitado, 24h) vira erro da API; o Ops mostra o `message` do BFF.
- Anexo de PDF: **fora desta fase**. Mandar a proposta da calculadora pelo WhatsApp fica como fase futura (abaixo).

Critério: no detalhe do lead, um envio aparece na timeline sem o consultor copiar/colar.

### Fase 2 — Inbound → timeline

Webhook da Cloud API (mensagem, status delivered/read, erros).

- CRM valida assinatura, resolve o lead pelo número (`whatsapp` / `phone`), cria evento `WHATSAPP_INBOUND`.
- Mídia (áudio, imagem): CRM baixa e anexa no lead se `attachments` estiver no plano; senão guarda só o texto/caption.
- Número desconhecido: **não** cria lead sozinho nesta fase (evita lixo no funil). Log + fila morta no CRM.

Critério: resposta do cliente no WABA aparece na timeline sem digitação manual.

### Fase 3 — Inbox no lead

Thread cronológica no detalhe (além da timeline genérica), composer com:

- templates HSM se a janela de 24h fechou;
- texto livre se a janela está aberta.

Aí sim o `wa.me` pode virar secundário (“abrir no app pessoal”) ou sumir atrás de feature flag.

Critério: o comercial responde pelo Ops sem sair da ficha.

---

## 6. Fora desta onda (e da V1)

- Bot, roteamento por IA, classificação automática (V3 na proposta comercial).
- Trocar o botão `wa.me` agora.
- Enviar o PDF da calculadora / contrato pelo WhatsApp — depende da fase 1 + storage do PDF no CRM. Registrar como **fase 4** quando 1–3 existirem.
- SMTP / inbox de e-mail (outro trilho; o `.eml` do contrato é só cliente local).

---

## 7. O que este repo faria depois (não agora)

Quando o CRM publicar o contrato em `saas-crm/docs/contrato-api-frontend.md`:

1. BFF já encaminha `/api/bff/...` — sem rota especial se o path for o mesmo do CRM.
2. Tipos + services em `src/modules/leads` (ou `src/modules/whatsapp`) lendo a thread.
3. UI no `LeadDetail`: lista da fase 3; fase 1 pode ser um dialog “Enviar WhatsApp” com select de HSM.
4. MSW dos novos paths.
5. **Não** colocar token Meta no front.

Até lá: zero diff de produto. Só este documento.

---

## 8. Contrato de API — rascunho para o CRM

O front **não inventa** esses paths. São um pedido para o `saas-crm` fechar e copiar no contrato oficial.

```http
GET    /companies/{id}/whatsapp/status
       → { connected, phone_display, provider: cloud_api|evolution|zapi }

GET    /companies/{id}/whatsapp/templates
       → [{ name, language, body_preview, variables[] }]

POST   /companies/{id}/leads/{lead_id}/whatsapp/messages
       { template_name, language?, variables: Record<string,string> }
       → { id, status, timeline_event_id }

GET    /companies/{id}/leads/{lead_id}/whatsapp/thread
       → [{ id, direction: in|out, body, created_at, actor_user_id? }]
```

Webhook Meta **não** passa pelo Ops. URL no CRM.

Permissões sugeridas (espelhar o resto): `whatsapp.view` / `whatsapp.send`. Feature flag `whatsapp` no plano (Enterprise, ou add-on).

---

## 9. Relação com o board

| Item | Relação |
| --- | --- |
| Calculadora #31 / PDF #32 | O PDF continua download/anexo no lead. WhatsApp **não** é o canal de envio nesta onda. |
| Contrato #33 (`.eml`) | E-mail local; trilho separado. |
| CRM genérico #51 | Número de WhatsApp permanece campo de contato, independente do vertical. |
