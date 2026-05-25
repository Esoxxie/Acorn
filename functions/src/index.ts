import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import type { AnalyzeEntryInput } from "../../shared/models";
import { analyzeEntryInputSchema, normalizeAnalyzeEntryInput } from "../../shared/analyze-entry-input";
import { runGeminiMealAnalysis } from "./gemini";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const GEMINI_MODEL = defineString("GEMINI_MODEL", { default: "gemini-3.5-flash" });
const MAX_DAILY_AI_CALLS = defineString("MAX_DAILY_AI_CALLS", { default: "30" });

function getUserSafeAnalyzeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    message.includes("could not recognize a food") ||
    message.includes("couldn't recognize a food") ||
    message.includes("kein lebensmittel erkennen") ||
    (message.includes("\"items\"") && message.includes("too_small"))
  ) {
    return "Wir konnten aus diesem Eintrag kein Lebensmittel erkennen. Nenne das Gericht oder ein paar Zutaten genauer.";
  }

  if (message.includes("too many states") || (message.includes("invalid_argument") && message.includes("schema"))) {
    return "Der Schaetzer hat unser Antwortformat abgelehnt. Bitte versuche es gleich noch einmal.";
  }

  if (message.includes("empty response") || message.includes("leere antwort")) {
    return "Der Schaetzer hat ein leeres Ergebnis geliefert. Bitte versuche es erneut.";
  }

  if (
    message.includes("invalid json") ||
    message.includes("missing mealtitle") ||
    message.includes("missing summary") ||
    message.includes("missing calories") ||
    message.includes("validation")
  ) {
    return "Der Schaetzer hat ein unlesbares Ergebnis geliefert. Bitte versuche es erneut.";
  }

  return "Die Mahlzeit konnte gerade nicht analysiert werden. Bitte versuche es erneut.";
}

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
    cors: ["https://acorn-99388.web.app", "https://acorn-99388.firebaseapp.com"],
    invoker: "public",
    secrets: [GEMINI_API_KEY],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Melde dich an, bevor du eine Schaetzung anforderst.");
    }

    const parsedInput = analyzeEntryInputSchema.safeParse(request.data);
    if (!parsedInput.success) {
      throw new HttpsError("invalid-argument", parsedInput.error.issues[0]?.message ?? "Ungueltige Eingabe.");
    }

    const apiKey = GEMINI_API_KEY.value() || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "Der Gemini-API-Schluessel ist nicht konfiguriert.");
    }

    const limit = Number(MAX_DAILY_AI_CALLS.value() || process.env.MAX_DAILY_AI_CALLS || "30");
    await consumeDailyUsage(request.auth.uid, limit);

    try {
      const normalizedInput: AnalyzeEntryInput = normalizeAnalyzeEntryInput(parsedInput.data);

      return await runGeminiMealAnalysis(normalizedInput, {
        apiKey,
        model: GEMINI_MODEL.value() || process.env.GEMINI_MODEL || "gemini-3.5-flash",
      });
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Die Mahlzeit konnte nicht analysiert werden.",
        { message: getUserSafeAnalyzeErrorMessage(error) },
      );
    }
  },
);
