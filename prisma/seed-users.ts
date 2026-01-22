// Seed script untuk membuat user menggunakan BetterAuth API
// Run: npx tsx prisma/seed-users.ts
// Note: Server harus sudah running di localhost:3000

import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const prisma = new PrismaClient();

async function createUser(
  name: string,
  email: string,
  password: string,
  role: string,
) {
  try {
    // First, try to sign up the user
    const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": BASE_URL,
        "Referer": `${BASE_URL}/`,
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // User might already exist, check if it's that error
      if (
        data.message?.includes("already") ||
        data.code === "USER_ALREADY_EXISTS"
      ) {
        console.log(`⚠️ User ${email} already exists, updating role...`);
      } else {
        console.log(
          `⚠️ User ${email}: ${data.message || JSON.stringify(data)}`,
        );
      }
    } else {
      console.log(`✓ Created user: ${email}`);
    }

    // Update the role in the database
    await prisma.user.update({
      where: { email },
      data: { role },
    });
    console.log(`✓ Updated role for ${email} to: ${role}`);

    return data;
  } catch (error) {
    console.error(`❌ Error creating ${email}:`, error);
    return null;
  }
}

async function main() {
  console.log("🌱 Creating users via BetterAuth API...");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log("");

  // Create Pemilik user
  await createUser(
    "Admin Pemilik",
    "pemilik@example.com",
    "password123",
    "pemilik",
  );

  // Create Staf user
  await createUser("Kasir 1", "staf@example.com", "password123", "staf");

  await prisma.$disconnect();

  console.log("");
  console.log("✅ User seeding completed!");
  console.log("");
  console.log("📝 Demo Login Credentials:");
  console.log("   Pemilik: pemilik@example.com / password123");
  console.log("   Staf: staf@example.com / password123");
}

main();
