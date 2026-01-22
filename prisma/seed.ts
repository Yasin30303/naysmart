// Seed script untuk data awal
// Run: npx tsx prisma/seed.ts
// Note: Run seed-users.ts AFTER server is running to create users with proper auth

import { PrismaClient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create Products
  console.log("Creating products...");

  const produkData = [
    { nama_produk: "Kopi Susu", harga: 15000 },
    { nama_produk: "Es Teh", harga: 8000 },
    { nama_produk: "Nasi Goreng", harga: 20000 },
    { nama_produk: "Mie Goreng", harga: 18000 },
    { nama_produk: "Jus Jeruk", harga: 12000 },
    { nama_produk: "Roti Bakar", harga: 10000 },
    { nama_produk: "Pisang Goreng", harga: 8000 },
  ];

  const produkList = [];
  for (const data of produkData) {
    const produk = await prisma.produk.upsert({
      where: { nama_produk: data.nama_produk },
      update: {},
      create: {
        nama_produk: data.nama_produk,
        harga: new Decimal(data.harga),
      },
    });
    produkList.push(produk);
  }

  console.log(`✓ Created ${produkList.length} products`);

  // 3. Create Criteria (total weight = 1.0000)
  console.log("Creating criteria...");

  const kriteriaData = [
    {
      nama_kriteria: "Jumlah Penjualan",
      bobot: 0.3,
      tipe: "benefit",
    },
    {
      nama_kriteria: "Pendapatan",
      bobot: 0.3,
      tipe: "benefit",
    },
    {
      nama_kriteria: "Stok Sisa",
      bobot: 0.2,
      tipe: "cost",
    },
    {
      nama_kriteria: "Margin Keuntungan",
      bobot: 0.2,
      tipe: "benefit",
    },
  ];

  const kriteriaList = [];
  for (const data of kriteriaData) {
    const kriteria = await prisma.kriteria.upsert({
      where: { nama_kriteria: data.nama_kriteria },
      update: {},
      create: {
        nama_kriteria: data.nama_kriteria,
        bobot: new Decimal(data.bobot),
        tipe: data.tipe,
      },
    });
    kriteriaList.push(kriteria);
  }

  console.log(`✓ Created ${kriteriaList.length} criteria`);

  // 4. Create Daily Stock for today
  console.log("Creating daily stock...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stokData = [
    { produk_id: produkList[0].id, stok_awal: 50 }, // Kopi Susu
    { produk_id: produkList[1].id, stok_awal: 100 }, // Es Teh
    { produk_id: produkList[2].id, stok_awal: 30 }, // Nasi Goreng
    { produk_id: produkList[3].id, stok_awal: 30 }, // Mie Goreng
    { produk_id: produkList[4].id, stok_awal: 40 }, // Jus Jeruk
    { produk_id: produkList[5].id, stok_awal: 25 }, // Roti Bakar
    { produk_id: produkList[6].id, stok_awal: 50 }, // Pisang Goreng
  ];

  for (const data of stokData) {
    await prisma.stokHarian.upsert({
      where: {
        tanggal_produk_id: {
          tanggal: today,
          produk_id: data.produk_id,
        },
      },
      update: {},
      create: {
        tanggal: today,
        produk_id: data.produk_id,
        stok_awal: data.stok_awal,
        stok_terjual: 0,
        stok_sisa: data.stok_awal,
      },
    });
  }

  console.log(`✓ Created daily stock for ${today.toISOString().split("T")[0]}`);

  // 5. Create sample alternative values
  console.log("Creating sample alternative values...");

  // Contoh nilai alternatif (disesuaikan dengan kriteria)
  const nilaiData = [
    // Kopi Susu - best seller
    { produk_id: produkList[0].id, kriteria_id: kriteriaList[0].id, nilai: 45 }, // Jumlah Penjualan
    {
      produk_id: produkList[0].id,
      kriteria_id: kriteriaList[1].id,
      nilai: 675000,
    }, // Pendapatan
    { produk_id: produkList[0].id, kriteria_id: kriteriaList[2].id, nilai: 5 }, // Stok Sisa
    {
      produk_id: produkList[0].id,
      kriteria_id: kriteriaList[3].id,
      nilai: 0.4,
    }, // Margin

    // Es Teh - good seller
    { produk_id: produkList[1].id, kriteria_id: kriteriaList[0].id, nilai: 80 },
    {
      produk_id: produkList[1].id,
      kriteria_id: kriteriaList[1].id,
      nilai: 640000,
    },
    { produk_id: produkList[1].id, kriteria_id: kriteriaList[2].id, nilai: 20 },
    {
      produk_id: produkList[1].id,
      kriteria_id: kriteriaList[3].id,
      nilai: 0.3,
    },

    // Nasi Goreng - medium seller
    { produk_id: produkList[2].id, kriteria_id: kriteriaList[0].id, nilai: 25 },
    {
      produk_id: produkList[2].id,
      kriteria_id: kriteriaList[1].id,
      nilai: 500000,
    },
    { produk_id: produkList[2].id, kriteria_id: kriteriaList[2].id, nilai: 5 },
    {
      produk_id: produkList[2].id,
      kriteria_id: kriteriaList[3].id,
      nilai: 0.35,
    },

    // Mie Goreng - medium seller
    { produk_id: produkList[3].id, kriteria_id: kriteriaList[0].id, nilai: 20 },
    {
      produk_id: produkList[3].id,
      kriteria_id: kriteriaList[1].id,
      nilai: 360000,
    },
    { produk_id: produkList[3].id, kriteria_id: kriteriaList[2].id, nilai: 10 },
    {
      produk_id: produkList[3].id,
      kriteria_id: kriteriaList[3].id,
      nilai: 0.35,
    },

    // Jus Jeruk - low seller
    { produk_id: produkList[4].id, kriteria_id: kriteriaList[0].id, nilai: 15 },
    {
      produk_id: produkList[4].id,
      kriteria_id: kriteriaList[1].id,
      nilai: 180000,
    },
    { produk_id: produkList[4].id, kriteria_id: kriteriaList[2].id, nilai: 25 },
    {
      produk_id: produkList[4].id,
      kriteria_id: kriteriaList[3].id,
      nilai: 0.3,
    },

    // Roti Bakar - low seller
    { produk_id: produkList[5].id, kriteria_id: kriteriaList[0].id, nilai: 10 },
    {
      produk_id: produkList[5].id,
      kriteria_id: kriteriaList[1].id,
      nilai: 100000,
    },
    { produk_id: produkList[5].id, kriteria_id: kriteriaList[2].id, nilai: 15 },
    {
      produk_id: produkList[5].id,
      kriteria_id: kriteriaList[3].id,
      nilai: 0.25,
    },

    // Pisang Goreng - lowest seller
    { produk_id: produkList[6].id, kriteria_id: kriteriaList[0].id, nilai: 8 },
    {
      produk_id: produkList[6].id,
      kriteria_id: kriteriaList[1].id,
      nilai: 64000,
    },
    { produk_id: produkList[6].id, kriteria_id: kriteriaList[2].id, nilai: 42 },
    {
      produk_id: produkList[6].id,
      kriteria_id: kriteriaList[3].id,
      nilai: 0.2,
    },
  ];

  for (const data of nilaiData) {
    await prisma.nilaiAlternatif.upsert({
      where: {
        tanggal_produk_id_kriteria_id: {
          tanggal: today,
          produk_id: data.produk_id,
          kriteria_id: data.kriteria_id,
        },
      },
      update: {},
      create: {
        tanggal: today,
        produk_id: data.produk_id,
        kriteria_id: data.kriteria_id,
        nilai: new Decimal(data.nilai),
      },
    });
  }

  console.log(`✓ Created sample alternative values`);

  console.log("✅ Seeding completed!");
  console.log("");
  console.log("📝 Demo Login Credentials:");
  console.log("   Pemilik: pemilik@example.com / password123");
  console.log("   Staf: staf@example.com / password123");
  console.log("");
  console.log(
    "⚠️  Note: Run `npx tsx prisma/seed-users.ts` while server is running to create demo users.",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
