import { z } from 'zod';

export const gcpMonitoringConfigSchema = z.object({
  projectId: z.string().min(1, '[gcp-monitoring] projectId is required'),
  keyFilename: z.string().optional(),
  credentials: z
    .object({
      client_email: z.string(),
      private_key: z.string(),
    })
    .optional(),
});
