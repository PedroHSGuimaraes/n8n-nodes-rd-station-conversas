# RD Station Conversas v1 checks

Build: `npx tsc --noEmit`; `npm run lint`
Run unit: `npm run build --silent && node --test --test-reporter=spec test/*.test.cjs`
Plan: `.specs/features/rd-station-conversas-v1/plan.md`

115 checks in 11 slices · 6 one-way doors · 0 open

## Checks

### S1 - package, toolchain and CI

**C1** - `npm run build` exits 0 and emits the node, credential and icon under `dist` (S1 AC 1)
Proof: `npm run build && test -f dist/nodes/RdStationConversas/RdStationConversas.node.js && test -f dist/credentials/RdStationConversasApi.credentials.js && test -f dist/nodes/RdStationConversas/rdStationConversas.svg`

**C2** - `npm run lint` exits 0 with 0 errors (S1 AC 2)
Proof: `npm run lint`

**C3** - `package.json` has the fixed name, version 1.0.0, scripts, strict, `@n8n/node-cli` 0.55.5, the community keyword and no `dependencies` (S1 AC 3)
Proof: run unit | ✔ C3:

**C4** - `npm test` builds and ends with `# fail 0` (S1 AC 4)
Proof: `npm test 2>&1 | grep -Eq "(# fail 0|ℹ fail 0)"`

**C5** - ci.yml runs `npm ci`, `npm run lint`, `npm test` and `npm run build` on pull requests (S1 AC 5)
Proof: run unit | ✔ C5:

**C6** - publish.yml validates tag = v + package version and publishes with provenance; tag `v1.0.0` passes the validation (S1 AC 6)
Proof: run unit | ✔ C6:

**C7** - tag `v1.0.1` against version 1.0.0 fails the validation step (S1 AC 7)
Proof: run unit | ✔ C7:

**C8** - every request of every operation carries `timeout` 30000 (S1 AC 8)
Proof: run unit | ✔ C8:

### S2 - credential

**C9** - `apiToken` and `privateKeyJwk` are password fields and `privateKeyJwk` is not required (S2 AC 1)
Proof: run unit | ✔ C9:

**C10** - requests send `Authorization: Bearer <apiToken>` and the credential has no editable base URL field (S2 AC 2)
Proof: run unit | ✔ C10:

**C11** - the credential test calls `GET /v2/employees` on `https://api.tallos.com.br` (S2 AC 3)
Proof: run unit | ✔ C11:

**C12** - the credential test does not swallow `401` or `403` (no `ignoreHttpStatusErrors`) (S2 AC 4)
Proof: run unit | ✔ C12:

**C13** - `documentationUrl` points to the Conversas authentication page and the `apiToken` hint says Apps and Integrations, API (S2 AC 5)
Proof: run unit | ✔ C13:

**C14** - the `privateKeyJwk` hint says it is only for message history and names Generate Key (S2 AC 6)
Proof: run unit | ✔ C14:

### S3 - contacts and custom fields

**C15** - `contact.getByPhone` with `+55 (11) 99999-8888` calls `GET /v2/contacts/5511999998888/exists` with `channel=whatsapp` (S3 AC 1)
Proof: run unit | ✔ C15:

**C16** - `contact.getByCpf` with `123.456.789-09` calls `GET /v2/contacts/cpf/12345678909/exists` (S3 AC 2)
Proof: run unit | ✔ C16:

**C17** - an invalid phone throws `The 'Phone' parameter is invalid [item 0]` with the E.164 description and sends no request (`5511999998888` ok, `11999` refused, `+55 11 99999-8888` ok, empty refused) (S3 AC 3)
Proof: run unit | ✔ C17:

**C18** - `contact.getAll` with Return All and pages of 100, 100, 37 calls `page` 1, 2, 3 and returns 237 items (S3 AC 4)
Proof: run unit | ✔ C18:

**C19** - `contact.getAll` with Limit 150 stops after 150 items without asking page 3 (S3 AC 5)
Proof: run unit | ✔ C19:

**C20** - `contact.create` posts `cel_phone`, `full_name`, `integration` and only the filled additional fields to `/v2/contacts/whatsapp-business-by-brokers` (S3 AC 6)
Proof: run unit | ✔ C20:

**C21** - a Workflow Stage without Workflow throws `The 'Workflow' parameter is empty [item 0]` (S3 AC 7)
Proof: run unit | ✔ C21:

**C22** - `contact.update` puts `cel_phone`, `full_name`, `integration` to `/v2/contacts/whatsapp-business-by-brokers` (S3 AC 8)
Proof: run unit | ✔ C22:

