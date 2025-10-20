import { performance } from "node:perf_hooks";
import { beforeAll, describe, expect, test } from "vitest";

import {
  decryptJournalField,
  decryptJournalRow,
  decryptString,
  encryptString,
} from "@/lib/encryption";

beforeAll(() => {
  process.env.JOURNAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("encryption utilities", () => {
  test("roundtrip restores the original plaintext", async () => {
    const plaintext = "The quick brown fox jumps over the lazy dog.";
    const encrypted = await encryptString(plaintext);
    expect(encrypted).not.toBe(plaintext);
    const decrypted = await decryptString(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  test("uses randomized IVs for identical plaintext", async () => {
    const plaintext = "repeatable message";
    const first = await encryptString(plaintext);
    const second = await encryptString(plaintext);
    expect(first).not.toBe(second);
  });

  test("meets baseline throughput for encrypt/decrypt cycles", async () => {
    const payload = "a".repeat(2048);
    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i += 1) {
      const encrypted = await encryptString(payload);
      const decrypted = await decryptString(encrypted);
      expect(decrypted).toBe(payload);
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1500);
  });

  test("falls back to legacy plaintext values", async () => {
    const legacyRow = { id: "1", entry: "plain-text entry", ai_summary: null };
    const decrypted = await decryptJournalRow(legacyRow);
    expect(decrypted.entry).toBe("plain-text entry");
    const summary = await decryptJournalField("legacy ai summary");
    expect(summary).toBe("legacy ai summary");
  });

  test("propagates errors for corrupted ciphertext", async () => {
    const plaintext = "sensitive data";
    const encrypted = await encryptString(plaintext);
    const corrupted = `${encrypted.slice(0, -4)}AAAA`;
    await expect(decryptJournalField(corrupted)).rejects.toThrow(DOMException);
  });

  test("propagates errors when the encryption key is incorrect", async () => {
    const plaintext = "different key scenario";
    const encrypted = await encryptString(plaintext);
    const originalKey = process.env.JOURNAL_ENCRYPTION_KEY;
    process.env.JOURNAL_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    await expect(decryptJournalField(encrypted)).rejects.toThrow(DOMException);
    process.env.JOURNAL_ENCRYPTION_KEY = originalKey;
  });
});
