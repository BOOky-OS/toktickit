import { pathToFileURL } from "node:url";
import { getPrisma } from "../src/prisma.js";

export const CATEGORIES = [
  { name: "Account and Access", isActive: true },
  { name: "Hardware", isActive: true },
  { name: "Software", isActive: true },
  { name: "Network", isActive: true },
] as const;

export const RELATED_SYSTEMS = [
  { name: "Campus Wi-Fi", isActive: true },
  { name: "Corporate Laptop", isActive: true },
  { name: "Email", isActive: true },
  { name: "Grade Submission App", isActive: true },
  { name: "LEB2 App", isActive: true },
  { name: "Printer", isActive: true },
  { name: "VPN", isActive: true },
] as const;

export const DEVELOPMENT_REQUESTERS = [
  { displayName: "Jennifer Anderson", email: "jennifer.anderson@example.test", isActive: true },
  { displayName: "Michael Brown", email: "michael.brown@example.test", isActive: true },
  { displayName: "Sarah Johnson", email: "sarah.johnson@example.test", isActive: true },
  { displayName: "David Lee", email: "david.lee@example.test", isActive: true },
  { displayName: "Olivia Martin", email: "olivia.martin@example.test", isActive: false },
] as const;

type SeedPrisma = Pick<
  ReturnType<typeof getPrisma>,
  "category" | "relatedSystem" | "developmentRequester"
>;

export async function seedReferenceData(prisma: SeedPrisma) {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { isActive: category.isActive },
      create: category,
    });
  }
  for (const system of RELATED_SYSTEMS) {
    await prisma.relatedSystem.upsert({
      where: { name: system.name },
      update: { isActive: system.isActive },
      create: system,
    });
  }
  for (const requester of DEVELOPMENT_REQUESTERS) {
    await prisma.developmentRequester.upsert({
      where: { email: requester.email },
      update: { displayName: requester.displayName, isActive: requester.isActive },
      create: requester,
    });
  }
}

async function main() {
  const prisma = getPrisma();
  await seedReferenceData(prisma);
  console.log("Seeded Lab 2 requester and reference data.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}