**C23** - `contact.updateByPhone` patches `/v2/contacts/5511999998888` and returns `{ customerId }` (S3 AC 9)
Proof: run unit | ✔ C23:

**C24** - `contact.createMany` with 3 contacts posts `{ contacts: [3] }` to `/v2/contacts/bulk` and returns the `job` (S3 AC 10)
Proof: run unit | ✔ C24:

**C25** - `customField.create` posts `{ label, info }` to `/v2/custom-fields` and returns the object (S3 AC 11)
Proof: run unit | ✔ C25:

**C26** - `customField.update` puts only `{ info }` to `/v2/custom-fields/{id}` and the screen has no `label` field for it (S3 AC 12)
Proof: run unit | ✔ C26:

**C27** - `customField.delete` with `204` returns `{ deleted: true }` (S3 AC 13)
Proof: run unit | ✔ C27:

**C28** - `customField.getAll` sends `page`, `limit`, `label` and stops when `page * limit` reaches `total` (S3 AC 14)
Proof: run unit | ✔ C28:

### S4 - messages, template and decrypted history

**C29** - `message.send` by phone resolves `GET /v2/contacts/5511999998888/exists` then posts `message=Ol%C3%A1&sent_by=bot` urlencoded to `/v2/messages/{_id}/send` (S4 AC 1)
Proof: run unit | ✔ C29:

**C30** - Sent By operator without an employee throws `The 'Employee' parameter is empty [item 0]` (S4 AC 2)
Proof: run unit | ✔ C30:

**C31** - a binary in `attach` sends multipart with `attach` plus the text fields (S4 AC 3)
Proof: run unit | ✔ C31:

**C32** - `message.sendTemplate` posts `recipient_number`, `template_message_id`, `variables`, `country_code` 55 and `sent_by` bot to `/v3/messages/template/send` (S4 AC 4)
Proof: run unit | ✔ C32:

**C33** - `sendTemplate` with operator and no operator id throws with the description `Choose an employee, or use Sent By: Bot` (S4 AC 5)
Proof: run unit | ✔ C33:

**C34** - `sendTemplate` returns `{ data, message }` from the `201` and its description warns that `201` does not guarantee delivery (S4 AC 6)
Proof: run unit | ✔ C34:

**C35** - `404` with `code` 301 on `sendTemplate` throws a `NodeApiError` naming the phone (S4 AC 7)
Proof: run unit | ✔ C35:

**C36** - `message.getHistory` with a key calls `GET /v2/messages/history` with `customer_id`, `limit` 100, `page`, decrypts `messages` and returns one item per message (S4 AC 8)
Proof: run unit | ✔ C36:

**C37** - a JWE RSA-OAEP-256 + A256GCM made in the test decrypts to the original message (S4 AC 9)
Proof: run unit | ✔ C37:

**C38** - the six `enc` values (A128GCM, A192GCM, A256GCM, A128CBC-HS256, A192CBC-HS384, A256CBC-HS512) all decrypt and an unknown `enc` fails as AC 12 (S4 AC 10)
Proof: run unit | ✔ C38:

**C39** - history without `privateKeyJwk` throws `The credential 'Private Key (JWK)' is empty [item 0]` and sends no request (S4 AC 11)
Proof: run unit | ✔ C39:

**C40** - a JWE that cannot be opened throws `The messages could not be decrypted [item 0]` naming the `enc` (S4 AC 12)
Proof: run unit | ✔ C40:

**C41** - history sends `start_date`/`end_date` as YYYY-MM-DD and `channel`, `sent_by`, `type` as arrays with the documented defaults (S4 AC 13)
Proof: run unit | ✔ C41:

**C42** - `403` on history throws a `NodeApiError` with `Message history needs the Pro or Advanced plan` (S4 AC 14)
Proof: run unit | ✔ C42:

### S5 - bulk and irreversible operations

**C43** - `contact.deleteManyByTag` sends `DELETE /v2/contacts` with body exactly `{ tag_name: "lead-frio" }` and returns `contacts_count` (S5 AC 1)
Proof: run unit | ✔ C43:

**C44** - `contact.deleteManyByIntegration` sends body exactly `{ integration: "integration-1" }` (S5 AC 2)
Proof: run unit | ✔ C44:

**C45** - an empty or blank tag throws `The 'Tag' parameter is empty [item 0]` and `"$all"` goes as a tag value, never as a key (S5 AC 3)
Proof: run unit | ✔ C45:

**C46** - no request of any operation, with empty, null or `"$all"` inputs, has `$all` among its body keys (S5 AC 4)
Proof: run unit | ✔ C46:

