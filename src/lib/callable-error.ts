function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function readMessageFromUnknown(value: unknown): string | null {
  if (isNonEmptyString(value)) {
    return value.trim();
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  if ("message" in value) {
    const message = readMessageFromUnknown((value as { message?: unknown }).message);
    if (message) {
      return message;
    }
  }

  if ("userMessage" in value) {
    const message = readMessageFromUnknown((value as { userMessage?: unknown }).userMessage);
    if (message) {
      return message;
    }
  }

  if ("error" in value) {
    const message = readMessageFromUnknown((value as { error?: unknown }).error);
    if (message) {
      return message;
    }
  }

  return null;
}

function isGenericInternalMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return (
    normalized === "internal" ||
    normalized === "internal error" ||
    normalized === "firebaseerror: internal" ||
    normalized.endsWith(": internal")
  );
}

export function getCallableErrorMessage(
  error: unknown,
  fallback = "Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut.",
): string {
  if (typeof error === "object" && error !== null) {
    if ("details" in error) {
      const detailsMessage = readMessageFromUnknown((error as { details?: unknown }).details);
      if (detailsMessage) {
        return detailsMessage;
      }
    }

    if ("customData" in error) {
      const customMessage = readMessageFromUnknown((error as { customData?: unknown }).customData);
      if (customMessage) {
        return customMessage;
      }
    }

    if ("message" in error) {
      const message = readMessageFromUnknown((error as { message?: unknown }).message);
      if (message && !isGenericInternalMessage(message)) {
        return message;
      }
    }
  }

  if (error instanceof Error && isNonEmptyString(error.message) && !isGenericInternalMessage(error.message)) {
    return error.message.trim();
  }

  return fallback;
}
