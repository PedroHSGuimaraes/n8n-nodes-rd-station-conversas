# RD Station Conversas v1 verification

**Verdict**: FAIL
**Proofs**: `proofs.md` at 4aea005
**Verifier**: independent sub-agent (author != verifier)

The Verifier judged C1 to C91 and reported F1 to F23. C92 to C106 are the builder's new checks for the findings; the Verifier did not judge them, and the gate has no second Verifier round.

## Checks

| Check | Test | Holds |
| --- | --- | --- |
| C1 | command `npm run build && test -f dist/...` (build, then dist files) | yes |
| C2 | command `npm run lint` | yes |
| C3 | `foundation.test.cjs` `C3: package.json has the fixed identity, scripts, strict mode and no runtime dependencies` | yes |
| C4 | command `npm test` with `# fail 0` | yes |
| C5 | `foundation.test.cjs` `C5: ci.yml runs install, lint, test and build on pull requests` | no - substring match on ci.yml: a commented step keeps it green (F16) |
| C6 | `foundation.test.cjs` `C6: publish.yml accepts tag v1.0.0 and publishes with provenance` | yes |
| C7 | `foundation.test.cjs` `C7: publish.yml refuses tag v1.0.1 while package.json says 1.0.0` | yes |
| C8 | `sweep.test.cjs` `C8: every request of all 42 operations has the fixed base, the credential and timeout 30000` | yes |
| C9 | `foundation.test.cjs` `C9: apiToken and privateKeyJwk are password fields and the key is optional` | yes |
| C10 | `foundation.test.cjs` `C10: requests carry the Bearer token and the credential has no base URL field` | yes |
| C11 | `foundation.test.cjs` `C11: the credential test calls GET /v2/employees on the fixed HTTPS base` | yes |
| C12 | `foundation.test.cjs` `C12: the credential test does not hide 401 or 403 answers` | yes |
| C13 | `foundation.test.cjs` `C13: documentation link and token hint point to Apps and Integrations, API` | yes |
| C14 | `foundation.test.cjs` `C14: the key hint says it is only for message history and names Generate Key` | yes |
| C15 | `contacts.test.cjs` `C15: getByPhone normalises the phone and defaults the channel to whatsapp` | yes |
| C16 | `contacts.test.cjs` `C16: getByCpf keeps only the digits of the CPF` | yes |
| C17 | `contacts.test.cjs` `C17: an invalid phone is refused before any request` | no - bounds 8 and 15 were not probed and letters were dropped, not refused (F4); now probes 7, 8, 15, 16 and letters in C17 and C95 |
| C18 | `contacts.test.cjs` `C18: getAll with Return All walks pages of 100, 100 and 37 and returns 237 items` | yes |
| C19 | `contacts.test.cjs` `C19: getAll with Limit 150 stops after 150 items` | yes |
| C20 | `contacts.test.cjs` `C20: create posts the required fields and only the filled additional fields` | yes |
| C21 | `contacts.test.cjs` `C21: a workflow stage without a workflow is refused` | yes |
| C22 | `contacts.test.cjs` `C22: update puts phone, name and integration to the broker route` | yes |
| C23 | `contacts.test.cjs` `C23: updateByPhone patches the phone route and returns customerId` | yes |
| C24 | `contacts.test.cjs` `C24: createMany posts three contacts and returns the job` | yes |
| C25 | `contacts.test.cjs` `C25: create posts label and info` | yes |
| C26 | `contacts.test.cjs` `C26: update sends only info and the screen has no label field for it` | yes |
| C27 | `contacts.test.cjs` `C27: delete with an empty 204 answer returns deleted true` | yes |
| C28 | `contacts.test.cjs` `C28: getAll sends page, limit and label and stops at the total` | yes |
| C29 | `messages.test.cjs` `C29: send by phone resolves the contact then posts urlencoded text` | yes |
| C30 | `messages.test.cjs` `C30: sending as operator without an employee is refused before any request` | yes |
| C31 | `messages.test.cjs` `C31: a binary in attach turns the body into multipart` | yes |
| C32 | `messages.test.cjs` `C32: sendTemplate posts recipient, template, variables and defaults` | yes |
| C33 | `messages.test.cjs` `C33: operator without an employee is refused with the guided description` | yes |
| C34 | `messages.test.cjs` `C34: the 201 answer returns data and message and the description warns about delivery` | yes |
| C35 | `messages.test.cjs` `C35: a 404 with code 301 names the phone` | yes |
| C36 | `messages.test.cjs` `C36: getHistory asks the route, decrypts messages and returns one item each` | no - green only because the test set limit 100 (F13); C104 now pins limit 100 for Limit 50 |
| C37 | `messages.test.cjs` `C37: RSA-OAEP-256 with A256GCM decrypts a message made in the test` | yes |
| C38 | `messages.test.cjs` `C38: all six enc values decrypt and an unknown enc fails like C40` | yes |
| C39 | `messages.test.cjs` `C39: history without the private key is refused before any request` | yes |
| C40 | `messages.test.cjs` `C40: a message encrypted for another account fails with the enc in the description` | no - covered the wrong-key case only; tamper tests added in C101 (F10) |
| C41 | `messages.test.cjs` `C41: dates go as YYYY-MM-DD and filters are arrays with the documented defaults` | yes |
| C42 | `messages.test.cjs` `C42: a 403 on history explains the plan requirement` | yes |
| C43 | `operations.test.cjs` `C43: deleteManyByTag sends exactly tag_name and returns contacts_count` | yes |
| C44 | `operations.test.cjs` `C44: deleteManyByIntegration sends exactly integration` | yes |
| C45 | `operations.test.cjs` `C45: an empty or blank tag is refused and $all travels only as a tag value` | yes |
| C46 | `operations.test.cjs` `C46: no operation ever sends a $all key, whatever the inputs are` | yes |
| C47 | `operations.test.cjs` `C47: the contact operations have no delete-all operation or Delete All field` | yes |
| C48 | `operations.test.cjs` `C48: both delete-many descriptions start with the permanent-deletion warning` | yes |
| C49 | `operations.test.cjs` `C49: resetAllContactsFlow confirmed posts without a body and returns message` | yes |
| C50 | `operations.test.cjs` `C50: resetAllContactsFlow without confirmation fails before any request` | yes |
| C51 | `operations.test.cjs` `C51: the reset description warns that the scope is not documented` | yes |
| C52 | `operations.test.cjs` `C52: wallet removeAllContacts posts wallet_name and returns quantityModified` | yes |
| C53 | `operations.test.cjs` `C53: deactivateMany patches employees_ids` | yes |
| C54 | `operations.test.cjs` `C54: a 207 answer becomes one item per employee with the four fields` | yes |
| C55 | `operations.test.cjs` `C55: employee createMany posts email, name and role of each and returns the job` | yes |
| C56 | `operations.test.cjs` `C56: employee getAll returns id, name and email per employee` | yes |
| C57 | `operations.test.cjs` `C57: employee get uses the v1 route` | yes |
| C58 | `operations.test.cjs` `C58: activate and deactivate put to their own routes` | yes |
| C59 | `operations.test.cjs` `C59: flow getAll returns id and title per flow` | yes |
| C60 | `operations.test.cjs` `C60: forwardContact posts customer and flow` | yes |
| C61 | `operations.test.cjs` `C61: crmWorkflow getAll returns title and stages` | yes |
| C62 | `operations.test.cjs` `C62: job get returns the job fields` | yes |
| C63 | `operations.test.cjs` `C63: template getAll returns one item per template` | yes |
| C64 | `operations.test.cjs` `C64: wallet getAll returns a name item per wallet` | yes |
| C65 | `operations.test.cjs` `C65: addContact posts customer and wallet` | yes |
| C66 | `operations.test.cjs` `C66: removeContact patches the contact route and returns deleted true on 204` | yes |
| C67 | `operations.test.cjs` `C67: whatsappIntegration getAll switches to the official route` | yes |
| C68 | `operations.test.cjs` `C68: report getAll sends the dates and defaults the type to operators` | yes |
| C69 | `operations.test.cjs` `C69: getCampaignReport walks pages 1, 2 and 3 with limit 50` | yes |
| C70 | `operations.test.cjs` `C70: getAttendanceSummary sends ISO dates and the timezone` | yes |
| C71 | `operations.test.cjs` `C71: retention, reviews average and contacts origin call their own routes` | yes |
| C72 | `operations.test.cjs` `C72: department and employee ids go comma separated` | no - only non-empty lists; empty lists now covered by C100 (F9) |
| C73 | `operations.test.cjs` `C73: campaign getAll follows has_more over pages 1, 2 and 3` | yes |
| C74 | `operations.test.cjs` `C74: campaign get returns the campaign details` | yes |
| C75 | `guided.test.cjs` `C75: ID fields are resource locators with list (default, searchable) and id modes` | yes |
| C76 | `guided.test.cjs` `C76: the contact search filters by name ignoring case and accents and pages on` | yes |
| C77 | `guided.test.cjs` `C77: the template search keeps only titles that contain the text` | yes |
| C78 | `guided.test.cjs` `C78: Integration options come from the official integrations route` | yes |
| C79 | `guided.test.cjs` `C79: Workflow Stage options list only the stages of the chosen workflow` | yes |
| C80 | `guided.test.cjs` `C80: Departments merge the first 50 employees without repeated keys` | yes |
| C81 | `guided.test.cjs` `C81: By Phone with a 404 explains how to continue` | yes |
| C82 | `guided.test.cjs` `C82: a 422 keeps the API message and lists one field per line` | yes |
| C83 | `guided.test.cjs` `C83: Continue On Fail returns the error of item 1 and still runs item 2` | yes |
| C84 | `guided.test.cjs` `C84: labels are Title Case, descriptions are sentences, booleans start with Whether` | yes |
| C85 | `guided.test.cjs` `C85: phone fields carry the hint and paginated lists have Return All and Limit >= 1` | yes |
| C86 | `guided.test.cjs` `C86: tool use, connections, subtitle and the exact resources and operations` | yes |
| C87 | `docs.test.cjs` `C87: the README is in Portuguese and has the eight required sections` | no - asserted eight headings against a claim that said nine; claim corrected to eight (F16) |
| C88 | `docs.test.cjs` `C88: the README lists the 42 operations and the deprecated routes left out` | no - two deprecated routes are substrings of covered routes; the deprecated-routes line is now asserted (F16) |
| C89 | `docs.test.cjs` `C89: CHANGELOG.md has the 1.0.0 section with node, credential, history and no trigger` | yes |
| C90 | `docs.test.cjs` `C90: every source file opens with a Portuguese header comment` | no - language regex accepts the English word do and per-function comments are not counted (F20) |
| C91 | walk - owner tags v1.0.0, then `npm view n8n-nodes-rd-station-conversas version` | no - blocked by owner decision AD-014: no v1.0.0 tag, npm view returns E404 (F21) |
| C92 | `hardening.test.cjs` `C92: the history Options collection has no displayOptions inside it and Country Code lives in its own collection` | yes |
| C93 | `hardening.test.cjs` `C93: Limit 1 asks the API for at least 2 per page and still returns one item` | yes |
| C94 | `hardening.test.cjs` `C94: IDs are URL-encoded before they enter a route` | yes |
| C95 | `hardening.test.cjs` `C95: a phone with letters or an extension is refused` | yes |
| C96 | `hardening.test.cjs` `C96: create and update refuse an empty name or integration` | yes |
| C97 | `hardening.test.cjs` `C97: a CPF without 11 digits is refused` | yes |
| C98 | `hardening.test.cjs` `C98: Update and Update by Phone show only their own extra fields` | yes |
| C99 | `hardening.test.cjs` `C99: an invalid Address JSON is refused with the guided message` | yes |
| C100 | `hardening.test.cjs` `C100: analytics drops empty id lists and refuses an empty date` | yes |
| C101 | `hardening.test.cjs` `C101: a tampered or truncated JWE is refused for GCM and CBC` | yes |
| C102 | `hardening.test.cjs` `C102: the credential test carries timeout 30000` | yes |
| C103 | `hardening.test.cjs` `C103: an operation named like an object property is not available` | yes |
| C104 | `hardening.test.cjs` `C104: history asks for pages of 100 whatever the Limit and returns at most Limit` | yes |
| C105 | `hardening.test.cjs` `C105: bulk operations refuse an empty list before any request` | yes |
| C106 | `hardening.test.cjs` `C106: send refuses a message with no text and no attachment` | yes |
| C107 | `hardening.test.cjs` `C107` | yes |
| C108 | `hardening.test.cjs` `C108` | yes |
| C109 | `hardening.test.cjs` `C109` | yes |

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| F1 | Options collection of Message hides Channels and mixes operations: `resources/message.ts:160` nests `displayOptions` inside a collection; `getPropertyValues` never shows it. | see the Verifier report | dcf52be - C92 |
| F2 | `Limit` 1 sends `limit=1` to the customer list although the plan assumes the doc needs more than 1 (`contact.ts`, `message.ts`, `campaign.ts`). | see the Verifier report | dcf52be - C93 |
| F3 | IDs enter the URL path unencoded: id `../flows?x=` produced `PUT /v2/employees/../flows?x=/deactivate`. | see the Verifier report | dcf52be - C94 |
| F4 | Phone normaliser drops letters and extensions: `55 11 abc 99999-8888` became `5511999998888`. | see the Verifier report | dcf52be - C95 and C17 |
| F5 | Empty `fullName` and `integration` reach the API on create, update and updateByPhone. | see the Verifier report | dcf52be - C96 |
| F6 | `getByCpf` with an empty or letter-only CPF builds `/v2/contacts/cpf//exists`. | see the Verifier report | dcf52be - C97 |
| F7 | `update` ignores Custom Fields and `updateByPhone` ignores Secondary Phones, yet both fields are shown. | see the Verifier report | dcf52be - C98 |
| F8 | Invalid JSON in Address or Job throws a bare SyntaxError without `[item N]`. | see the Verifier report | dcf52be - C99 |
| F9 | Empty multi-select lists and empty dates reach the API in analytics and reports. | see the Verifier report | dcf52be - C100 |
| F10 | GCM tag length is not enforced (a 4-byte tag decrypted) and no test tampers the JWE. | see the Verifier report | dcf52be - C101 |
| F11 | The credential test request has no `timeout`. | see the Verifier report | dcf52be - C102 |
| F12 | Operation lookup goes through the prototype: `operation: 'toString'` returned `[object Object]`. | see the Verifier report | dcf52be - C103 |
| F13 | With Return All off, the history page size follows Limit instead of the fixed 100; an empty `messages` string fails as undecryptable. | see the Verifier report | dcf52be - C104 |
| F14 | Empty lists go out in `deactivateMany` and both `createMany` operations. | see the Verifier report | dcf52be - C105 |
| F15 | A non-string `wallet` throws TypeError; `createMany` returns `{}` when `job` is a plain string. | see the Verifier report | 15bbb5d - C107 |
| F16 | Tests that pass with a false claim: C5, C17, C36, C40, C72, C87, C88, C90. | see the Verifier report | dcf52be - C17, C87 and C88 tightened; C5, C36, C40, C72 closed by C101, C104, C100 |
| F17 | The HTTP verb is not asserted in about 20 tests whose claim names it. | see the Verifier report | 15bbb5d - C109 |
| F18 | Unproven wire formats: arrays in `qs`, native `FormData`/`URLSearchParams` with `json: true`, `recipient_number` plus `country_code`. | see the Verifier report | 15bbb5d - README Limits lists the three formats for the real-account test (C91, AD-014) |
| F19 | `searchContacts` filters only the 100 contacts of the requested page. | see the Verifier report | 15bbb5d - README Limits documents the one-page filter |
| F20 | 38 functions have no leading comment although S9 AC 4 asks for one per function. | see the Verifier report | 15bbb5d - a comment on every handler and list function |
| F21 | `proofs.md` records C91 as `pass (Walked)` while no tag exists and `npm view` returns E404. | see the Verifier report | 15bbb5d - C91 stays a walk blocked by AD-014; checks.md Abandoned records it |
| F22 | `resetAllContactsFlow` with Confirm Restart on fires once per input item. | see the Verifier report | 15bbb5d - C108 |
| F23 | `message.send` with empty message and no attachment posts an empty message. | see the Verifier report | dcf52be - C106 |
