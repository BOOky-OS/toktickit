import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const storageRoot = path.resolve(process.cwd(), ".toktickit-storage");

function storagePath(storageKey: string): string {
  const target = path.resolve(storageRoot, storageKey);
  if (!target.startsWith(storageRoot + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return target;
}

export async function writeStoredAttachment(storageKey: string, content: Buffer): Promise<void> {
  const target = storagePath(storageKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
}

export async function readStoredAttachment(storageKey: string): Promise<Buffer> {
  return readFile(storagePath(storageKey));
}

export async function deleteStoredAttachment(storageKey: string): Promise<void> {
  await rm(storagePath(storageKey), { force: true });
}
