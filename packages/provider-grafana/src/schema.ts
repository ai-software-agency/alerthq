import { z } from 'zod';

export const grafanaConfigSchema = z.object({
  url: z.string({ required_error: '[grafana] config.url is required' }).url('[grafana] url must be a valid URL'),
  apiKey: z.string().optional(),
  basicAuth: z
    .object({
      username: z.string({ required_error: '[grafana] basicAuth.username is required' }),
      password: z.string({ required_error: '[grafana] basicAuth.password is required' }),
    })
    .optional(),
});
