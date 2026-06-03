import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { afterAll, describe, expect, it } from "vitest";

const shouldRun = process.env.RUN_FIREBASE_EMULATOR_TESTS === "true";
const suite = shouldRun ? describe : describe.skip;

let testEnvironment: Awaited<ReturnType<typeof initializeTestEnvironment>> | null = null;

async function initializeRulesTestEnvironment() {
  await testEnvironment?.cleanup();

  testEnvironment = await initializeTestEnvironment({
    projectId: "demo-acorn",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync(join(process.cwd(), "firestore.rules"), "utf8"),
    },
    storage: {
      host: "127.0.0.1",
      port: 9199,
      rules: readFileSync(join(process.cwd(), "storage.rules"), "utf8"),
    },
  });

  return testEnvironment;
}

suite("firestore rules", () => {
  it("boots the rules test environment when the emulator is available", async () => {
    testEnvironment = await initializeRulesTestEnvironment();

    expect(testEnvironment).toBeTruthy();
  });

  it("allows allowlisted and existing owners to read and write user documents", async () => {
    testEnvironment = await initializeRulesTestEnvironment();

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "allowedUsers/alice"), { note: "private user" });
      await setDoc(doc(context.firestore(), "users/carol"), { units: "metric" });
    });

    const alice = testEnvironment.authenticatedContext("alice").firestore();
    const bob = testEnvironment.authenticatedContext("bob").firestore();
    const carol = testEnvironment.authenticatedContext("carol").firestore();

    await assertSucceeds(setDoc(doc(alice, "users/alice"), { units: "metric" }));
    await assertSucceeds(setDoc(doc(carol, "users/carol"), { units: "metric", themePreference: "system" }));
    await assertFails(setDoc(doc(bob, "users/bob"), { units: "metric" }));
    await assertFails(getDoc(doc(bob, "users/alice")));
    await assertFails(getDoc(doc(alice, "allowedUsers/alice")));
  });

  it("restricts storage writes to allowlisted webp meal images", async () => {
    testEnvironment = await initializeRulesTestEnvironment();

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "allowedUsers/alice"), { note: "private user" });
      await setDoc(doc(context.firestore(), "users/carol"), { units: "metric" });
    });

    const aliceStorage = testEnvironment.authenticatedContext("alice").storage();
    const bobStorage = testEnvironment.authenticatedContext("bob").storage();
    const carolStorage = testEnvironment.authenticatedContext("carol").storage();
    const webpBlob = new Blob(["image"], { type: "image/webp" });
    const jpegBlob = new Blob(["image"], { type: "image/jpeg" });

    await assertSucceeds(uploadBytes(ref(aliceStorage, "users/alice/meals/meal-1/display.webp"), webpBlob));
    await assertSucceeds(uploadBytes(ref(carolStorage, "users/carol/meals/meal-1/display.webp"), webpBlob));
    await assertSucceeds(uploadBytes(ref(aliceStorage, "users/alice/meals/meal-1/thumb.webp"), webpBlob));
    await assertFails(uploadBytes(ref(aliceStorage, "users/alice/meals/meal-1/original.webp"), webpBlob));
    await assertFails(uploadBytes(ref(aliceStorage, "users/alice/meals/meal-1/display.jpg"), jpegBlob));
    await assertFails(uploadBytes(ref(bobStorage, "users/bob/meals/meal-1/display.webp"), webpBlob));
  });
});

afterAll(async () => {
  await testEnvironment?.cleanup();
});
