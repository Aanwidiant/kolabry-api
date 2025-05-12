import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL with Prisma");
  } catch (error) {
    console.error("Failed to connect to the database:", error);
  }
};

export { prisma };
