import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { z } from "zod";
import type { AnalyzeEntryInput } from "../../shared/models";
import { runGeminiMealAnalysis } from "./gemini";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const GEMINI_MODEL = defineString("GEMINI_MODEL", { default: "gemini-2.5-flash" });
const MAX_DAILY_AI_CALLS = defineString("MAX_DAILY_AI_CALLS", { default: "30" });

const inputSchema = z
  .object({
    mode: z.enum(["photo", "manual_ai"]),
    imageBase64: z.string().optional(),
    mimeType: z.string().optional(),
    manualText: z.string().max(500).optional(),
    userContext: z.string().max(500).optional(),
    priorEstimate: z.unknown().optional(),
    refinementAnswers: z.record(z.string(), z.string()).optional(),
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

async function consumeDailyUsage(uid: string, limit: number) {
  const dayKey = new Date().toISOString().slice(0, 10);
  const usageRef = db.doc(`users/${uid}/usage/${dayKey}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const existingCount = Number(snapshot.data()?.analyzeCalls ?? 0);

    if (existingCount >= limit) {
      throw new HttpsError(
        "resource-exhausted",
        `Daily analysis limit reached. Try again tomorrow or raise MAX_DAILY_AI_CALLS.`,
      );
    }

    const now = new Date().toISOString();
    transaction.set(
      usageRef,
      {
        analyzeCalls: existingCount + 1,
        createdAt: snapshot.data()?.createdAt ?? now,
        updatedAt: now,
      },
      { merge: true },
    );
  });
}

export const analyzeEntry = onCall(
  {
    region: "europe-west3",
    timeoutSeconds: 60,
    memory: "512MiB",
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in before requesting an estimate.");
    }

    const parsedInput = inputSchema.safeParse(request.data);
    if (!parsedInput.success) {
      throw new HttpsError("invalid-argument", parsedInput.error.issues[0]?.message ?? "Invalid input.");
    }

    const apiKey = GEMINI_API_KEY.value() || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "Gemini API key is not configured.");
    }

    const limit = Number(MAX_DAILY_AI_CALLS.value() || process.env.MAX_DAILY_AI_CALLS || "30");
    await consumeDailyUsage(request.auth.uid, limit);

    try {
      const normalizedInput: AnalyzeEntryInput = {
        ...parsedInput.data,
        priorEstimate: parsedInput.data.priorEstimate as AnalyzeEntryInput["priorEstimate"],
      };

      return await runGeminiMealAnalysis(normalizedInput, {
        apiKey,
        model: GEMINI_MODEL.value() || process.env.GEMINI_MODEL || "gemini-2.5-flash",
      });
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "Could not analyze the meal.",
      );
    }
  },
);
