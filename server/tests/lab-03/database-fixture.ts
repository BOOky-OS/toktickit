import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const serverRoot = resolve(import.meta.dirname, "../..");
const cli = resolve(serverRoot, "../node_modules/prisma/build/index.js");
export const migrationDirectory = resolve(serverRoot, "prisma/migrations");
export const upgradeName = "20260911040000_lab3_users_workflow";

export function testDatabaseUrl(): string {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw) throw new Error("Set TEST_DATABASE_URL to the isolated toktickit_lab3_test database.");
  const url = new URL(raw);
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || url.pathname !== "/toktickit_lab3_test") {
    throw new Error("Tests require the allowlisted local toktickit_lab3_test database.");
  }
  const workingUrls = [process.env.DATABASE_URL];
  try {
    const env = readFileSync(resolve(serverRoot, ".env"), "utf8");
    workingUrls.push(env.match(/^\s*DATABASE_URL\s*=\s*["']?([^\r\n"']+)/m)?.[1]?.trim());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  for (const working of workingUrls) {
    if (working && new URL(working).pathname === url.pathname) {
      throw new Error("TEST_DATABASE_URL must differ from the working DATABASE_URL.");
    }
  }
  return raw;
}

export function executeScript(url: string, sql: string): void {
  // The CLI accepts a whole SQL script, including the migration's transaction.
  try {
    execFileSync(process.execPath, [cli, "db", "execute", "--url", url, "--stdin"], {
      input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    });
  } catch (error) {
    const stderr = (error as { stderr?: string | Buffer }).stderr?.toString() ?? "Database script failed.";
    throw new Error(stderr.replaceAll(url, "[isolated test database]"));
  }
}

export async function databaseFixture(legacy = false) {
  const baseUrl = testDatabaseUrl();
  const schema = `lab3_test_${randomUUID().replaceAll("-", "")}`;
  const base = new PrismaClient({ datasources: { db: { url: baseUrl } } });
  await base.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const url = new URL(baseUrl);
  url.searchParams.set("schema", schema);
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const dispose = async () => {
    await prisma.$disconnect();
    // Only this invocation's random, owned schema in the allowlisted test DB.
    testDatabaseUrl();
    if (!/^lab3_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Unsafe fixture schema.");
    await base.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await base.$disconnect();
  };
  try {
    const names = readdirSync(migrationDirectory).filter((name) => /^\d/.test(name)).sort();
    for (const name of names) {
      if (legacy && name >= upgradeName) continue;
      executeScript(url.toString(), readFileSync(resolve(migrationDirectory, name, "migration.sql"), "utf8"));
    }
  } catch (error) {
    await dispose();
    throw error;
  }
  return { prisma, url: url.toString(), dispose, upgrade: () => executeScript(url.toString(),
    readFileSync(resolve(migrationDirectory, upgradeName, "migration.sql"), "utf8")) };
}

export function checkSchemaDrift(url: string): void {
  execFileSync(process.execPath, [cli, "migrate", "diff", "--from-url", url,
    "--to-schema-datamodel", resolve(serverRoot, "prisma/schema.prisma"), "--exit-code"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
}