**C47** - the contact operation list has no delete-all operation and no `Delete All` field (S5 AC 5)
Proof: run unit | ✔ C47:

**C48** - both delete-many descriptions start with `Warning: permanently deletes`, say there is no undo and name tag or integration (S5 AC 6)
Proof: run unit | ✔ C48:

**C49** - `flow.resetAllContactsFlow` confirmed posts `/v2/reset-customers-flow-processes` without body and returns `{ message }` (S5 AC 7)
Proof: run unit | ✔ C49:

**C50** - `resetAllContactsFlow` with `confirmRestart` false throws `Turn on 'Confirm Restart' to restart the flow of the contacts [item 0]` and sends nothing (S5 AC 8)
Proof: run unit | ✔ C50:

**C51** - the reset description starts with `Warning: restarts the flow of the contacts` and says the scope is not documented (S5 AC 9)
Proof: run unit | ✔ C51:

**C52** - `wallet.removeAllContacts` posts `{ wallet_name: "VIP" }` and returns `quantityModified` (S5 AC 10)
Proof: run unit | ✔ C52:

**C53** - `employee.deactivateMany` patches `/v2/employees/deactivate` with `{ employees_ids: [a, b] }` (S5 AC 11)
Proof: run unit | ✔ C53:

**C54** - a `207` from `deactivateMany` returns one item per employee with the four fields (S5 AC 12)
Proof: run unit | ✔ C54:

**C55** - `employee.createMany` posts `email`, `name`, `role` of each to `/v2/employees/bulk` and returns the `job` (S5 AC 13)
Proof: run unit | ✔ C55:

### S6 - employees, flows, workflows, jobs, templates, wallets, integrations

**C56** - `employee.getAll` calls `GET /v2/employees` and returns `id`, `name`, `email` per employee (S6 AC 1)
Proof: run unit | ✔ C56:

**C57** - `employee.get` calls `GET /v1/employees/emp1` (S6 AC 2)
Proof: run unit | ✔ C57:

**C58** - `employee.activate` and `deactivate` call `PUT /v2/employees/emp1/activate` and `/deactivate` (S6 AC 3)
Proof: run unit | ✔ C58:

**C59** - `flow.getAll` calls `GET /v2/flows` and returns `id`, `title` per flow (S6 AC 4)
Proof: run unit | ✔ C59:

**C60** - `flow.forwardContact` posts `{ customer: "c1", flow: "f1" }` to `/v2/forward-to-customer` (S6 AC 5)
Proof: run unit | ✔ C60:

**C61** - `crmWorkflow.getAll` calls `GET /v2/workflows` and returns `title`, `stages` per workflow (S6 AC 6)
Proof: run unit | ✔ C61:

**C62** - `job.get` calls `GET /v2/jobs/j1` (S6 AC 7)
Proof: run unit | ✔ C62:

**C63** - `template.getAll` calls `GET /v2/template/all` and returns one item per template (S6 AC 8)
Proof: run unit | ✔ C63:

**C64** - `wallet.getAll` calls `GET /v2/wallets` and returns `{ name }` per wallet (S6 AC 9)
Proof: run unit | ✔ C64:

**C65** - `wallet.addContact` posts `{ customer: "c1", wallet: "VIP" }` to `/v2/wallets` (S6 AC 10)
Proof: run unit | ✔ C65:

**C66** - `wallet.removeContact` patches `/v2/wallets/c1` and returns `{ deleted: true }` on `204` (S6 AC 11)
Proof: run unit | ✔ C66:

**C67** - `whatsappIntegration.getAll` calls `/v2/whatsapp/integrations`, and with Official Only calls `/v2/whatsapp/integrations/official` (S6 AC 12)
Proof: run unit | ✔ C67:

### S7 - reports, analytics and campaigns

**C68** - `report.getAll` calls `GET /v4/reports` with `start_date`, `end_date` and `type=operators` by default (S7 AC 1)
Proof: run unit | ✔ C68:

**C69** - `report.getCampaignReport` with Return All and `pages` 3 calls `page` 1, 2, 3 with `limit` 50 and returns one item per doc (S7 AC 2)
Proof: run unit | ✔ C69:

**C70** - `analytics.getAttendanceSummary` calls `/v1/analytics/attendances/summary` with `start_date`, `end_date`, `timezone` (S7 AC 3)
Proof: run unit | ✔ C70:

**C71** - `getRetention`, `getReviewsAverage`, `getContactsOrigin` call their three routes and return one item (S7 AC 4)
Proof: run unit | ✔ C71:

**C72** - `department_ids` and `employee_ids` go comma separated (S7 AC 5)
Proof: run unit | ✔ C72:

