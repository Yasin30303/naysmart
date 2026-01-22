-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produk" (
    "id" TEXT NOT NULL,
    "nama_produk" TEXT NOT NULL,
    "harga" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kriteria" (
    "id" TEXT NOT NULL,
    "nama_kriteria" TEXT NOT NULL,
    "bobot" DECIMAL(5,4) NOT NULL,
    "tipe" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_harian" (
    "id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "produk_id" TEXT NOT NULL,
    "stok_awal" INTEGER NOT NULL,
    "stok_terjual" INTEGER NOT NULL DEFAULT 0,
    "stok_sisa" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stok_harian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penjualan" (
    "id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "user_id" TEXT NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "penjualan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detail_penjualan" (
    "id" TEXT NOT NULL,
    "penjualan_id" TEXT NOT NULL,
    "produk_id" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detail_penjualan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nilai_alternatif" (
    "id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "produk_id" TEXT NOT NULL,
    "kriteria_id" TEXT NOT NULL,
    "nilai" DECIMAL(12,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nilai_alternatif_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hasil_smart" (
    "id" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "produk_id" TEXT NOT NULL,
    "skor_akhir" DECIMAL(10,6) NOT NULL,
    "ranking" INTEGER NOT NULL,
    "rekomendasi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hasil_smart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "stok_harian_tanggal_idx" ON "stok_harian"("tanggal");

-- CreateIndex
CREATE INDEX "stok_harian_produk_id_idx" ON "stok_harian"("produk_id");

-- CreateIndex
CREATE UNIQUE INDEX "stok_harian_tanggal_produk_id_key" ON "stok_harian"("tanggal", "produk_id");

-- CreateIndex
CREATE INDEX "penjualan_tanggal_idx" ON "penjualan"("tanggal");

-- CreateIndex
CREATE INDEX "penjualan_user_id_idx" ON "penjualan"("user_id");

-- CreateIndex
CREATE INDEX "detail_penjualan_penjualan_id_idx" ON "detail_penjualan"("penjualan_id");

-- CreateIndex
CREATE INDEX "detail_penjualan_produk_id_idx" ON "detail_penjualan"("produk_id");

-- CreateIndex
CREATE INDEX "nilai_alternatif_tanggal_idx" ON "nilai_alternatif"("tanggal");

-- CreateIndex
CREATE INDEX "nilai_alternatif_produk_id_idx" ON "nilai_alternatif"("produk_id");

-- CreateIndex
CREATE INDEX "nilai_alternatif_kriteria_id_idx" ON "nilai_alternatif"("kriteria_id");

-- CreateIndex
CREATE UNIQUE INDEX "nilai_alternatif_tanggal_produk_id_kriteria_id_key" ON "nilai_alternatif"("tanggal", "produk_id", "kriteria_id");

-- CreateIndex
CREATE INDEX "hasil_smart_tanggal_idx" ON "hasil_smart"("tanggal");

-- CreateIndex
CREATE INDEX "hasil_smart_produk_id_idx" ON "hasil_smart"("produk_id");

-- CreateIndex
CREATE UNIQUE INDEX "hasil_smart_tanggal_produk_id_key" ON "hasil_smart"("tanggal", "produk_id");

-- AddForeignKey
ALTER TABLE "stok_harian" ADD CONSTRAINT "stok_harian_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penjualan" ADD CONSTRAINT "penjualan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_penjualan" ADD CONSTRAINT "detail_penjualan_penjualan_id_fkey" FOREIGN KEY ("penjualan_id") REFERENCES "penjualan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_penjualan" ADD CONSTRAINT "detail_penjualan_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_alternatif" ADD CONSTRAINT "nilai_alternatif_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nilai_alternatif" ADD CONSTRAINT "nilai_alternatif_kriteria_id_fkey" FOREIGN KEY ("kriteria_id") REFERENCES "kriteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_smart" ADD CONSTRAINT "hasil_smart_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
