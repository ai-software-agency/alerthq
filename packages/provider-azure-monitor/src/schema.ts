import { z } from 'zod';

export const azureMonitorConfigSchema = z.object({
  subscriptionIds: z.array(z.string()).nonempty({
    message: '[azure-monitor] config.subscriptionIds is required and must be a non-empty array of strings',
  }),
});
