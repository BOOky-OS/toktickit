import { Prisma, TicketStatus } from "@prisma/client";
import { invalid } from "../auth/security.js";
export const activeStatuses: TicketStatus[] = ["NEW","OPEN","IN_PROGRESS","WAITING_FOR_REQUESTER","REOPENED"];
export const dashboardFilterKeys = ["statusGroup","updatedSince","updatedBefore","resolvedSince","resolvedBefore","actionAssignee"];
export function dashboardFilters(query: Record<string, unknown>, actorId: number, now=new Date()): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {};
  if(query.statusGroup!==undefined){if(query.statusGroup!=="active" || query.currentStatus!==undefined)throw invalid();where.currentStatus={in:activeStatuses};}
  if(query.actionAssignee!==undefined){if(query.actionAssignee!=="me")throw invalid();where.actions={some:{assigneeId:actorId,status:{in:["PLANNED","IN_PROGRESS"]}}};}
  const updated=query.updatedSince!==undefined||query.updatedBefore!==undefined;
  const resolved=query.resolvedSince!==undefined||query.resolvedBefore!==undefined;
  if(updated&&resolved)throw invalid();
  if(resolved&&(query.statusGroup!==undefined||query.currentStatus!==undefined))throw invalid();
  if(updated||resolved){const prefix=updated?"updated":"resolved";
    const parse=(v:unknown)=>{if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v))throw invalid();const [year,month,day]=v.slice(0,10).split("-").map(Number); if(month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate())throw invalid();const d=new Date(v);if(!Number.isFinite(+d))throw invalid();return d;};
    const from=parse(query[prefix+"Since"]),to=parse(query[prefix+"Before"]);if(from>to||to>now)throw invalid();
    if(updated)where.updatedAt={gte:from,lte:to};else {where.resolvedAt={gte:from,lte:to};where.currentStatus={in:["RESOLVED","CLOSED"]};}
  }
  return where;
}
