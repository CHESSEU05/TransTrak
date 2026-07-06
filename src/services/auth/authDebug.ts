type AuthDebugDetails = Record<string, unknown>;

const AUTH_DEBUG =
  typeof __DEV__ !== "undefined" && __DEV__
    ? true
    : process.env.EXPO_PUBLIC_AUTH_DEBUG === "1";

export function maskEmail(email?: string | null) {
  if (!email) {
    return null;
  }

  const [name, domain] = email.split("@");

  if (!domain) {
    return "***";
  }

  return `${name.slice(0, 2)}***@${domain}`;
}

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrub);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.entries(value as Record<string, unknown>).reduce<AuthDebugDetails>(
    (acc, [key, entry]) => {
      const lowered = key.toLowerCase();

      if (
        lowered.includes("password") ||
        lowered.includes("token") ||
        lowered.includes("secret") ||
        lowered.includes("code")
      ) {
        acc[key] = "[redacted]";
      } else if (lowered.includes("redirect")) {
        acc[key] = entry;
      } else if (lowered.includes("email")) {
        acc[key] = typeof entry === "string" ? maskEmail(entry) : scrub(entry);
      } else {
        acc[key] = scrub(entry);
      }

      return acc;
    },
    {}
  );
}

export function authDebug(event: string, details?: AuthDebugDetails) {
  if (!AUTH_DEBUG) {
    return;
  }

  if (details) {
    console.log(`[TransTrak Auth] ${event}`, scrub(details));
  } else {
    console.log(`[TransTrak Auth] ${event}`);
  }
}

export function authDebugError(event: string, error: unknown, details?: AuthDebugDetails) {
  if (!AUTH_DEBUG) {
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(`[TransTrak Auth] ${event}`, scrub({ ...details, message }));
}
