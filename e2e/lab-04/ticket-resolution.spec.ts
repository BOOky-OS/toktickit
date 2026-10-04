import { test, expect, Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdir } from "node:fs/promises";
async function login(page: Page, actor: string) {
  await page.goto("/login"); await page.getByLabel("Email *", {exact:true}).fill(`${actor}@lab4.example`);
  await page.getByLabel("Password *", {exact:true}).fill("Lab4-test-only-password!");
  await page.getByRole("button",{name:"Sign in",exact:true}).click(); await expect(page.getByRole("button",{name:"Logout",exact:true})).toBeVisible();
}
async function status(page:Page, next:string, expected=200) {
  await page.getByLabel("Next status").selectOption(next);
  await page.getByLabel(/Public status reason/).fill(`Verified change to ${next}`);
  await page.getByRole("button",{name:"Change status",exact:true}).click();
  const response=page.waitForResponse(r=>/\/staff\/tickets\/\d+\/status$/.test(r.url()) && r.request().method()==="POST");
  await page.getByRole("button",{name:"Confirm change",exact:true}).click();expect((await response).status()).toBe(expected);
  if(expected===200) await expect(page.getByLabel("Next status")).toHaveValue("");
  else await expect(page.getByRole("button",{name:"Reload Ticket"})).toBeVisible();
}
async function completedWork(page:Page, description:string) {
  await page.getByRole("button",{name:"Add action"}).click();await page.getByLabel("Description",{exact:true}).fill(description);
  await page.getByLabel("Result",{exact:true}).fill("Connection tested successfully");await page.getByRole("button",{name:"Save action",exact:true}).click();
  const card=page.getByRole("article").filter({hasText:description});await card.getByRole("button",{name:/^Start action/}).click();
  await card.getByRole("button",{name:/^Complete action/}).click();await expect(card.getByText("Completed",{exact:true}).first()).toBeVisible();
}
test("Requester creation/advice, Staff resolution gate, Admin close/reopen and new-cycle work",async({page,browser})=>{
  test.setTimeout(120000);
  await login(page,"requester");await page.getByRole("navigation").getByRole("button",{name:"Create Ticket",exact:true}).click();
  await page.getByLabel("Category *",{exact:true}).selectOption({label:"Network"});await page.getByLabel("Related System *",{exact:true}).selectOption({label:"Campus connection"});
  await page.getByLabel("Summary *",{exact:true}).fill("Workflow browser verification");await page.getByLabel("Description *",{exact:true}).fill("Connection repeatedly drops during lectures.");
  await page.getByRole("button",{name:"Submit Ticket",exact:true}).click();await page.getByRole("button",{name:"View Ticket Detail",exact:true}).click();
  const path=new URL(page.url()).pathname, id=Number(path.split("/").at(-1));
  await page.getByRole("button",{name:"Problem Appears Resolved",exact:true}).click();await page.getByRole("button",{name:"Confirm indication",exact:true}).click();
  await expect(page.getByText("Your resolution indication has been recorded.")).toBeVisible();
  const staff=await browser.newPage();await login(staff,"staff");await staff.goto(path);await staff.getByRole("button",{name:"Claim Ticket"}).click();
  await expect(staff.getByText("Ticket updated.",{exact:true})).toBeVisible();await status(staff,"OPEN");await status(staff,"RESOLVED",409);
  await expect(staff.getByText(/Complete work in the current cycle/)).toBeVisible();await completedWork(staff,"First cycle repair");
  await staff.getByRole("button",{name:"Reload Ticket"}).click();await status(staff,"RESOLVED");await expect(staff.getByRole("button",{name:"Add action"})).toHaveCount(0);
  const admin=await browser.newPage();await login(admin,"admin");await admin.goto(path);await status(admin,"CLOSED");await status(admin,"REOPENED");
  await status(admin,"RESOLVED",409);await completedWork(admin,"Second cycle repair");await admin.getByRole("button",{name:"Reload Ticket"}).click();await status(admin,"RESOLVED");
  await page.reload();await expect(page.getByRole("article")).toHaveCount(2);await expect(page.getByLabel("Next status")).toHaveCount(0);
  const db=new PrismaClient({datasources:{db:{url:process.env.LAB4_E2E_DATABASE_URL}}});
  try {
    const t=await db.ticket.findUniqueOrThrow({where:{id},include:{actions:true,statusChanges:{orderBy:[{createdAt:"asc"},{id:"asc"}]}}});
    expect(t.workCycle).toBe(2);expect(t.currentStatus).toBe("RESOLVED");expect(t.requesterResolutionIndicatedAt).toBeNull();
    expect(t.actions.map(a=>a.workCycle).sort()).toEqual([1,2]);expect(t.statusChanges.map(h=>h.toStatus)).toEqual(["OPEN","RESOLVED","CLOSED","REOPENED","RESOLVED"]);
  } finally {await db.$disconnect();await staff.close();await admin.close();}
});
for(const [name,width,height,id] of [["desktop",1440,900,9],["tablet",834,1112,10],["mobile",390,844,11]] as const) {
  test(`Ticket cancellation gate and keyboard confirmation at ${name}`,async({page})=>{
    await page.setViewportSize({width,height});await login(page,`workflow${name}`);await page.goto(`/tickets/${id}`);
    await page.getByRole("button",{name:"Add action"}).click();await page.getByLabel("Description",{exact:true}).fill("Pending diagnostic check");await page.getByRole("button",{name:"Save action",exact:true}).click();
    await expect(page.getByRole("article")).toHaveCount(1);await status(page,"CANCELLED",409);
    await expect(page.getByText(/Cancel pending actions individually/)).toBeVisible();
    const dir=`artifacts/lab-04/screenshots/ticket-workflow/${name}`;await mkdir(dir,{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${dir}/blocked.png`,fullPage:true});
    await page.getByRole("link",{name:"Review Actions Taken"}).click();await expect(page.locator("#actions-heading")).toBeFocused();
    await page.getByRole("button",{name:/^Cancel action/}).click();await page.getByLabel("Cancellation reason").fill("Diagnostic no longer needed");await page.getByRole("button",{name:"Confirm cancellation"}).click();
    await expect(page.getByRole("article").getByText("Cancelled",{exact:true}).first()).toBeVisible();await page.getByRole("button",{name:"Reload Ticket"}).click();
    await expect(page.getByText(/Latest Ticket loaded/)).toBeVisible();await page.getByRole("button",{name:"Change status",exact:true}).focus();await page.keyboard.press("Enter");
    const dialog=page.getByRole("dialog");for(let i=0;i<5;i++){await page.keyboard.press("Tab");expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}
    await page.evaluate(()=>window.scrollTo(0,0));const box=await dialog.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(box!.y+box!.height).toBeLessThanOrEqual(height);
    await page.screenshot({path:`${dir}/confirmation.png`});await page.keyboard.press("Escape");await expect(page.getByRole("button",{name:"Change status",exact:true})).toBeFocused();
    await status(page,"CANCELLED");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.getByLabel("Next status")).toBeDisabled();await expect(page.getByRole("button",{name:"Add action"})).toHaveCount(0);
  });
}
