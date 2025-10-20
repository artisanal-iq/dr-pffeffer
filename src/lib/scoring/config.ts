import { z } from "zod";

export const powerScoreConfigSchema = z
  .object({
    weights: z
      .object({
        tasks: z.number().min(0),
        powerPractice: z.number().min(0),
        journaling: z.number().min(0),
        consistency: z.number().min(0),
      })
      .refine(
        (weights) => {
          const total = weights.tasks + weights.powerPractice + weights.journaling + weights.consistency;
          return total > 0 && total <= 100;
        },
        {
          message: "Weights must sum to a positive value not exceeding 100",
        }
      ),
    maximums: z.object({
      tasksCompleted: z.number().positive(),
      powerPracticeRating: z.number().positive(),
      journalWordCount: z.number().positive(),
      consistencyStreak: z.number().positive(),
    }),
    journaling: z.object({
      minimumWordCount: z.number().int().min(0),
    }),
    output: z.object({
      decimals: z.number().int().min(0).max(4).default(1),
    }),
  })
  .transform((config) => ({
    ...config,
    output: {
      ...config.output,
      decimals: config.output.decimals ?? 1,
    },
  }));

export type PowerScoreConfig = z.infer<typeof powerScoreConfigSchema>;

export const defaultPowerScoreConfig: PowerScoreConfig = powerScoreConfigSchema.parse({
  weights: {
    tasks: 45,
    powerPractice: 25,
    journaling: 20,
    consistency: 10,
  },
  maximums: {
    tasksCompleted: 8,
    powerPracticeRating: 5,
    journalWordCount: 250,
    consistencyStreak: 14,
  },
  journaling: {
    minimumWordCount: 40,
  },
  output: {
    decimals: 1,
  },
});