**C73** - `campaign.getAll` with Return All follows `has_more` true, true, false over `page` 1, 2, 3 with `limit` 100 (S7 AC 6)
Proof: run unit | ✔ C73:

**C74** - `campaign.get` calls `GET /v1/campaigns/cp1` (S7 AC 7)
Proof: run unit | ✔ C74:

### S8 - guided fields and n8n error format

**C75** - contact, template, flow, employee, campaign and custom field parameters are resource locators with `list` (default, searchable) and `id`, plus `phone` where the route needs `_id` (S8 AC 1)
Proof: run unit | ✔ C75:

**C76** - the contact `listSearch` calls `GET /v2/customers` with `page`, `limit` 100, filters `ana` ignoring case and accents, and returns a `paginationToken` (S8 AC 2)
Proof: run unit | ✔ C76:

**C77** - the template `listSearch` filters titles containing `boas` (S8 AC 3)
Proof: run unit | ✔ C77:

**C78** - the Integration options come from `GET /v2/whatsapp/integrations/official` as `label` / `key` (S8 AC 4)
Proof: run unit | ✔ C78:

**C79** - the Workflow Stage options list only the stages of the chosen workflow (S8 AC 5)
Proof: run unit | ✔ C79:

**C80** - the Departments options merge `departments` of the first 50 employees without repeated `key` (S8 AC 6)
Proof: run unit | ✔ C80:

**C81** - By Phone with a `404` throws `No contact found for the phone in the 'Contact' parameter [item 0]` (S8 AC 7)
Proof: run unit | ✔ C81:

**C82** - a `422` becomes a `NodeApiError` with the API message and one `field: message` line per error (S8 AC 8)
Proof: run unit | ✔ C82:

**C83** - with Continue On Fail a `4xx` on item 1 of 3 returns `{ error }` and item 2 still runs (S8 AC 9)
Proof: run unit | ✔ C83:

**C84** - labels are Title Case, descriptions start capitalised, boolean descriptions start `Whether`, placeholders start `e.g.` (S8 AC 10)
Proof: run unit | ✔ C84:

**C85** - phone fields carry the international-format hint and paginated `getAll` has Return All and Limit with minimum 1 (S8 AC 11)
Proof: run unit | ✔ C85:

**C86** - the node is `usableAsTool` with one `main` input and output, an operation + resource subtitle, and exposes exactly the 13 resource values and 42 operation values of the plan (S8 AC 12)
Proof: run unit | ✔ C86:

### S9 - documentation and release

**C87** - the README is in Brazilian Portuguese with the eight required sections (S9 AC 1)
Proof: run unit | ✔ C87:

**C88** - the README lists the 42 operations and the deprecated routes left out (S9 AC 2)
Proof: run unit | ✔ C88:

**C89** - `CHANGELOG.md` has `## 1.0.0` listing node, credential, decrypted history and no trigger (S9 AC 3)
Proof: run unit | ✔ C89:

**C90** - every source file opens with a Portuguese header comment (S9 AC 4)
Proof: run unit | ✔ C90:

**C91** - after the owner tags `v1.0.0`, `npm view n8n-nodes-rd-station-conversas version` returns 1.0.0 (blocked by owner decision AD-013: no tag before the real-account test) (S9 AC 5)
Proof: walk - owner tags v1.0.0 after testing with a real account; then run `npm view n8n-nodes-rd-station-conversas version`


### S10 - Verifier findings

**C92** - The history Options collection holds no nested displayOptions and Country Code lives in its own template collection (Verifier F1)
Proof: run unit | ✔ C92:

**C93** - Limit 1 asks the API for at least 2 per page and still returns one item (F2)
Proof: run unit | ✔ C93:

**C94** - IDs are URL-encoded before they enter a route (F3)
Proof: run unit | ✔ C94:

**C95** - A phone with letters or an extension is refused (F4)
Proof: run unit | ✔ C95:

**C96** - Create and Update refuse an empty name or integration (F5)
Proof: run unit | ✔ C96:

**C97** - A CPF without 11 digits is refused (F6)
Proof: run unit | ✔ C97:

**C98** - Update and Update by Phone each show only their own extra fields (F7)
Proof: run unit | ✔ C98:

**C99** - An invalid Address JSON is refused with the guided message (F8)
Proof: run unit | ✔ C99:

**C100** - Analytics drops empty id lists and refuses an empty date (F9)
Proof: run unit | ✔ C100:

**C101** - A tampered or truncated JWE is refused for GCM and CBC (F10)
Proof: run unit | ✔ C101:

