import { z } from 'zod'

export * from './auth.js'
export * from './access.js'

export const HealthResponse = z.object({
  status: z.literal('ok'),
  service: z.string(),
})

export type HealthResponse = z.infer<typeof HealthResponse>
