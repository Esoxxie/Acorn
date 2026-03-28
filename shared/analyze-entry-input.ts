import { z } from "zod";
import type { AnalyzeEntryInput } from "./models";

const nullableOptionalString = z.string().optional().nullable();
const nullableOptionalLimitedString = (maxLength: number) => z.string().max(maxLength).optional().nullable();

export const analyzeEntryInputSchema = z
  .object({
    mode: z.enum(["photo", "manual_ai"]),
    imageBase64: z.string().max(5_242_880).optional().nullable(),
    mimeType: nullableOptionalString,
    manualText: nullableOptionalLimitedString(500),
    userContext: nullableOptionalLimitedString(500),
    priorEstimate: z.unknown().optional(),
    refinementAnswers: z.record(z.string(), z.string()).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "photo" && !value.imageBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageBase64"],
        message: "A photo payload is required for photo mode.",
      });
    }

    if (value.mode === "photo" && !value.mimeType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mimeType"],
        message: "A mime type is required for photo mode.",
      });
    }

    if (value.mode === "manual_ai" && !value.manualText && !value.priorEstimate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["manualText"],
        message: "A description is required for manual mode.",
      });
    }
  });

export function normalizeAnalyzeEntryInput(
  input: z.infer<typeof analyzeEntryInputSchema>,
): AnalyzeEntryInput {
  return {
    mode: input.mode,
    imageBase64: input.imageBase64 ?? undefined,
    mimeType: input.mimeType ?? undefined,
    manualText: input.manualText ?? undefined,
    userContext: input.userContext ?? undefined,
    priorEstimate: input.priorEstimate as AnalyzeEntryInput["priorEstimate"],
    refinementAnswers: input.refinementAnswers ?? undefined,
  };
}