**C102** - The credential test request carries timeout 30000 (F11)
Proof: run unit | ✔ C102:

**C103** - An operation named like an object property is not available (F12)
Proof: run unit | ✔ C103:

**C104** - History asks for pages of 100 whatever the Limit and returns at most Limit (F13)
Proof: run unit | ✔ C104:

**C105** - Bulk operations refuse an empty list before any request (F14)
Proof: run unit | ✔ C105:

**C106** - Send refuses a message with no text and no attachment (F23)
Proof: run unit | ✔ C106:

**C107** - A plain-string job id is kept as `{ id }` and a non-string wallet does not crash (Verifier F15)
Proof: run unit | ✔ C107:

**C108** - Reset All Contacts Flow posts once per execution with three input items (F22)
Proof: run unit | ✔ C108:

**C109** - All 42 operations use their documented HTTP method and route (F17)
Proof: run unit | ✔ C109:

### S11 - the-judge findings

**C110** - A JWE text encrypted as UTF-8 decrypts with its accents (the-judge)
Proof: run unit | ✔ C110:

**C111** - A JWE text encrypted as latin1 (node-jose string path) decrypts with its accents (the-judge)
Proof: run unit | ✔ C111:

**C112** - report getAll with Return All walks two pages by page and limit (the-judge)
Proof: run unit | ✔ C112:

**C113** - report getAll offers Return All and Limit and stops at the Limit (the-judge)
Proof: run unit | ✔ C113:

**C114** - send refuses an empty message in phone mode with zero requests (the-judge)
Proof: run unit | ✔ C114:

**C115** - No URL of any operation or dynamic list carries a raw / or ? taken from an ID (the-judge)
Proof: run unit | ✔ C115:

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| resource values (13) | C86, table-driven over all 13 | - |
| operation values (42) | C86, table-driven over all 42 | - |
| operations sending `timeout` 30000 (42) | C8, table-driven over all 42 | - |
| credential fields (2) | `apiToken` C9 · `privateKeyJwk` C9 | - |
| output shapes (3) | list one item per record C18 · `{ deleted: true }` C27 · decrypted message per item C36 | - |
| `enc` values of the JWE (6) | A128GCM C38 · A192GCM C38 · A256GCM C37 · A128CBC-HS256 C38 · A192CBC-HS384 C38 · A256CBC-HS512 C38 | - |
| node execute statuses (3) | 200 C15 · 4xx/5xx as `NodeApiError` C82 · 403 on history C42 | - |
| listSearch / loadOptions statuses (2) | 200 C76 · 401 as `NodeApiError` C82 | - |
| credential test statuses (3) | 200 C11 · 401 C12 · 403 C12 | - |
| `$all` key checks (126) | C46, table-driven over all 126 (42 operations x 3 inputs) | - |
| phone validation examples (4) | `5511999998888` C17 · `11999` C17 · `+55 11 99999-8888` C17 · empty C17 | - |
| bulk delete tag examples (3) | empty C45 · blank C45 · `$all` C45 | - |
| resource locator parameters (6) | contact C75 · template C75 · flow C75 · employee C75 · campaign C75 · custom field C75 | - |
| startup config: strict lint and build (2 commands) | `npm run lint` C2 · `npm run build` C1 | - |

## Swept

- validation: C17, C21, C30, C45
- failure modes: C35, C42, C81, C82
- idempotency: n/a - the node keeps no state; retries are the caller's choice
- authorization: C12, C42
- concurrency: n/a - items run one after another inside one execution
- data lifecycle: C27, C66 (deletes return `{ deleted: true }`), C43 (bulk delete bounded by tag)
- dependency failure: C82, C83
- state transitions: n/a - the node has no state machine
- observability: n/a - no logging requirement; errors carry the API message

## Handoff

- **Settled mid-build:** (1) The restart operation needs `Confirm Restart` (`confirmRestart`, boolean, default false); without it the operation fails before any request (owner, 06/11/2026, AD-013). (2) Tag `v1.0.0` only after the owner tests with a real account (JWE format of the history, message sending): version 1.0.0, CHANGELOG and ready workflows now, no tag; README explains `npm run dev` and the JWK key (owner, 06/11/2026, AD-014).
- **Dispatched:** Verifier round 1 at f385b77 (fresh sonnet sub-agent), sent after check_proofs 93 pass
- **Boundary:** C1-C90 closed at f385b77; C91 stays open by owner decision AD-014
- **Abandoned:** C91 (npm view after the tag) stays open by AD-014; F18 wire formats wait for the real-account test
- **Walked:** C91 is a walk: after the owner tags v1.0.0 the npm check runs; it stays open by owner decision.
