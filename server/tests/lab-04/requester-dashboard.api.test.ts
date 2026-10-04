import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { actionFixture } from "./action-fixture.js";
vi.mock("../../src/prisma.js", () => ({ getPrisma: vi.fn() }));
let f: Awaited<ReturnType<typeof actionFixture>>;
beforeAll(async () => { f = await actionFixture(); }, 60000);
afterAll(async () => { await f?.dispose(); });
it("returns zero metrics only to an eligible Requester and rejects scope overrides", async () => {
  const r = await f.call("get", "/dashboards/requester", "other");
  expect(r.status).toBe(200);
  expect(r.body.metrics).toEqual({ openTickets: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0 });
  expect(r.body.recentTickets).toEqual([]);
  for (const actor of ["staff", "admin", "anonymous", "inactive", "forced"]) expect((await f.call("get", "/dashboards/requester", actor)).status).toBeGreaterThanOrEqual(400);
  for (const q of ["?requesterId=1", "?userId=1", "?x=1&x=2"]) expect((await f.call("get", "/dashboards/requester" + q, "requester")).status).toBe(400);
});
it("matches independent owner-scoped counts, bounds, ordering and My Tickets drill-down", async () => {
  const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
  for (let n = 0; n < 24; n++) {
    const t = await f.make();
    await f.prisma.ticket.update({ where: { id: t.id }, data: { requesterId: n < 16 ? f.users.requester : f.users.other, currentStatus: statuses[n % 8], resolvedAt: new Date(), updatedAt: new Date() } });
  }
  for (const actor of ["requester", "other"]) {
    const r = await f.call("get", "/dashboards/requester", actor); expect(r.status).toBe(200);
    const rows = await f.prisma.$queryRaw<Array<{ id: number; currentStatus: string; updatedAt: Date; resolvedAt: Date | null }>>`SELECT id,"currentStatus","updatedAt","resolvedAt" FROM "Ticket" WHERE "requesterId"=${f.users[actor]}`;
    const from = new Date(r.body.recentWindow.from), to = new Date(r.body.recentWindow.to);
    const recent = (date: Date | null) => date !== null && date >= from && date <= to;
    const expected = { openTickets: rows.filter(t => !["RESOLVED", "CLOSED", "CANCELLED"].includes(t.currentStatus)).length,
      waitingForRequester: rows.filter(t => t.currentStatus === "WAITING_FOR_REQUESTER").length,
      recentlyUpdated: rows.filter(t => recent(t.updatedAt)).length,
      recentlyResolved: rows.filter(t => ["RESOLVED", "CLOSED"].includes(t.currentStatus) && recent(t.resolvedAt)).length };
    expect(r.body.metrics).toEqual(expected);
    expect(r.body.recentTickets.map((t: { id: number }) => t.id)).toEqual(rows.filter(t => recent(t.updatedAt)).sort((a,b) => +b.updatedAt - +a.updatedAt || b.id - a.id).slice(0,5).map(t => t.id));
    expect(r.body.recentTickets.every((t: {requester:{id:number}}) => t.requester.id === f.users[actor])).toBe(true);
    expect(JSON.stringify(r.body)).not.toMatch(/passwordHash|storageKey|internalNote|seedKey/);
    for (const [metric, query] of Object.entries({openTickets:{statusGroup:"active"}, waitingForRequester:{currentStatus:"WAITING_FOR_REQUESTER"}, recentlyUpdated:{updatedSince:from.toISOString(),updatedBefore:to.toISOString()}, recentlyResolved:{resolvedSince:from.toISOString(),resolvedBefore:to.toISOString()}})) {
      const list = await f.call("get", "/tickets?" + new URLSearchParams(query), actor);
      expect(list.status).toBe(200); expect(list.body.totalItems).toBe(expected[metric as keyof typeof expected]);
      expect(list.body.items.every((t:{id:number}) => rows.some(row=>row.id===t.id))).toBe(true);
    }
  }
});
it("includes both exact seven-day endpoints, excludes outside instants and reopened resolutions", async () => {
  const { requesterDashboard } = await import("../../src/tickets/requester-dashboard.js");
  const now = new Date("2025-12-20T10:00:00Z"), from = new Date(+now - 7 * 86400000);
  const ids: number[] = [];
  for (const date of [new Date(+from-1), from, new Date(+from+1), now, new Date(+now+1)]) {
    const t=await f.make(); ids.push(t.id);
    await f.prisma.ticket.update({where:{id:t.id},data:{currentStatus:"CLOSED",updatedAt:date,resolvedAt:date}});
  }
  const r=await requesterDashboard(f.prisma,f.users.requester,now);
  expect(r.metrics.recentlyUpdated).toBe(3); expect(r.metrics.recentlyResolved).toBe(3);
  expect((r.recentTickets as Array<{id:number}>).map(t=>t.id)).toEqual([ids[3],ids[2],ids[1]]);
  await f.prisma.ticket.update({where:{id:ids[3]},data:{currentStatus:"REOPENED",resolvedAt:null,updatedAt:now}});
  expect((await requesterDashboard(f.prisma,f.users.requester,now)).metrics.recentlyResolved).toBe(2);
});
it("rejects invalid list predicates, repeated parameters and cross-owner access", async () => {
  for (const q of ["actionAssignee=me", "requesterId=1", "statusGroup=active&currentStatus=OPEN", "statusGroup=all", "currentStatus=OPEN&currentStatus=CLOSED", "updatedSince=2026-01-01T00:00:00Z", "resolvedSince=2026-01-01T00:00:00Z&resolvedBefore=2026-01-02T00:00:00Z&statusGroup=active", "updatedSince=2026-02-30T00:00:00Z&updatedBefore=2026-03-02T00:00:00Z"]) expect((await f.call("get","/tickets?"+q,"requester")).status).toBe(400);
  const ticket=await f.make(); expect((await f.call("get","/tickets/"+ticket.id,"other")).status).toBe(404);
});
it("returns a safe failure without partial data", async () => {
  const spy=vi.spyOn(f.prisma,"$transaction").mockRejectedValueOnce(new Error("private SQL detail"));
  try {const r=await f.call("get","/dashboards/requester","requester");expect(r.status).toBe(500);expect(r.text).not.toMatch(/private SQL|metrics/);} finally {spy.mockRestore();}
});
