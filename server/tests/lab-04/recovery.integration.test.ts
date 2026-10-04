import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { databaseFixture, testDatabaseUrl } from "../lab-03/database-fixture.js";
import { legacyFixture, oldSnapshot } from "./legacy-fixture.js";

it("restores a real pg_dump and attachment backup into an owned isolated schema", async () => {
  const container = process.env.LAB4_TEST_POSTGRES_CONTAINER;
  if (!container || !/^toktickit-lab4-test$/.test(container)) throw new Error("Set LAB4_TEST_POSTGRES_CONTAINER=toktickit-lab4-test for the dedicated disposable recovery service.");
  testDatabaseUrl();
  const source = await legacyFixture(), target = await databaseFixture("00000000000000");
  const backupDir = await mkdtemp(join(tmpdir(), "toktickit-lab4-backup-"));
  try {
    const before = await oldSnapshot(source.prisma), beforeHash = await source.fileHash();
    const sql = execFileSync("docker", ["exec", container, "pg_dump", "-U", "labtest", "-d", "toktickit_lab3_test", "--schema", source.schema, "--no-owner", "--no-privileges"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    expect(sql).toContain(`CREATE SCHEMA ${source.schema}`);
    await cp(source.storage, join(backupDir, "files"), { recursive: true });
    source.upgrade();
    const restoreSql = sql.replace(`CREATE SCHEMA ${source.schema};`, "").replaceAll(source.schema, target.schema);
    // pg_dump includes COPY data and psql commands: restore with psql, not Prisma's SQL executor.
    const result = execFileSync("docker", ["exec", "-i", container, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "labtest", "-d", "toktickit_lab3_test"], { input: restoreSql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    expect(result).toContain("COPY");
    expect(await oldSnapshot(target.prisma)).toEqual(before);
    expect(createHash("sha256").update(await readFile(join(backupDir, "files", "legacy-file"))).digest("hex")).toBe(beforeHash);
    expect(await target.prisma.$queryRaw`SELECT to_regclass('"ActionTaken"')::text AS name`).toEqual([{ name: null }]);
    expect(await source.prisma.actionTaken.count()).toBe(0);
  } finally {
    await source.dispose(); await target.dispose();
    if (!resolve(backupDir).startsWith(resolve(tmpdir()) + sep + "toktickit-lab4-backup-")) throw new Error("Unsafe backup cleanup.");
    await rm(backupDir, { recursive: true });
  }
}, 60000);
