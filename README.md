# n8n-nodes-rd-station-conversas

Node community do [n8n](https://n8n.io/) para o **[RD Station Conversas](https://www.rdstation.com/conversas/)** (chat e WhatsApp, o antigo Tallos).

O pacote traz **um node** (`RD Station Conversas`) com seletor **Recurso → Operação** e **uma credencial** (`RD Station Conversas API`). Ele cobre as 42 rotas não deprecadas da [API do Conversas](https://developers.rdstation.com/reference/conversas-v2-authentication): contatos, mensagens, templates, histórico decriptado, campanhas, relatórios e analytics.

[n8n](https://n8n.io/) é uma plataforma de automação de fluxos com [licença fair-code](https://docs.n8n.io/reference/license/).

## 📦 Instalação

Siga o [guia de community nodes](https://docs.n8n.io/integrations/community-nodes/installation/) do n8n. No n8n, vá em **Settings → Community Nodes → Install** e digite:

```
n8n-nodes-rd-station-conversas
```

## 🔑 Credencial

1. No RD Station Conversas, abra **Apps e Integrações → API** (<https://app.tallos.com.br/app/integrations/api>) e copie o **token JWT** da conta.
2. No n8n, crie uma credencial **RD Station Conversas API** e cole o token em **API Token**.
3. Clique em **Test**. O teste chama `GET /v2/employees`: `200` mostra sucesso, `401` (token inválido) e `403` (sem permissão) mostram falha.

O token é enviado como `Authorization: Bearer <token>`. O servidor é fixo (`https://api.tallos.com.br`), por isso a credencial não tem campo de URL. O campo **Private Key (JWK)** é opcional e só serve ao histórico de mensagens (veja [Chave de criptografia do histórico](#-chave-de-criptografia-do-histórico)).

## 🧰 Recursos e operações

Todo campo de ID mostra uma **lista pesquisável** (modo _From List_, o padrão) e aceita colar o ID (_By ID_). Onde a rota pede o `_id` do contato, existe também o modo **By Phone**: o node resolve o telefone com `GET /v2/contacts/{telefone}/exists`. Telefones usam o formato internacional, só dígitos (por exemplo `5511999998888`); `+`, espaços, hífen e parênteses são removidos para você.

As listas com paginação têm **Return All** e **Limit**. Exclusões devolvem `{ "deleted": true }`.

- Analytics: Get Attendance Summary — `GET /v1/analytics/attendances/summary`
- Analytics: Get Contacts Origin — `GET /v1/analytics/contacts/origin`
- Analytics: Get Retention — `GET /v1/analytics/attendances/retention`
- Analytics: Get Reviews Average — `GET /v1/analytics/attendances/reviews/average`
- Campaign: Get — `GET /v1/campaigns/{id}`
- Campaign: Get Many — `GET /v1/campaigns`
- Contact: Create — `POST /v2/contacts/whatsapp-business-by-brokers`
- Contact: Create Many — `POST /v2/contacts/bulk` (plano Advanced, devolve um _job_)
- Contact: Delete Many by Integration — `DELETE /v2/contacts` ⚠️ irreversível
- Contact: Delete Many by Tag — `DELETE /v2/contacts` ⚠️ irreversível
- Contact: Get by CPF — `GET /v2/contacts/cpf/{cpf}/exists`
- Contact: Get by Phone — `GET /v2/contacts/{telefone}/exists`
- Contact: Get Many — `GET /v2/customers`
- Contact: Update — `PUT /v2/contacts/whatsapp-business-by-brokers`
- Contact: Update by Phone — `PATCH /v2/contacts/{telefone}` (plano Advanced)
- CRM Workflow: Get Many — `GET /v2/workflows`
- Custom Field: Create — `POST /v2/custom-fields` (beta)
- Custom Field: Delete — `DELETE /v2/custom-fields/{id}`
- Custom Field: Get — `GET /v2/custom-fields/{id}`
- Custom Field: Get Many — `GET /v2/custom-fields`
- Custom Field: Update — `PUT /v2/custom-fields/{id}`
- Employee: Activate — `PUT /v2/employees/{id}/activate`
- Employee: Create Many — `POST /v2/employees/bulk` (plano Advanced, devolve um _job_)
- Employee: Deactivate — `PUT /v2/employees/{id}/deactivate`
- Employee: Deactivate Many — `PATCH /v2/employees/deactivate` (plano Advanced)
- Employee: Get — `GET /v1/employees/{id}`
- Employee: Get Many — `GET /v2/employees`
- Flow: Forward Contact — `POST /v2/forward-to-customer`
- Flow: Get Many — `GET /v2/flows`
- Flow: Reset All Contacts Flow — `POST /v2/reset-customers-flow-processes` ⚠️ exige confirmação
- Job: Get — `GET /v2/jobs/{id}`
- Message: Get History — `GET /v2/messages/history` (planos Pro e Advanced, decriptado)
- Message: Send — `POST /v2/messages/{id}/send`
- Message: Send Template — `POST /v3/messages/template/send`
- Report: Get Campaign Report — `GET /v4/reports/campaign/{id}`
- Report: Get Many — `GET /v4/reports`
- Template: Get Many — `GET /v2/template/all`
- Wallet: Add Contact — `POST /v2/wallets`
- Wallet: Get Many — `GET /v2/wallets`
- Wallet: Remove All Contacts — `POST /v2/customers/wallets/remove-all`
- Wallet: Remove Contact — `PATCH /v2/wallets/{id}`
- WhatsApp Integration: Get Many — `GET /v2/whatsapp/integrations` (com **Official Only**: `/official`)

**Rotas deprecadas, deixadas de fora:** `POST /v2/contacts`, `POST /v2/contacts/whatsapp-business`, `PUT /v2/contacts/whatsapp-business`, `POST /v2/messages/{id}/send-template-filled`, `POST /v2/messages/{id}/send-template-filled-by-brokers` e `POST /api/v3/message/template/send`. Use `Contact: Create`, `Contact: Update` e `Message: Send Template`.

**Sem gatilho (trigger):** a documentação do Conversas não descreve webhook, evento nem payload. Para reagir a eventos, use o node _Webhook_ do n8n configurado no painel do Conversas.

Envio de mensagem: sem anexo, o corpo vai como `application/x-www-form-urlencoded`; com anexo (campo **Attach Binary Property**), vai como `multipart/form-data`. Um `201` em **Send Template** **não garante a entrega**.

## 🔐 Chave de criptografia do histórico

O histórico (`Message: Get History`) chega **criptografado** da API (JWE compacto). O node abre o conteúdo sozinho, com o módulo `node:crypto` do Node e sem nenhuma dependência extra, usando a sua chave privada. Para gerar a chave:

1. No RD Station Conversas, abra **Apps e Integrações → API** e clique em **Gerar Chave**.
2. Copie o JSON da chave (formato JWK, com `kty: "RSA"`).
3. Cole esse JSON no campo **Private Key (JWK)** da credencial.

A chave é exclusiva da conta: não a compartilhe. Sem a chave, a operação falha **antes** de chamar a API e explica onde gerá-la. O node aceita `RSA-OAEP-256` com `A128GCM`, `A192GCM`, `A256GCM`, `A128CBC-HS256`, `A192CBC-HS384` e `A256CBC-HS512`; outro `enc` falha com uma mensagem que cita o valor lido.

## ⚠️ Operações irreversíveis

- **Contact: Delete Many by Tag** e **by Integration** apagam **todos** os contatos com a tag ou a integração, e **não há como desfazer**. A opção `$all` da API (apagar todos os contatos da empresa) **nunca é enviada nem exposta**: um texto `$all` digitado vai apenas como valor de tag.
- **Flow: Reset All Contacts Flow** reinicia o fluxo dos contatos. A API não documenta o escopo e a rota pode valer para todos os contatos, por isso a operação exige ligar **Confirm Restart** (desligado por padrão); sem isso ela falha antes de qualquer requisição.
- **Wallet: Remove All Contacts** esvazia uma carteira (os contatos não são apagados).

## 💳 Planos (Pro e Advanced)

O node **não checa o plano**: quem responde é a API. O histórico de mensagens exige **Pro** ou **Advanced**; criação e atualização em massa e `Update by Phone` exigem **Advanced**. Sem o plano, a API devolve `403` e o node mostra a mensagem com o motivo.

## 📏 Limites

- Toda requisição tem **timeout de 30 s**.
- Contatos e campanhas são paginados de 100 em 100, e o relatório de campanha de 50 em 50.
- A documentação não informa limite de taxa nem `429`; o erro, se vier, aparece como erro da API.
- A lista de **Departments** é montada a partir dos 50 primeiros atendentes (a API não tem rota de departamentos).
- A busca por nome na lista de contatos filtra a página de 100 contatos carregada; se o contato não aparecer, role a lista ou cole o ID ou o telefone.
- Três formatos ainda não foram provados com a API real e dependem do seu teste: arrays na query do histórico (`channel`, `sent_by`, `type`), o corpo de envio (urlencoded e multipart) e o par `recipient_number` mais `country_code` do template.
- O texto do histórico é lido como UTF-8 e, se os bytes não forem UTF-8 válido, como latin1 (AD-015). Um texto latin1 que por acaso forme só pares UTF-8 válidos (como `SÃ£o`) sairia como UTF-8; a API real decide isso no seu teste.
- Criações em massa rodam em segundo plano: use **Job: Get** em um laço com _Wait_ para acompanhar.

## 🛠️ Desenvolvimento e teste local

```bash
npm install --ignore-scripts
npm run dev      # n8n-node dev: abre um n8n local com o node carregado e recarrega ao salvar
npm run lint     # n8n-node lint (modo strict)
npm test         # compila e roda os testes (node --test)
npm run build
```

Para testar com a sua conta: rode `npm run dev`, crie a credencial com o token (e a chave JWK, se for ler o histórico) e monte um workflow com `Employee: Get Many` para conferir o token. Depois teste `Message: Get History` (formato do JWE) e `Message: Send` (corpo do envio) — são os dois contratos que a documentação deixa em aberto.

## 📄 Licença

[MIT](LICENSE.md)
