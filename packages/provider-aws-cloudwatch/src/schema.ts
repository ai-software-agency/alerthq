import { z } from 'zod';

export const cloudwatchConfigSchema = z.object({
  regions: z.array(z.string()).nonempty({
    message: '[aws-cloudwatch] config.regions is required and must be a non-empty array of strings',
  }),
  credentials: z
    .object({
      accessKeyId: z.string(),
      secretAccessKey: z.string(),
      sessionToken: z.string().optional(),
    })
    .optional(),
});
