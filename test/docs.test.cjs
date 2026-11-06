/**
 * Testes da fatia S9: README, CHANGELOG e comentários em português.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { describe, it } = require('node:test');

const { RdStationConversas } = require('./helpers.cjs');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('S9 documentation', () => {
	it('C87: the README is in Portuguese and has the nine required sections', () => {
		const readme = read('README.md');
		for (const title of [
			'Instalação',
			'Credencial',
			'Recursos e operações',
			'Chave de criptografia do histórico',
			'Operações irreversíveis',
			'Planos (Pro e Advanced)',
			'Limites',
			'Licença',
		]) {
			assert.match(readme, new RegExp(`^## .*${title.replace(/[()]/g, '\\$&')}`, 'm'), title);
		}
		assert.match(readme, /npm run dev/);
		assert.match(readme, /Gerar Chave/);
	});

	it('C88: the README lists the 42 operations and the deprecated routes left out', () => {
		const readme = read('README.md');
		const node = new RdStationConversas();
		const resources = node.description.properties.find((p) => p.name === 'resource').options;
		let listed = 0;
		for (const resource of resources) {
			const property = node.description.properties.find(
				(p) => p.name === 'operation' && p.displayOptions.show.resource[0] === resource.value,
			);
			for (const option of property.options) {
				assert.ok(
					readme.includes(`${resource.name}: ${option.name}`),
					`${resource.name}: ${option.name}`,
				);
				listed += 1;
			}
		}
		assert.equal(listed, 42);
		for (const route of [
			'POST /v2/contacts',
			'/v2/contacts/whatsapp-business',
			'send-template-filled',
			'/api/v3/message/template/send',
		]) {
			assert.ok(readme.includes(route), route);
		}
	});

	it('C89: CHANGELOG.md has the 1.0.0 section with node, credential, history and no trigger', () => {
		const changelog = read('CHANGELOG.md');
		assert.match(changelog, /^## 1\.0\.0/m);
		for (const word of [/node/i, /credencial/i, /histórico/i, /gatilho/i]) {
			assert.match(changelog, word);
		}
	});

	it('C90: every source file opens with a Portuguese header comment', () => {
		const files = [];
		const collect = (dir) => {
			for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
				const relative = path.join(dir, entry.name);
				if (entry.isDirectory()) collect(relative);
				else if (relative.endsWith('.ts')) files.push(relative);
			}
		};
		collect('nodes');
		collect('credentials');
		assert.ok(files.length >= 20);
		for (const file of files) {
			const head = read(file).slice(0, 600);
			assert.match(head, /^\/\*\*/, `${file} has no header comment`);
			assert.match(head, /[ãõçéíóúâê]|\b(de|do|da|que|para)\b/, `${file} header is not Portuguese`);
		}
	});
});
