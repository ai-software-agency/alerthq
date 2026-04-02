import { z } from 'zod';

/** Zod schema for a single provider entry in the config. */
const providerConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    package: z.string().optional(),
  })
  .passthrough();

/** Zod schema for the storage section of the config. */
const storageConfigSchema = z
  .object({
    provider: z.string({ required_error: 'storage.provider is required' }),
  })
  .passthrough();

/**
 * Zod schema for the top-level alerthq configuration file.
 *
 * Validates base structure only — plugin-specific fields are passed through
 * and validated inside each plugin's `initialize()` method.
 */
export const alerthqConfigSchema = z.object({
  storage: storageConfigSchema,
  providers: z.record(z.string(), providerConfigSchema).optional().default({}),
});

/** Inferred type from the Zod config schema. */
export type AlerthqConfigSchema = z.infer<typeof alerthqConfigSchema>;
