import { test, expect, Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
async function login(page: Page, actor: string) {
  await page.goto('/login'); await page.getByLabel('Email *',{exact:true}).fill(`${actor}@lab4.example`);
  await page.getByLabel('Password *',{exact:true}).fill('Lab4-test-only-password!');
  await page.getByRole('button',{name:'Sign in',exact:true}).click(); await expect(page).toHaveURL(/\/dashboard$/);
}
for (const [name,width,height] of [["desktop",1440,900],["tablet",834,1112],["mobile",390,844],["narrow",320,844]] as const) {
  test(`Requester ${name}: own metrics, URL filters, keyboard, stale recovery and identity switch`, async ({page}) => {
    test.setTimeout(90000); await page.setViewportSize({width,height});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await login(page,`req${name}`);
    const dir=`artifacts/lab-04/screenshots/requester-dashboard/${name}`;await mkdir(dir,{recursive:true});
    await expect(page.getByRole('link',{name:'Open Tickets 0',exact:true})).toBeVisible();await page.screenshot({path:`${dir}/zero.png`,fullPage:true});
    const db=new PrismaClient({datasources:{db:{url:process.env.LAB4_E2E_DATABASE_URL}}});
    try {
      const actor=await db.user.findUniqueOrThrow({where:{email:`req${name}@lab4.example`}});
      const template=await db.ticket.findUniqueOrThrow({where:{id:1}});
      const ids:number[]=[];
      for(let i=0;i<12;i++) {const t=await db.ticket.create({data:{ticketNumber:`REQ-${name}-${i}`,requesterId:actor.id,categoryId:template.categoryId,relatedSystemId:template.relatedSystemId,summary:`Own ${name} request ${i}`,description:'Requester dashboard browser fixture',requestedPriority:'HIGH',itPriority:'HIGH',currentStatus:i<10?'OPEN':i===10?'WAITING_FOR_REQUESTER':'CLOSED',resolvedAt:i===11?new Date():null,clientSubmissionKey:randomUUID()}});ids.push(t.id);}
      await page.getByRole('button',{name:'Refresh dashboard'}).click();await expect(page.getByRole('link',{name:'Open Tickets 11',exact:true})).toBeVisible();
      await expect(page.getByRole('link',{name:'Waiting for You 1',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Resolved in Last 7 Days 1',exact:true})).toBeVisible();
      const response=await page.request.get('http://localhost:3007/api/dashboards/requester');const data=await response.json();expect(response.status()).toBe(200);
      const [{n}]=await db.$queryRaw<Array<{n:bigint}>>`SELECT count(*) AS n FROM "Ticket" WHERE "requesterId"=${actor.id} AND "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')`;
      expect(data.metrics.openTickets).toBe(Number(n));expect(data.recentTickets).toHaveLength(5);expect(data.recentTickets.every((t:{id:number})=>ids.includes(t.id))).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`${dir}/populated.png`,fullPage:true});
      const card=page.getByRole('link',{name:'Open Tickets 11',exact:true});await card.focus();await page.keyboard.press('Enter');await expect(page.getByLabel('Status group')).toHaveValue('active');await expect(page.getByText('Showing 1-10 of 11 Tickets')).toBeVisible();
      await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByText('Showing 11-11 of 11 Tickets')).toBeVisible();const filtered=page.url();
      await page.reload();await expect(page.getByText('Showing 11-11 of 11 Tickets')).toBeVisible();await page.getByRole('button',{name:/^Open REQ-.*-0$/,exact:false}).click();
      await page.getByRole('button',{name:'Back to My Tickets'}).click();await expect(page).toHaveURL(filtered);
      await page.getByRole('button',{name:'Clear filters',exact:true}).click();await expect(page.getByLabel('Status group')).toHaveValue('');await page.goBack();await expect(page.getByLabel('Status group')).toHaveValue('active');
      for(const title of ['Waiting for You 1','Updated in Last 7 Days 12','Resolved in Last 7 Days 1']) {
        await page.getByRole('navigation').getByRole('button',{name:'Dashboard',exact:true}).click();await page.getByRole('link',{name:title,exact:true}).click();
        await expect(page.getByText(title.startsWith('Updated')?'Showing 1-10 of 12 Tickets':'Showing 1-1 of 1 Tickets')).toBeVisible();
        if(!title.startsWith('Waiting')) {await expect(page.getByText(/Active date filter:/)).toBeVisible();await page.reload();await expect(page.getByText(/Active date filter:/)).toBeVisible();}
      }
      await page.getByRole('navigation').getByRole('button',{name:'Dashboard',exact:true}).click();await page.getByRole('link',{name:'Open Tickets 11',exact:true}).waitFor();
      await page.route('**/api/dashboards/requester',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"private detail"}'}),{times:1});await page.getByRole('button',{name:'Refresh dashboard'}).click();await expect(page.getByRole('alert')).toContainText('out of date');await expect(page.getByRole('link',{name:'Open Tickets 11',exact:true})).toBeVisible();await page.screenshot({path:`${dir}/stale.png`,fullPage:true});
      await page.getByRole('button',{name:'Refresh dashboard'}).click();await expect(page.getByRole('alert')).toHaveCount(0);
      await page.getByRole('button',{name:'Logout',exact:true}).click();await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();await login(page,'reqswitch');await expect(page.getByRole('link',{name:'Open Tickets 0',exact:true})).toBeVisible();await expect(page.getByText(`Own ${name} request`,{exact:false})).toHaveCount(0);
      expect((await page.request.get(`http://localhost:3007/api/tickets/${ids[0]}`)).status()).toBe(404);
      expect((await page.request.get(`http://localhost:3007/api/dashboards/requester?requesterId=${actor.id}`)).status()).toBe(400);
      expect(errors).toEqual([]);
    } finally {await db.$disconnect();}
  });
}
