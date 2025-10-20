import { webcrypto } from "node:crypto";

const cryptoObj: Crypto =
  typeof globalThis.crypto !== "undefined"
    ? (globalThis.crypto as Crypto)
    : (webcrypto as unknown as Crypto);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function assertKeyMaterial(rawKey?: string): string {
  if (!rawKey) {
    throw new Error("JOURNAL_ENCRYPTION_KEY env var must be set for journal encryption");
  }
  return rawKey;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buffer = Buffer.from(base64, "base64");
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const rawKey = assertKeyMaterial(process.env.JOURNAL_ENCRYPTION_KEY);
  if (!keyCache.has(rawKey)) {
    const keyPromise = cryptoObj.subtle.importKey(
      "raw",
      base64ToArrayBuffer(rawKey),
      "AES-GCM",
      false,
      ["encrypt", "decrypt"],
    );
    keyCache.set(rawKey, keyPromise);
  }
  return keyCache.get(rawKey)!;
}

export async function encryptString(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(plaintext);
  const encrypted = await cryptoObj.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  return arrayBufferToBase64(result.buffer);
}

export async function decryptString(payload: string): Promise<string> {
  const key = await getEncryptionKey();
  const data = new Uint8Array(base64ToArrayBuffer(payload));
  const iv = data.subarray(0, 12);
  const ciphertext = data.subarray(12);
  const decrypted = await cryptoObj.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return textDecoder.decode(decrypted);
}

async function decryptJournalValue(value: string): Promise<string> {
  try {
    return await decryptString(value);
  } catch (err) {
    if (
      err instanceof DOMException ||
      (err instanceof Error && (err.name === "OperationError" || err.name === "InvalidCharacterError"))
    ) {
      // Fall back to returning the original value for legacy plaintext rows.
      return value;
    }
    throw err;
  }
}

export async function decryptJournalField(value: string | null | undefined): Promise<string | null> {
  if (value == null) return null;
  return decryptJournalValue(value);
}

export type EncryptedJournalRow = { entry: string; ai_summary?: string | null } & Record<string, unknown>;

export async function decryptJournalRow<T extends EncryptedJournalRow>(row: T): Promise<T> {
  const entry = await decryptJournalValue(row.entry);
  const aiSummaryValue = row.ai_summary;
  const ai_summary =
    typeof aiSummaryValue === "string"
      ? await decryptJournalValue(aiSummaryValue)
      : aiSummaryValue ?? null;
  return { ...row, entry, ai_summary } as T;
}
