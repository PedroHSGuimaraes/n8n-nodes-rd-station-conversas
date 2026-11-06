# Changelog

## 1.0.0

- **Node `RD Station Conversas`.** Um node com seletor Recurso → Operação cobre as 42 rotas não deprecadas da API: contatos, campos personalizados, atendentes, fluxos, workflows do CRM, jobs, mensagens, templates, carteiras, integrações do WhatsApp, relatórios, analytics e campanhas.
- **Credencial `RD Station Conversas API`.** Token JWT em campo senha, enviado como `Authorization: Bearer`, com teste em `GET /v2/employees` e um campo opcional para a chave privada JWK.
- **Histórico de mensagens decriptado.** O node abre o JWE da API com `node:crypto` (RSA-OAEP-256 com AES-GCM ou AES-CBC-HMAC), sem dependência de runtime.
- **Campos guiados.** Contato, template, atendente, fluxo, campanha e campo personalizado têm lista pesquisável, ID e, no contato, telefone.
- **Operações em massa protegidas.** Apagar contatos só aceita tag ou integração, a chave `$all` nunca é enviada e reiniciar fluxos exige `Confirm Restart`.
- **Sem gatilho.** A documentação do Conversas não descreve webhooks, então o pacote não traz node de gatilho.
- **Toolchain.** `@n8n/node-cli` 0.55.5, lint em modo strict, testes com `node --test`, CI em todo Pull Request e publicação por tag com provenance.
