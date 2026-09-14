import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { hashPassword, validateInitialPassword } from "../src/auth/password.js";
import { getPrisma } from "../src/prisma.js";

export function requireLocalMaintenance(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV === "production") throw new Error("Lab 3 local provisioning and demo seed refuse production mode.");
}

export async function provisionInitialPasswords(
  prisma: PrismaClient, password: string | undefined, env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  requireLocalMaintenance(env);
  validateInitialPassword(password);
  const users = await prisma.user.findMany({ where: { passwordHash: null }, select: { id: true } });
  const hashes: Array<{ id: number; hash: string }> = [];
  // Bound memory: one asynchronous scrypt at a time, independent salt per user.
  for (const user of users) hashes.push({ id: user.id, hash: await hashPassword(password) });
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(334003)`;
    let count = 0;
    for (const user of hashes) {
      const result = await tx.user.updateMany({
        where: { id: user.id, passwordHash: null },
        data: { passwordHash: user.hash, mustChangePassword: true, version: { increment: 1 } },
      });
      count += result.count;
    }
    return count;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const prisma = getPrisma();
  provisionInitialPasswords(prisma, process.env.LAB3_MIGRATION_INITIAL_PASSWORD)
    .then((count) => console.log(`Provisioned ${count} previously unprovisioned user(s).`))
    .catch(() => {
      console.error("Provisioning failed. Use a valid LAB3_MIGRATION_INITIAL_PASSWORD outside production and verify the database migration/connection. No credentials are logged.");
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
