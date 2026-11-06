/**
 * Testes da fatia S1 (pacote, CI) e S2 (credencial).
 * Cada `it` começa com o número do check (C3:, C9:...) porque o `checks.md` aponta
 * para essa linha na saída do runner.
 */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const root = path.join(__dirname, '..');
const pkg = require('../package.json');
const { RdStationConversasApi } = require('../dist/credentials/RdStationConversasApi.credentials');

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('S1 package and CI', () => {
	it('C3: package.json has the fixed identity, scripts, strict mode and no runtime dependencies', () => {
		assert.equal(pkg.name, 'n8n-nodes-rd-station-conversas');
		assert.equal(pkg.version, '1.0.0');
		assert.equal(pkg.scripts.build, 'n8n-node build');
		assert.equal(pkg.scripts.lint, 'n8n-node lint');
		assert.equal(pkg.n8n.strict, true);
		assert.equal(pkg.devDependencies['@n8n/node-cli'], '0.55.5');
		assert.ok(pkg.keywords.includes('n8n-community-node-package'));
		assert.equal('dependencies' in pkg, false);
	});

	it('C5: ci.yml runs install, lint, test and build on pull requests', () => {
		const ci = read('.github/workflows/ci.yml');
		assert.match(ci, /pull_request/);
		for (const step of ['npm ci', 'npm run lint', 'npm test', 'npm run build']) {
			assert.ok(ci.includes(step), `ci.yml misses ${step}`);
		}
	});

	// Extrai do publish.yml o script do passo de validação da tag e o roda com a tag dada.
	function validateTag(tag) {
		const publish = read('.github/workflows/publish.yml');
		const match = publish.match(/Validate release tag\n\s+run: \|\n((?:\s{10}.*\n?)+)/);
		assert.ok(match, 'publish.yml has no tag validation step');
		execFileSync('bash', ['-c', match[1]], {
			cwd: root,
			env: { ...process.env, GITHUB_REF_NAME: tag },
			stdio: 'pipe',
		});
	}

	it('C6: publish.yml accepts tag v1.0.0 and publishes with provenance', () => {
		validateTag('v1.0.0');
		assert.match(read('.github/workflows/publish.yml'), /id-token: write/);
		assert.equal(pkg.publishConfig.provenance, true);
	});

	it('C7: publish.yml refuses tag v1.0.1 while package.json says 1.0.0', () => {
		assert.throws(() => validateTag('v1.0.1'));
	});

	// Token do npm "Read and write (stage only)" (06/11/2026): com ele `npm publish` e `npm run release`
	// falham com E_STAGE_REQUIRED. A versão precisa ir para a fila do `npm stage publish`, que só existe
	// no npm 12 (o Node LTS do runner traz o npm 11). O dono aprova a versão na aba Staged Packages.
	// O teste lê o texto do yml, sem parser YAML, e falha se o workflow voltar a publicar direto.
	it('C119: publish.yml stages the package with npm 12 instead of publishing it', () => {
		const publish = read('.github/workflows/publish.yml');
		// Só conta passo `run:` de verdade; comentário que cita o comando não vale.
		const runs = publish.split('\n').filter((line) => /^\s*(-\s+)?run:/.test(line));
		assert.ok(
			runs.some((l) => l.includes('npm@12.2.2 stage publish') && l.includes('--provenance')),
			'publish.yml must run "npx -y npm@12.2.2 stage publish --provenance"',
		);
		assert.equal(runs.some((l) => /\bnpm publish\b/.test(l)), false, 'no "npm publish" step');
		assert.equal(runs.some((l) => /\bnpm run release\b/.test(l)), false, 'no "npm run release" step');
		// `prepublishOnly` roda `n8n-node prerelease`, que sai com código 1 sem RELEASE_MODE.
		const lines = publish.split('\n');
		const at = lines.findIndex((l) => /^\s*(-\s+)?run:.*stage publish/.test(l));
		assert.notEqual(at, -1, 'stage publish step not found');
		const rest = lines.slice(at + 1);
		const end = rest.findIndex((l) => /^\s*-\s+(name|uses):/.test(l));
		const block = (end === -1 ? rest : rest.slice(0, end)).join('\n');
		assert.match(block, /RELEASE_MODE:\s*['"]?true['"]?/);
		assert.match(block, /NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.NPM_TOKEN\s*\}\}/);
		// workflow_dispatch deixa o dono republicar sem mover a tag.
		assert.match(publish, /^\s*workflow_dispatch:/m);
		// O lock só é instalável pelo mesmo npm que o gerou; a versão de Node precisa ser igual à do ci.
		const nodeVersion = (text) => text.match(/^\s*node-version:\s*['"]?([^'"\n]+)['"]?\s*$/m)?.[1].trim();
		assert.equal(nodeVersion(publish), nodeVersion(read('.github/workflows/ci.yml')));
	});
});

describe('S2 credential', () => {
	const credential = new RdStationConversasApi();
	const field = (name) => credential.properties.find((property) => property.name === name);

	it('C9: apiToken and privateKeyJwk are password fields and the key is optional', () => {
		assert.equal(field('apiToken')?.typeOptions?.password, true);
		assert.equal(field('privateKeyJwk')?.typeOptions?.password, true);
		assert.equal(field('privateKeyJwk')?.required, false);
	});

	it('C10: requests carry the Bearer token and the credential has no base URL field', () => {
		assert.equal(
			credential.authenticate.properties.headers.Authorization,
			'=Bearer {{$credentials.apiToken}}',
		);
		assert.equal(
			credential.properties.some((property) => /base|url|host/i.test(property.name)),
			false,
		);
	});

	it('C11: the credential test calls GET /v2/employees on the fixed HTTPS base', () => {
		assert.equal(credential.test.request.baseURL, 'https://api.tallos.com.br');
		assert.equal(credential.test.request.url, '/v2/employees');
		assert.ok([undefined, 'GET'].includes(credential.test.request.method));
	});

	it('C12: the credential test does not hide 401 or 403 answers', () => {
		assert.notEqual(credential.test.request.ignoreHttpStatusErrors, true);
		assert.equal('rules' in credential.test, false);
	});

	it('C13: documentation link and token hint point to Apps and Integrations, API', () => {
		assert.match(credential.documentationUrl, /conversas-v2-authentication/);
		assert.match(field('apiToken').description, /Apps and Integrations, API/);
	});

	it('C14: the key hint says it is only for message history and names Generate Key', () => {
		const hint = field('privateKeyJwk').description;
		assert.match(hint, /message history/i);
		assert.match(hint, /Apps and Integrations, API, Generate Key/);
	});
});
