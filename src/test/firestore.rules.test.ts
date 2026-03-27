import { readFileSync } from "node:fs";
import { join } from "node:path";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { afterAll, describe, expect, it } from "vitest";

const shouldRun = process.env.RUN_FIREBASE_EMULATOR_TESTS === "true";
const suite = shouldRun ? describe : describe.skip;

let testEnvironment: Awaited<ReturnType<typeof initializeTestEnvironment>> | null = null;

suite("firestore rules", () => {
  it("boots the rules test environment when the emulator is available", async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: "demo-acorn",
      firestore: {
        host: "127.0.0.1",
        port: 8080,
        rules: readFileSync(join(process.cwd(), "firestore.rules"), "utf8"),
      },
    });

    expect(testEnvironment).toBeTruthy();
  });
});

afterAll(async () => {
  await testEnvironment?.cleanup();
});
