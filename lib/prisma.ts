import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client"; // run: pnx prisma generate, it will generate the folder from schema.prisma output path
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL}) // change the db url

const globalForPrisma = globalThis as unknown as {prisma: PrismaClient};
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });
if(process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
