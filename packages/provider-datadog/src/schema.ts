import { z } from 'zod';

export const datadogConfigSchema = z.object({
  apiKey: z.string().min(1, '[datadog] apiKey is required'),
  appKey: z.string().min(1, '[datadog] appKey is required'),
  site: z.string().optional(),
});
