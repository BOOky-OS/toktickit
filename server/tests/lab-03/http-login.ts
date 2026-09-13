import request from "supertest";
import { expect } from "vitest";
import { app } from "../../src/app.js";

export const TEST_ORIGIN = "http://localhost:5173";
export const TEST_PASSWORD = "Audit password 123!";
export async function httpLogin(email: string) {
  const pre = await request(app).get("/api/auth/csrf");
  expect(pre.status).toBe(200);
  const login = await request(app).post("/api/auth/login")
    .set("Cookie", pre.headers["set-cookie"][0].split(";")[0])
    .set("Origin", TEST_ORIGIN).set("X-CSRF-Token", pre.body.csrfToken)
    .send({ email, password: TEST_PASSWORD });
  expect(login.status, login.text).toBe(200);
  return { Cookie: login.headers["set-cookie"][0].split(";")[0],
    Origin: TEST_ORIGIN, "X-CSRF-Token": login.body.csrfToken as string };
}
