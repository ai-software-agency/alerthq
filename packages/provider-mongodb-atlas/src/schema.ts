import { z } from 'zod';

export const atlasConfigSchema = z.object({
  publicKey: z.string({
    required_error: '[mongodb-atlas] config.publicKey is required and must be a string',
  }),
  privateKey: z.string({
    required_error: '[mongodb-atlas] config.privateKey is required and must be a string',
  }),
  projectIds: z.array(z.string()).nonempty({
    message:
      '[mongodb-atlas] config.projectIds is required and must be a non-empty array of strings',
  }),
  baseUrl: z.string().optional(),
  pageSize: z.number().optional(),
});
