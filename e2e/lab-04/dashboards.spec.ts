import {test,expect,Page} from "@playwright/test";
import {PrismaClient} from "@prisma/client";
import {mkdir} from "node:fs/promises";
async function login(page:Page,actor:string){await page.goto('/login');await page.getByLabel('Email *',{exact:true}).fill(`${actor}@lab4.example`);await page.getByLabel('Password *',{exact:true}).fill('Lab4-test-only-password!');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('button',{name:'Logout',exact:true})).toBeVisible();}
for(const [name,width,height] of [["desktop",1440,900],["tablet",834,1112],["mobile",390,844]] as const){
 test(`Staff dashboard ${name}: real counts, filters, refresh/back, stale feedback and focus`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await login(page,`dash${name}`);await expect(page).toHaveURL(/\/staff\/dashboard$/);await expect(page.getByRole('link',{name:'My pending actions'})).toContainText('0');
  const dir=`artifacts/lab-04/screenshots/staff-dashboard/${name}`;await mkdir(dir,{recursive:true});await page.screenshot({path:`${dir}/zero-personal.png`,fullPage:true});
  const db=new PrismaClient({datasources:{db:{url:process.env.LAB4_E2E_DATABASE_URL}}});let actionId=0;
  try{const actor=await db.user.findUniqueOrThrow({where:{email:`dash${name}@lab4.example`}});await db.ticket.update({where:{id:8},data:{ownerId:actor.id}});
    for(let i=0;i<2;i++)actionId=(await db.actionTaken.create({data:{ticketId:8,performedById:actor.id,assigneeId:actor.id,actionAt:new Date(),description:`Dashboard ${name} check ${i}`,result:'',followUpRequired:false,followUpNote:'',attachmentNotes:'',workCycle:1}})).id;
    await page.getByRole('button',{name:'Refresh dashboard'}).click();await expect(page.getByRole('link',{name:'My pending actions'})).toContainText('2');await expect(page.getByRole('link',{name:'My owned Tickets'})).toContainText('1');
    const response=await page.request.get('http://localhost:3007/api/dashboards/staff');expect(response.status()).toBe(200);const data=await response.json();
    const [{n}]=await db.$queryRaw<Array<{n:bigint}>>`SELECT count(*) AS n FROM "Ticket" WHERE "ownerId" IS NULL AND "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')`;
    expect(data.metrics.unassignedTickets).toBe(Number(n));expect(data.metrics.myPendingActions).toBe(2);
    await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${dir}/populated.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const card=page.getByRole('link',{name:'My pending actions'});await card.focus();await page.keyboard.press('Enter');await expect(page).toHaveURL(/actionAssignee=me/);await expect(page.getByText('Showing 1-1 of 1 Tickets')).toBeVisible();await expect(page.getByLabel('Pending action assignee')).toHaveValue('me');
    const filtered=page.url();await page.reload();await expect(page.getByText('Showing 1-1 of 1 Tickets')).toBeVisible();
    await page.getByRole('button',{name:'Open TKT-2026-000008',exact:true}).first().click();await page.getByRole('button',{name:'Back to Ticket Queue'}).click();await expect(page).toHaveURL(filtered);
    await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(page.getByLabel('Pending action assignee')).toHaveValue('');await page.goBack();await expect(page.getByLabel('Pending action assignee')).toHaveValue('me');
    await page.getByRole('navigation').getByRole('button',{name:'Dashboard',exact:true}).click();await page.getByRole('link',{name:`Action ${actionId} on TKT-2026-000008`}).click();await expect(page.locator(`#action-${actionId}`)).toBeFocused();
    await page.getByRole('navigation').getByRole('button',{name:'Dashboard',exact:true}).click();await page.getByRole('link',{name:'View recent Ticket Queue'}).click();await expect(page.getByText(/Active date filter: Updated/)).toBeVisible();await page.reload();await expect(page.getByText(/Active date filter: Updated/)).toBeVisible();
    await page.getByRole('navigation').getByRole('button',{name:'Dashboard',exact:true}).click();await expect(page.getByRole('link',{name:'My pending actions'})).toBeVisible();
    await page.route('**/api/dashboards/staff',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"private detail"}'}),{times:1});await page.getByRole('button',{name:'Refresh dashboard'}).click();await expect(page.getByRole('alert')).toContainText('out of date');await expect(page.getByRole('link',{name:'My pending actions'})).toContainText('2');await expect(page.getByText('private detail')).toHaveCount(0);
    await page.getByRole('button',{name:'Refresh dashboard'}).click();await expect(page.getByRole('alert')).toHaveCount(0);expect(errors).toEqual([]);
  }finally{await db.$disconnect();}
 });
}
test('Admin dashboard and Requester direct-access protection',async({page,browser})=>{
 await login(page,'admin');await expect(page).toHaveURL(/\/staff\/dashboard$/);await expect(page.getByRole('heading',{name:'Staff Dashboard'})).toBeVisible();await page.getByRole('navigation').getByRole('button',{name:'Users',exact:true}).click();await expect(page).toHaveURL(/\/admin\/users$/);
 const requester=await browser.newPage();await login(requester,'other');expect((await requester.request.get('http://localhost:3007/api/dashboards/staff')).status()).toBe(403);await requester.goto('/staff/dashboard');await expect(requester.getByRole('heading',{name:'This page is not available for your role'})).toBeVisible();await expect(requester.getByRole('link',{name:'My pending actions'})).toHaveCount(0);await requester.close();
});
