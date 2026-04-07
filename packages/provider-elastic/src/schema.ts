import { z } from 'zod';

const basicAuth = z.object({
  type: z.literal('basic'),
  username: z.string({ required_error: '[elastic] basic auth requires username' }),
  password: z.string({ required_error: '[elastic] basic auth requires password' }),
});

const apiKeyAuth = z.object({
  type: z.literal('apiKey'),
  apiKey: z.string({ required_error: '[elastic] apiKey auth requires apiKey' }),
});

export const elasticConfigSchema = z.object({
  url: z.string({ required_error: '[elastic] config.url is required' }),
  kibanaUrl: z.string().optional(),
  auth: z.discriminatedUnion('type', [basicAuth, apiKeyAuth], {
    errorMap: () => ({ message: '[elastic] config.auth.type must be "basic" or "apiKey"' }),
  }),
  watcherPageSize: z.number().optional(),
  kibanaPageSize: z.number().optional(),
});
