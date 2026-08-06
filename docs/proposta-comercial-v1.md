# Proposta Comercial — Plataforma de Operação Comercial (CRM)

**Versão:** V1 (sem Inteligência Artificial)  
**Perfil do cliente:** empresa prestadora de serviço, time enxuto (até ~4 usuários)  
**Validade sugerida da proposta:** 15 dias

---

## 1. Resumo da oferta

Sistema web único para centralizar **leads, pipeline comercial, contratos, financeiro básico, dashboards e administração de usuários** — substituindo o uso fragmentado de planilhas, WhatsApp e controles manuais.

| Item                                                  | Valor          |
| ----------------------------------------------------- | -------------- |
| **Implantação V1 (projeto)**                          | **R$ 24.000**  |
| **Mensalidade** (hospedagem, suporte e evolução leve) | **R$ 590/mês** |
| **Horas extras** (fora do pacote mensal)              | **R$ 160/h**   |
| **Usuários inclusos na mensalidade**                  | até **5**      |

> **Contexto de precificação:** cliente com comercial em torno de R$ 15–20 mil/mês (+ receita da etapa jurídica). Preço calibrado para **alta chance de fechamento**, com parcelamento por marcos.

### Condições de pagamento sugeridas (recomendado)

| Marco                                             | %   | Valor    | Quando        |
| ------------------------------------------------- | --- | -------- | ------------- |
| Assinatura / kickoff                              | 30% | R$ 7.200 | na assinatura |
| Núcleo CRM (auth + leads + kanban + distribuição) | 35% | R$ 8.400 | ~semana 5–6   |
| Entrega final + go-live                           | 35% | R$ 8.400 | homologação   |

Mensalidade inicia no go-live.

### Alternativa ainda mais “fechável” (mesmo escopo)

| Item        | Valor                                           |
| ----------- | ----------------------------------------------- |
| Implantação | **R$ 19.900**                                   |
| Parcelas    | 4× de **R$ 4.975** (kickoff + 3 marcos mensais) |
| Mensalidade | **R$ 490/mês** a partir do go-live              |

Usar só se travar em R$ 24k. Não descer abaixo de ~R$ 18k sem cortar escopo.

---

## 2. Escopo incluso na V1

### Acesso e segurança

- Login e sessão autenticada
- Troca / definição de senha
- Gestão de usuários (criar, editar, ativar/desativar)
- Perfis e matriz de permissões
- Controle de acesso por tela/ação

### CRM e pipeline

- Cadastro e edição completa de leads
- Dados pessoais, endereço, origem/campanha e dados do processo
- Timeline/histórico do lead (imutável)
- Pipeline em **Kanban** (arrastar e soltar entre etapas)
- Visão em **tabela/listagem** com filtros e busca
- Detalhe do lead
- Importação de leads (planilha/CSV)
- Exportação da base de leads
- Consulta de CEP com autopreenchimento de endereço
- Validação de CPF

### Distribuição de leads

- Distribuição manual
- Round robin
- Distribuição por equipe
- Distribuição automática (regras básicas)
- Redistribuição

### Contratos

- Modelos/templates com placeholders
- Wizard de geração de contrato a partir do lead
- Geração de PDF
- Listagem e status (rascunho, enviado, assinado, arquivado)
- Confirmação de assinatura via **upload do documento assinado** (fluxo manual)

### Financeiro básico

- Contas a receber / pagamentos vinculados a contratos
- Status de pendente, confirmado e inadimplência simples
- Regras de comissão (fixa e percentual)
- Visão por período / responsável

### Dashboards e relatórios

- Dashboard comercial
- Dashboard administrativo
- Relatórios essenciais (leads, conversão, financeiro básico)
- Exportação dos relatórios principais (quando aplicável)

### Experiência e operação

- Interface web responsiva (desktop e mobile)
- Tema claro/escuro
- Pesquisa global básica
- Notificações in-app (não em tempo real push)
- Upload de anexos no lead/contrato
- Treinamento inicial da equipe (até 2 sessões remotas)
- Deploy em ambiente de produção
- Documentação de uso essencial (guia rápido)

### Suporte incluso na mensalidade

- Hospedagem e monitoramento básico
- Backups
- Correção de bugs da V1
- Até **4 horas/mês** de ajustes leves e melhorias pontuais
- Canal de suporte em horário comercial

---

## 3. Explicitamente fora do escopo (não incluso na V1)

