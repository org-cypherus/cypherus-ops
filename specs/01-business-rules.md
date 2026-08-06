# 01 - Regras de Negócio

> Este documento centraliza as regras de negócio da plataforma. Regras específicas de cada domínio também aparecem detalhadas em [`modules/`](./modules/).

---

## Lead

### Dados obrigatórios do Lead

**Dados pessoais**

- Nome
- CPF
- RG
- Data de nascimento
- Email
- Telefone
- WhatsApp

**Endereço**

- CEP
- Rua
- Número
- Bairro
- Cidade
- Estado

**Dados comerciais**

- Origem
- Campanha
- Canal
- Responsável
- Data de cadastro
- Status
- Prioridade
- Tags

**Dados do processo** (exemplo empresa financeira)

- Banco
- Número de parcelas
- Valor da parcela
- Valor financiado
- Valor total
- Tipo de contrato
- Observações

### Regras

- Um Lead sempre pertence a um Responsável (usuário do time comercial).
- Um Lead sempre possui um Status, que corresponde a uma coluna do Pipeline (Kanban).
- Todo Lead deve manter um histórico (Timeline) de eventos. **O histórico nunca deve ser apagado.**
- CPF deve ser validado (formato e dígitos verificadores) antes de salvar.
- CEP deve permitir autopreenchimento de endereço (integração de consulta de CEP).
- Deve ser possível importar Leads em lote (planilha/CSV) e exportar a base de Leads.

### Timeline (histórico do Lead)

Eventos típicos, em ordem cronológica:

- Criado
- Primeiro contato
- Ligação
- WhatsApp enviado
- Email enviado
- Contrato criado
- Contrato assinado
- Pagamento recebido

Regra: **nunca apagar histórico**. Qualquer alteração relevante deve gerar uma entrada de Timeline.

---

## Pipeline (Kanban)

Colunas padrão (configuráveis pelo Administrador):

```text
Novo Lead
  ↓
Contato realizado
  ↓
Em negociação
  ↓
Contrato enviado
  ↓
Contrato assinado
  ↓
Pagamento confirmado
  ↓
Concluído
```

### Regras

- Cada coluna deve exibir: quantidade de leads e valor potencial somado.
- Movimentação de Lead entre colunas ocorre via drag and drop e deve gerar entrada na Timeline.
- Deve ser possível filtrar e pesquisar leads dentro do board.
- Mudança de status pode disparar notificações (ex.: "Contrato assinado").

---

## Distribuição de Leads

Estratégias suportadas:

- **Manual**: um gestor/administrador atribui o lead a um responsável.
- **Round Robin**: distribuição sequencial e equilibrada entre os vendedores disponíveis.
- **Distribuição por equipe**: leads roteados para uma equipe específica com base em critérios (origem, campanha, região).
- **Distribuição automática**: regras configuráveis (ex.: por origem, por horário, por carga de trabalho).
- **Redistribuição**: leads parados/sem movimentação por X dias podem ser redistribuídos automaticamente ou manualmente.

### Regras

- Toda distribuição/redistribuição deve gerar entrada de Timeline e Auditoria.
- Deve haver limite configurável de leads simultâneos por vendedor (opcional, V2+).

---

## Contratos

Fluxo:

```text
Selecionar Lead
  ↓
Selecionar Modelo
  ↓
Preencher dados
  ↓
Gerar PDF
  ↓
Enviar assinatura
  ↓
Assinado
  ↓
Arquivado
```

### Modelos (Templates)

- Permitir cadastro de múltiplos templates (ex.: Contrato Pessoa Física, Pessoa Jurídica, Contrato Premium).
- Utilizar placeholders para interpolação de dados do Lead, ex.: `{{nome}}`, `{{cpf}}`, `{{valor}}`, `{{parcelas}}`.

### Regras

- Um contrato sempre está vinculado a um Lead.
- Contrato gerado deve produzir um PDF versionado (não pode ser sobrescrito silenciosamente).
- Um contrato só é considerado "Assinado" após confirmação do provedor de assinatura eletrônica (V2) ou upload manual do documento assinado (MVP).
- Contrato assinado dispara: atualização do status do Lead + evento de Timeline + gatilho para o módulo Financeiro.

---

## Financeiro

Fluxo:

```text
Contrato
  ↓
Pagamento
  ↓
Confirmado
  ↓
Comissão
  ↓
Finalizado
```

### O financeiro deve permitir

- Contas recebidas
- Contas pendentes
- Inadimplência
- Pagamentos
- Recebimentos

### Regras

- Um pagamento está sempre vinculado a um contrato (e, por consequência, a um Lead).
- Pagamento confirmado é o gatilho para cálculo de comissão.
- Inadimplência deve ser calculada a partir de pagamentos pendentes com vencimento ultrapassado.

---

## Comissão

O Administrador pode configurar:

- Comissão fixa
- Comissão percentual
- Regras por plano/produto

Exemplo:

```text
Plano A → 15%
Plano B → 20%
```

### Regras

- Comissão é calculada automaticamente após confirmação de pagamento.
- Deve ser possível auditar o cálculo de cada comissão (base de cálculo, percentual/valor aplicado, responsável).

---

## Perfis e Permissões (RBAC)

### Perfis padrão

| Perfil | Descrição |
|---|---|
| Administrador | Acesso total ao sistema |
| Gestor | Visualiza e gerencia a equipe |
| Comercial | Acesso restrito aos próprios leads |
| Financeiro | Acesso ao módulo financeiro |
| Jurídico | Acesso ao módulo de contratos |

### Permissões por módulo (exemplo)

**CRM**: visualizar, criar, editar, excluir

**Financeiro**: visualizar, editar

**Dashboard**: visualizar

**Relatórios**: exportar

### Regras

- Todo módulo deve possuir seu próprio conjunto de permissões (RBAC granular).
- Um usuário pode ter mais de um perfil (composição de permissões).
- Ações não autorizadas devem ser bloqueadas tanto na UI (ocultar/desabilitar) quanto na API.

---

## Notificações

Eventos que devem gerar notificação:

- Novo Lead
- Contrato assinado
- Pagamento confirmado
- Lead parado (sem movimentação por X dias)
- Meta atingida

---

## Uploads / Anexos

Tipos de arquivo suportados:

- PDF
- Imagem
- Documento
- Comprovante

### Regras

- Todo upload deve ser vinculado a uma entidade (Lead, Contrato, Pagamento).
- Deve haver limite de tamanho e validação de tipo de arquivo.

---

## Pesquisa Global

Deve ser possível pesquisar por:

- Nome
- CPF
- Telefone
- Email
- Contrato

---

## Auditoria

Toda ação relevante deve gerar log de auditoria, contendo:

- Usuário responsável
- Entidade alterada
- Campo alterado
- Valor anterior
- Valor novo
- Data/hora

Exemplo:

```text
Usuário X alterou Lead
Campo: Status
Antes: Negociação
Depois: Contrato enviado
```

### Regras

- Log de auditoria é imutável (não pode ser editado ou apagado).
- Deve ser possível consultar o histórico de auditoria por entidade, usuário ou período.
