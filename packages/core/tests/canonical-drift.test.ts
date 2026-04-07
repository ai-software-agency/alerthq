import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { META, CLI_COMMANDS, generateHelpText, generateLlmHelp } from '../src/canonical/index.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const README = readFileSync(resolve(ROOT, 'README.md'), 'utf-8');
const rootPkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));
const cliPkg = JSON.parse(readFileSync(resolve(ROOT, 'packages/cli/package.json'), 'utf-8'));

describe('canonical drift detection', () => {
  describe('generateHelpText → canonical', () => {
    const helpText = generateHelpText();

    it('references all CLI command names', () => {
      for (const cmd of CLI_COMMANDS) {
        expect(helpText).toContain(cmd.name);
      }
    });

    it('references all CLI command descriptions', () => {
      for (const cmd of CLI_COMMANDS) {
        expect(helpText).toContain(cmd.description);
      }
    });

    it('includes project name', () => {
      expect(helpText).toContain(META.name);
    });
  });

  describe('generateLlmHelp → canonical', () => {
    const llmHelp = generateLlmHelp();
    const commands = llmHelp.commands as Array<{ name: string; description: string }>;

    it('includes all CLI commands', () => {
      const names = commands.map((c) => c.name);
      for (const cmd of CLI_COMMANDS) {
        expect(names).toContain(cmd.name);
      }
    });

    it('includes all storage backends', () => {
      const backends = llmHelp.storageBackends as Array<{ name: string }>;
      for (const s of META.storageBackends) {
        expect(backends.find((b) => b.name === s.name)).toBeTruthy();
      }
    });

    it('includes all providers', () => {
      const providers = llmHelp.providers as Array<{ name: string }>;
      for (const p of META.providers) {
        expect(providers.find((pr) => pr.name === p.name)).toBeTruthy();
      }
    });

    it('uses canonical description', () => {
      expect(llmHelp.description).toBe(META.description);
    });

    it('uses canonical readOnly notice', () => {
      expect(llmHelp.readOnly).toBe(META.readOnly);
    });
  });

  describe('README → canonical', () => {
    it('references all CLI command names', () => {
      for (const cmd of CLI_COMMANDS) {
        expect(README).toContain(cmd.name);
      }
    });

    it('references all packages', () => {
      for (const pkg of META.packages) {
        expect(README).toContain(pkg.name);
      }
    });
  });

  describe('package.json → canonical', () => {
    it('CLI package description matches canonical npmDescription', () => {
      expect(cliPkg.description).toBe(META.npmDescription);
    });
  });

  describe('CLI_COMMANDS completeness', () => {
    it('every command has a description', () => {
      for (const cmd of CLI_COMMANDS) {
        expect(cmd.description.length).toBeGreaterThan(0);
      }
    });

    it('every command has at least one example', () => {
      for (const cmd of CLI_COMMANDS) {
        expect(cmd.examples?.length).toBeGreaterThan(0);
      }
    });

    it('command names are unique', () => {
      const names = CLI_COMMANDS.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });
});
