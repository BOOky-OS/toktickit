import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { databaseFixture } from "../server/tests/lab-03/database-fixture";
import { seedLab4Demo, LAB4_DEMO_PASSWORD } from "../server/prisma/lab4-seed";

// Disposable student preview: never loads or migrates the working database.
async function main() {
  const root = resolve(import.meta.dirname, ".."), initialCwd = process.cwd();
  const fixture = await databaseFixture("99999999999999");
  const storage = await mkdtemp(join(tmpdir(), "toktickit-lab4-preview-"));
  let stopServer: (() => Promise<void>) | undefined;
  let frontend: ReturnType<typeof spawn> | undefined;
  let closing = false;
  async function stop() {
    if (closing) return; closing = true;
    frontend?.kill(); await stopServer?.(); process.chdir(initialCwd);
    await fixture.dispose();
    const target = resolve(storage);
    if (!target.startsWith(resolve(tmpdir()) + sep + "toktickit-lab4-preview-")) throw new Error("Unsafe preview storage path");
    await rm(target, { recursive: true, force: true });
  }
  try {
    await seedLab4Demo(fixture.prisma, { ...process.env, DATABASE_URL: fixture.url, LAB4_ALLOW_DEMO_SEED: "true", NODE_ENV: "development" });
    // Only the newly created disposable demo identities skip initial password replacement.
    await fixture.prisma.user.updateMany({ where: { seedKey: { startsWith: "lab4.user." } }, data: { mustChangePassword: false } });
    process.env.DATABASE_URL = fixture.url;
    process.env.CLIENT_ORIGIN = "http://localhost:5178"; process.env.ALLOW_LOCAL_HTTP = "true";
    process.chdir(storage);
    const { app } = await import("../server/src/app");
    const { getPrisma } = await import("../server/src/prisma");
    process.chdir(root);
    const server = app.listen(3008, "localhost");
    await new Promise<void>((done, reject) => { server.once("listening", done); server.once("error", reject); });
    stopServer = async () => { server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); await getPrisma().$disconnect(); };
    frontend = spawn(process.execPath, [join(root, "node_modules/vite/bin/vite.js"), "--host", "localhost", "--port", "5178", "--strictPort"], {
      cwd: join(root, "client"), env: { ...process.env, VITE_API_URL: "http://localhost:3008" }, stdio: "inherit", windowsHide: true,
    });
    frontend.on("exit", () => { if (!closing) void stop().then(() => { process.exitCode = 1; }); });
    console.log("Lab 4 student UI preview: http://localhost:5178");
    console.log("Disposable accounts: requester@lab4.example.test, staff@lab4.example.test, admin@lab4.example.test");
    console.log("Local demo password: " + LAB4_DEMO_PASSWORD);
    console.log("Empty accounts: empty-requester@lab4.example.test, empty-staff@lab4.example.test. Stop with Ctrl+C; preview edits are discarded.");
    for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => { void stop().then(() => process.exit(0)); });
  } catch (error) { await stop(); throw error; }
}
main().catch(() => { console.error("Preview could not start. Check the isolated test database and free ports 3008/5178."); process.exitCode = 1; });
