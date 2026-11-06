# n8n-nodes-rd-station-conversas

Node community do [n8n](https://n8n.io/) para o **[RD Station Conversas](https://www.rdstation.com/conversas/)** (chat e WhatsApp, o antigo Tallos).

[![Apoie no Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_a_Coffee-Apoie_o_projeto-FFDD00?logo=buy-me-a-coffee&logoColor=000000)](https://buymeacoffee.com/qTny0AzFXS)

O RD Station Conversas é a plataforma de atendimento por chat e WhatsApp da RD. O pacote traz **um node** (`RD Station Conversas`) com seletor **Recurso → Operação** e **uma credencial** (`RD Station Conversas API`). Ele cobre as 42 rotas não deprecadas da [API do Conversas](https://developers.rdstation.com/reference/conversas-v2-authentication): contatos, mensagens, templates, histórico decriptado, campanhas, relatórios e analytics.

[n8n](https://n8n.io/) é uma plataforma de automação de fluxos com [licença fair-code](https://docs.n8n.io/reference/license/).

[Instalação](#-instalação) · [Credenciais](#-credenciais) · [Recursos e operações](#-recursos-e-operações) · [Histórico](#-chave-de-criptografia-do-histórico) · [Irreversíveis](#️-operações-irreversíveis) · [Planos](#-planos-pro-e-advanced) · [Limites](#-limites) · [Tool de IA](#-usar-como-tool-de-agente-de-ia) · [Desenvolvimento](#️-desenvolvimento-e-teste-local) · [Versões](#-versões) · [Suporte](#-suporte) · [Apoie](#-apoie-o-projeto)

---

## 🚀 Funcionalidades

- **Um node unificado** — `RD Station Conversas`, com seletor **Recurso → Operação** e 13 recursos.
- **42 operações** — contatos, campos personalizados, atendentes, fluxos, workflows do CRM, jobs, mensagens, templates, carteiras, integrações do WhatsApp, relatórios, analytics e campanhas.
- **Listas pesquisáveis** — contato, template, atendente, fluxo, campanha e campo personalizado vêm da sua conta. Você escolhe pelo nome ou cola o ID. No contato, também vale o telefone.
- **Histórico de mensagens decriptado** — o node abre o histórico criptografado da API com a sua chave privada, sem dependência extra.
- **Return All e Limit** — as listas com paginação buscam tudo ou param no limite que você define.
- **Operações em massa protegidas** — apagar contatos só aceita tag ou integração, e reiniciar fluxos exige confirmação.
- **Usável como Tool de IA** — o node tem `usableAsTool: true`, então um **AI Agent** do n8n pode chamar as operações. Veja [Usar como Tool de Agente de IA](#-usar-como-tool-de-agente-de-ia).
- **Zero dependências de runtime** — só o `n8n-workflow` do próprio n8n. Toda requisição leva timeout de 30 s.

## 📦 Instalação

Siga o [guia de community nodes](https://docs.n8n.io/integrations/community-nodes/installation/) do n8n. No n8n, vá em **Settings → Community Nodes → Install** e digite:

```
n8n-nodes-rd-station-conversas
```

> Requer uma instância n8n com `n8nNodesApiVersion` 1.

## 🔑 Credenciais

O pacote tem uma credencial: **RD Station Conversas API**.

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

Envio de mensagem: sem anexo, o corpo vai como `application/x-www-form-urlencoded`; com anexo (campo **Attach Binary Property**), vai como `multipart/form-data`. Um `201` em **Send Template** **não garante a entrega**.

## 🔔 Gatilho

O pacote **não tem node de gatilho** (trigger). A documentação do Conversas não descreve webhook, evento nem payload. Para reagir a eventos, use o node _Webhook_ do n8n configurado no painel do Conversas.

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

## 🤖 Usar como Tool de Agente de IA

O node `RD Station Conversas` é **usável como tool** por nós de **AI Agent** do n8n (Tools Agent). Isso deixa o modelo **executar ações no seu Conversas sozinho** — por exemplo: *"envie 'Seu pedido está pronto' para o contato 5511999998888"*.

### Como ligar (2 passos)

1. **No servidor n8n**, habilite o uso de community nodes como tools (por segurança, vem **desligado por padrão**). Defina a variável de ambiente:

   ```bash
   N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true
   ```

   | Instalação | Onde definir |
   | --- | --- |
   | **Docker / docker-compose** | Adicione em `environment:` do serviço n8n (ou no `.env`) e recrie o container (`docker compose up -d`). |
   | **npm / npx** | Exporte antes de subir: `export N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true && n8n start`. |
   | **n8n Cloud** | Já habilitado nos planos que suportam community nodes. |

   > Sem essa variável o node **não aparece** na lista de tools do AI Agent — é a causa nº 1 de "não acho o node como tool".

2. **No workflow**, adicione um node **AI Agent**, conecte um **Chat Model** e, no conector **Tool**, adicione o **RD Station Conversas**. Escolha o **Recurso** e a **Operação** que o agente pode usar (ex.: Message → Send). Uma tool por operação é a prática recomendada.

### Deixe o modelo preencher os campos (`$fromAI`)

Em cada campo do node em modo tool aparece o botão **"Let the model define this"**, que usa a expressão. Exemplos neste pacote:

```
Message: Send, campo Message:
{{ $fromAI('message', 'Texto da mensagem a enviar ao contato', 'string') }}

Message: Send Template, campo Phone:
{{ $fromAI('phone', 'Telefone do contato, só dígitos, por exemplo 5511999998888', 'string') }}

Contact: Get by Phone, campo Phone:
{{ $fromAI('phone', 'Telefone do contato, só dígitos, por exemplo 5511999998888', 'string') }}
```

- Assinatura: `$fromAI(key, description?, type?, defaultValue?)` — `key` de 1–64 caracteres (`[a-zA-Z0-9_-]`); `type` = `string` | `number` | `boolean` | `json`.
- Você pode **misturar**: fixar alguns campos (ex.: sempre o mesmo template) e deixar o modelo preencher outros (telefone, variáveis).
- Quanto mais específico o seu prompt ou a System Message do agente, melhor o resultado.

### Boas práticas

- **Restrinja o escopo:** exponha só as operações que o agente precisa (ex.: só *Contact: Get by Phone* e *Message: Send*), em vez de liberar tudo.
- **Nunca libere as [operações irreversíveis](#️-operações-irreversíveis)** (*Delete Many by Tag*, *Delete Many by Integration*, *Reset All Contacts Flow*, *Remove All Contacts*) a um agente.
- **Credencial dedicada** com permissões mínimas para o agente. Deixe vazio o campo **Private Key (JWK)** se o agente não precisa do histórico.
- **n8n atualizado:** versões antigas tinham um bug em que a tool de community node retornava resposta vazia para o agente ([n8n#26202](https://github.com/n8n-io/n8n/issues/26202)); já corrigido.

### Referências

- [Tools Agent — n8n Docs](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent)
- [Let AI specify tool parameters (`$fromAI`) — n8n Docs](https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/)
- [Variáveis de ambiente de nodes — n8n Docs](https://docs.n8n.io/hosting/configuration/environment-variables/nodes/)

## 🛠️ Desenvolvimento e teste local

```bash
npm install --ignore-scripts
npm run dev      # n8n-node dev: abre um n8n local com o node carregado e recarrega ao salvar
npm run lint     # n8n-node lint (modo strict)
npm test         # compila e roda os testes (node --test)
npm run build
```

Para testar com a sua conta: rode `npm run dev`, crie a credencial com o token (e a chave JWK, se for ler o histórico) e monte um workflow com `Employee: Get Many` para conferir o token. Depois teste `Message: Get History` (formato do JWE) e `Message: Send` (corpo do envio) — são os dois contratos que a documentação deixa em aberto.

## ✅ Compatibilidade

- Requer n8n com `n8nNodesApiVersion` 1.
- Testado com o `n8n-workflow` 2.16 e o `@n8n/node-cli` 0.55.5.
- API do Conversas em `https://api.tallos.com.br`.

## 📚 Recursos

- [Documentação de community nodes do n8n](https://docs.n8n.io/integrations/community-nodes/)
- [Referência da API do RD Station Conversas](https://developers.rdstation.com/reference/conversas-v2-authentication)

## 🚀 Publicação

O `publish.yml` envia a versão com `npm stage publish` quando uma tag `v*.*.*` chega ao GitHub (ou quando alguém o roda à mão). A versão **fica em espera**: ela só vai ao ar depois que o dono a aprova, com 2FA, na aba **Staged Packages** do npmjs.com. Sem a aprovação, nada muda no registro.

## 📈 Versões

- **1.0.0** — **Primeira versão do pacote.** Node `RD Station Conversas` com as 42 rotas não deprecadas, credencial por token JWT, histórico de mensagens decriptado, campos guiados com lista pesquisável, operações em massa protegidas e sem gatilho. Veja o `CHANGELOG.md`. O pacote ainda não foi publicado no npm.

## 🆘 Suporte

Se algo não funcionar:

1. Confirme se o **token JWT** está correto e se o **Test** da credencial devolve sucesso. Um `401` indica token inválido, e um `403`, falta de permissão ou de plano.
2. Para o histórico de mensagens, confirme a **Private Key (JWK)** e o plano **Pro** ou **Advanced**.
3. Verifique se a versão do n8n é compatível.
4. Consulte os logs do n8n para detalhes do erro.
5. Abra uma [issue no GitHub](https://github.com/PedroHSGuimaraes/n8n-nodes-rd-station-conversas/issues).

## ☕ Apoie o projeto

Este node é mantido de forma independente. Se ele ajuda suas automações, você pode apoiar o desenvolvimento, a manutenção e as novas integrações pelo [Buy Me a Coffee](https://buymeacoffee.com/qTny0AzFXS).

## 📄 Licença

[MIT](LICENSE.md)
