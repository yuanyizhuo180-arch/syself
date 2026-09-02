import { z } from 'zod';

export const GoalWorkNodeStatusSchema = z.enum(['suggested', 'active', 'completed', 'paused', 'carried_forward', 'archived']);
export const GoalWorkNodeTypeSchema = z.enum(['month', 'week']);
export const GoalWorkNodeSourceSchema = z.enum(['ai_suggestion', 'manual', 'replan']);

export const GoalWorkNodeInputSchema = z.object({
  goalId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  branchId: z.string().min(1),
  nodeType: GoalWorkNodeTypeSchema,
  title: z.string().trim().min(1),
  successCriteria: z.string().trim().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: GoalWorkNodeSourceSchema,
});

export type GoalWorkNodeInput = z.infer<typeof GoalWorkNodeInputSchema>;