| Item                                                                   | Observação            |
| ---------------------------------------------------------------------- | --------------------- |
| Integração com WhatsApp (API oficial ou não oficial)                   | V2                    |
| Disparo / sincronização de e-mail marketing ou caixa de entrada        | V2                    |
| Assinatura eletrônica integrada (Clicksign, Docusign, Autentique etc.) | V2                    |
| Automações avançadas (fluxos tipo “se X então Y”)                      | V2                    |
| Webhooks e API pública para terceiros                                  | V2                    |
| Agenda / calendário de compromissos                                    | V2                    |
| Módulo de tarefas com responsáveis e prazos                            | V2                    |
| Comentários colaborativos em tempo real                                | V2                    |
| Notificações push / tempo real (WebSocket)                             | V2                    |
| Aplicativo mobile nativo (iOS/Android)                                 | Futuro                |
| Portal do cliente externo                                              | Futuro                |
| Integrações com ERPs, bancos ou gateways de pagamento                  | Sob demanda           |
| Migração completa e limpeza de bases legadas complexas                 | Sob orçamento à parte |
| Customizações ilimitadas durante o projeto                             | Horas extras          |
| Treinamentos presenciais ou recorrentes                                | Sob demanda           |
| SLA 24/7 ou plantão                                                    | Não incluso           |
| Qualquer funcionalidade de **Inteligência Artificial**                 | V3                    |

> Se algo não está na seção **incluso**, considere **fora** até nova proposta.

---

## 4. Roadmap pós-V1 (orçamento separado)

### V2 — Integrações e produtividade

- WhatsApp
- E-mail
- Assinatura eletrônica
- Automações
- Webhooks / API pública
- Agenda e tarefas
- Comentários
- Notificações em tempo real

**Faixa indicativa (referência, não compromisso):** R$ 25.000 – R$ 55.000, conforme pacote escolhido.

### V3 — Inteligência Artificial

- Atendimento assistido
- Classificação de leads
- Apoio à criação de contratos
- Sumarização de histórico
- Previsão de conversão
- Recomendação de próximas ações

**Faixa indicativa:** sob discovery e volume de uso (tokens/infra).

---

## 5. Premissas

1. Até **5 usuários** ativos na V1; usuários adicionais sob acordo.
2. Conteúdo dos templates de contrato e regras de comissão fornecidos pelo cliente.
3. Domínio, e-mails e acessos necessários liberados em até 5 dias úteis após kickoff.
4. Feedback de homologação em até **5 dias úteis** por marco; atraso pode deslocar o cronograma.
5. Alterações de escopo após assinatura geram aditivo (valor e prazo).
6. Propriedade intelectual / licença de uso: **a definir no contrato** (licença de uso vs. cessão). Recomendação para produto SaaS futuro: **licença de uso** + mensalidade.

---

## 6. Cronograma estimado

| Fase                                      | Duração sugerida        |
| ----------------------------------------- | ----------------------- |
| Kickoff + configuração                    | 1 semana                |
| Auth, usuários, permissões                | 1–2 semanas             |
| CRM, kanban, import/export, distribuição  | 3–4 semanas             |
| Contratos + financeiro básico             | 2–3 semanas             |
| Dashboards, polish, homologação e go-live | 1–2 semanas             |
| **Total**                                 | **aprox. 8–12 semanas** |

---

## 7. Texto curto para enviar ao cliente

> Proposta da V1: centraliza leads, pipeline (kanban), distribuição, contratos com PDF, financeiro básico (comissões), dashboards e permissões.
>
> **Investimento:** R$ 24.000 de implantação (em 3 marcos: R$ 7.200 + R$ 8.400 + R$ 8.400) + R$ 590/mês a partir do go-live.
>
> Não inclui WhatsApp, assinatura eletrônica automática, automações avançadas nem IA — fases seguintes com proposta própria.
>
> Feito para o time operar em um único sistema, com menos perda de lead e mais previsibilidade do comercial → jurídico.

---

## 8. Checklist rápido (para anexar na proposta)

|                                     | Incluso V1 | Não incluso / V2+ |
| ----------------------------------- | ---------- | ----------------- |
| Login, usuários e permissões        | ✅         |                   |
| Leads + timeline                    | ✅         |                   |
| Kanban + tabela                     | ✅         |                   |
| Import/export CSV                   | ✅         |                   |
| Distribuição de leads               | ✅         |                   |
| Contratos + PDF + upload assinado   | ✅         |                   |
| Financeiro básico + comissões       | ✅         |                   |
| Dashboards comercial e admin        | ✅         |                   |
| Relatórios essenciais               | ✅         |                   |
| WhatsApp / e-mail integrados        |            | ❌                |
| Assinatura eletrônica automática    |            | ❌                |
| Automações / webhooks / API pública |            | ❌                |
| Agenda, tarefas, comentários live   |            | ❌                |
| Inteligência Artificial             |            | ❌                |
