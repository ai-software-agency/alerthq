import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { parse as parseYaml } from 'yaml';
import { alerthqConfigSchema } from '../validation/config-schema.js';
import type { AlerthqConfig } from '../types/config.js';

/**
 * Load, parse, and validate an alerthq configuration file.
 *
 * Performs the full startup sequence:
 * 1. Load `.env` via dotenv (if present)
 * 2. Read and parse the YAML config file
 * 3. Resolve `${VAR}` references from `process.env`
 * 4. Validate the resolved config against the Zod schema
 *
 * @param configPath - Path to the YAML config file (default: `./alerthq.config.yml`).
 * @returns Resolved and validated configuration object.
 * @throws If the file cannot be read, env vars are missing, or validation fails.
 */
export async function loadConfig(
  configPath: string = './alerthq.config.yml',
): Promise<AlerthqConfig> {
  dotenv.config();

  const raw = await readFile(configPath, 'utf-8');
  const parsed = parseYaml(raw);

  if (parsed === null || parsed === undefined || typeof parsed !== 'object') {
    throw new Error(`Config file ${configPath} is empty or not a valid YAML object`);
  }

  const resolved = resolveEnvVars(parsed as Record<string, unknown>, []);

  const result = alerthqConfigSchema.safeParse(resolved);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid configuration:\n${issues.join('\n')}`);
  }

  return result.data as AlerthqConfig;
}

/**
 * Recursively walk a config object and replace `${VAR}` patterns with
 * values from `process.env`.
 *
 * @param obj - The config value to process (object, array, or primitive).
 * @param path - Current property path for error messages.
 * @returns The config with all env var references resolved.
 * @throws If a referenced environment variable is not set.
 */
export function resolveEnvVars(obj: unknown, path: string[]): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^}]+)\}/g, (_match, varName: string) => {
      const value = process.env[varName];
      if (value === undefined) {
        throw new Error(
          `Environment variable ${varName} is not set (referenced in ${path.join('.')})`,
        );
      }
      return value;
    });
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => resolveEnvVars(item, [...path, String(index)]));
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = resolveEnvVars(value, [...path, key]);
    }
    return result;
  }

  return obj;
}
