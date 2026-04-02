import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveEnvVars } from '../src/loader/config-loader.js';

describe('resolveEnvVars', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('replaces a single ${VAR} in a string', () => {
    process.env['MY_VAR'] = 'hello';
    const result = resolveEnvVars('${MY_VAR}', ['field']);
    expect(result).toBe('hello');
  });

  it('replaces multiple ${VAR} references in a single string', () => {
    process.env['HOST'] = 'localhost';
    process.env['PORT'] = '5432';
    const result = resolveEnvVars('${HOST}:${PORT}', ['connection']);
    expect(result).toBe('localhost:5432');
  });

  it('replaces ${VAR} in nested objects', () => {
    process.env['DB_PASS'] = 'secret123';
    const input = {
      database: {
        auth: {
          password: '${DB_PASS}',
        },
      },
    };
    const result = resolveEnvVars(input, []) as Record<string, unknown>;
    const db = result['database'] as Record<string, unknown>;
    const auth = db['auth'] as Record<string, unknown>;
    expect(auth['password']).toBe('secret123');
  });

  it('replaces ${VAR} in arrays', () => {
    process.env['REGION'] = 'us-east-1';
    const result = resolveEnvVars(['${REGION}', 'eu-west-1'], ['regions']);
    expect(result).toEqual(['us-east-1', 'eu-west-1']);
  });

  it('passes through strings without ${} patterns', () => {
    const result = resolveEnvVars('plain text', ['field']);
    expect(result).toBe('plain text');
  });

  it('passes through non-string primitives unchanged', () => {
    expect(resolveEnvVars(42, ['field'])).toBe(42);
    expect(resolveEnvVars(true, ['field'])).toBe(true);
    expect(resolveEnvVars(null, ['field'])).toBe(null);
  });

  it('throws when a referenced env var is not set', () => {
    delete process.env['MISSING_VAR'];
    expect(() => resolveEnvVars('${MISSING_VAR}', ['providers', 'elastic', 'password'])).toThrow(
      'Environment variable MISSING_VAR is not set (referenced in providers.elastic.password)',
    );
  });

  it('throws with correct path for nested missing vars', () => {
    delete process.env['SECRET'];
    const input = {
      outer: {
        inner: '${SECRET}',
      },
    };
    expect(() => resolveEnvVars(input, [])).toThrow(
      'Environment variable SECRET is not set (referenced in outer.inner)',
    );
  });

  it('handles empty string env var values', () => {
    process.env['EMPTY'] = '';
    const result = resolveEnvVars('${EMPTY}', ['field']);
    expect(result).toBe('');
  });
});

describe('loadConfig', () => {
  it('is exported from the module', async () => {
    const mod = await import('../src/loader/config-loader.js');
    expect(typeof mod.loadConfig).toBe('function');
  });
});
