// SMART (Simple Multi Attribute Rating Technique) Business Logic
// Implementasi algoritma SMART untuk ranking produk

import { prisma } from "./prisma";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Interface untuk data alternatif (produk) dengan nilai kriteria
 */
interface AlternatifData {
  produk_id: string;
  nama_produk: string;
  kriteria: {
    kriteria_id: string;
    nama_kriteria: string;
    bobot: number;
    tipe: "benefit" | "cost";
    nilai: number;
  }[];
}

/**
 * Interface untuk hasil normalisasi
 */
interface NormalisasiResult {
  produk_id: string;
  kriteria_id: string;
  nilai_asli: number;
  nilai_normalisasi: number;
}

/**
 * Interface untuk hasil SMART
 */
interface SMARTResult {
  produk_id: string;
  nama_produk: string;
  skor_akhir: number;
  ranking: number;
  rekomendasi: string;
}

/**
 * STEP 1: Mengambil data produk dan nilai kriteria untuk tanggal tertentu
 */
async function getAlternatifData(tanggal: Date): Promise<AlternatifData[]> {
  const nilaiAlternatif = await prisma.nilaiAlternatif.findMany({
    where: { tanggal },
    include: {
      produk: true,
      kriteria: true,
    },
  });

  // Grouping by produk
  const produkMap = new Map<string, AlternatifData>();

  for (const nilai of nilaiAlternatif) {
    if (!produkMap.has(nilai.produk_id)) {
      produkMap.set(nilai.produk_id, {
        produk_id: nilai.produk_id,
        nama_produk: nilai.produk.nama_produk,
        kriteria: [],
      });
    }

    produkMap.get(nilai.produk_id)!.kriteria.push({
      kriteria_id: nilai.kriteria_id,
      nama_kriteria: nilai.kriteria.nama_kriteria,
      bobot: nilai.kriteria.bobot.toNumber(),
      tipe: nilai.kriteria.tipe as "benefit" | "cost",
      nilai: nilai.nilai.toNumber(),
    });
  }

  return Array.from(produkMap.values());
}

/**
 * STEP 2: Normalisasi nilai berdasarkan tipe kriteria
 *
 * Untuk BENEFIT (semakin besar semakin baik):
 * Normalisasi = (nilai - min) / (max - min)
 *
 * Untuk COST (semakin kecil semakin baik):
 * Normalisasi = (max - nilai) / (max - min)
 */
function normalisasiNilai(
  alternatifData: AlternatifData[],
): NormalisasiResult[] {
  const results: NormalisasiResult[] = [];

  // Dapatkan semua kriteria unik
  const kriteriaSet = new Set<string>();
  alternatifData.forEach((alt) => {
    alt.kriteria.forEach((k) => kriteriaSet.add(k.kriteria_id));
  });

  // Normalisasi per kriteria
  kriteriaSet.forEach((kriteria_id) => {
    const nilaiPerKriteria: {
      produk_id: string;
      nilai: number;
      tipe: "benefit" | "cost";
    }[] = [];

    // Kumpulkan semua nilai untuk kriteria ini
    alternatifData.forEach((alt) => {
      const kriteria = alt.kriteria.find((k) => k.kriteria_id === kriteria_id);
      if (kriteria) {
        nilaiPerKriteria.push({
          produk_id: alt.produk_id,
          nilai: kriteria.nilai,
          tipe: kriteria.tipe,
        });
      }
    });

    if (nilaiPerKriteria.length === 0) return;

    // Hitung min dan max
    const nilaiArray = nilaiPerKriteria.map((n) => n.nilai);
    const min = Math.min(...nilaiArray);
    const max = Math.max(...nilaiArray);
    const range = max - min;

    // Normalisasi
    nilaiPerKriteria.forEach((item) => {
      let nilai_normalisasi = 0;

      if (range === 0) {
        // Jika semua nilai sama, normalisasi = 1
        nilai_normalisasi = 1;
      } else {
        if (item.tipe === "benefit") {
          // Benefit: semakin besar semakin baik
          nilai_normalisasi = (item.nilai - min) / range;
        } else {
          // Cost: semakin kecil semakin baik
          nilai_normalisasi = (max - item.nilai) / range;
        }
      }

      results.push({
        produk_id: item.produk_id,
        kriteria_id,
        nilai_asli: item.nilai,
        nilai_normalisasi,
      });
    });
  });

  return results;
}

/**
 * STEP 3: Hitung skor akhir dengan pembobotan
 * Skor = Σ (bobot × nilai_normalisasi)
 */
function hitungSkorAkhir(
  alternatifData: AlternatifData[],
  normalisasi: NormalisasiResult[],
): { produk_id: string; nama_produk: string; skor_akhir: number }[] {
  return alternatifData.map((alt) => {
    let skor_akhir = 0;

    alt.kriteria.forEach((kriteria) => {
      const norm = normalisasi.find(
        (n) =>
          n.produk_id === alt.produk_id &&
          n.kriteria_id === kriteria.kriteria_id,
      );

      if (norm) {
        skor_akhir += kriteria.bobot * norm.nilai_normalisasi;
      }
    });

    return {
      produk_id: alt.produk_id,
      nama_produk: alt.nama_produk,
      skor_akhir,
    };
  });
}

/**
 * STEP 4: Generate ranking dan rekomendasi
 * Ranking: 1 = terbaik (skor tertinggi)
 *
 * Rekomendasi berdasarkan kuartil:
 * - Q4 (Top 25%): "tambah" - produk paling laku, tambah stok
 * - Q3 (25-50%): "tetap" - produk cukup laku, pertahankan
 * - Q2 (50-75%): "kurangi" - produk kurang laku, kurangi stok
 * - Q1 (Bottom 25%): "hentikan" - produk tidak laku, pertimbangkan hentikan
 */
function generateRankingDanRekomendasi(
  skorData: { produk_id: string; nama_produk: string; skor_akhir: number }[],
): SMARTResult[] {
  // Sort descending (skor tertinggi = ranking 1)
  const sorted = [...skorData].sort((a, b) => b.skor_akhir - a.skor_akhir);

  const totalProduk = sorted.length;
  const results: SMARTResult[] = [];

  sorted.forEach((item, index) => {
    const ranking = index + 1;
    const percentile = (ranking / totalProduk) * 100;

    let rekomendasi: string;
    if (percentile <= 25) {
      rekomendasi = "tambah";
    } else if (percentile <= 50) {
      rekomendasi = "tetap";
    } else if (percentile <= 75) {
      rekomendasi = "kurangi";
    } else {
      rekomendasi = "hentikan";
    }

    results.push({
      produk_id: item.produk_id,
      nama_produk: item.nama_produk,
      skor_akhir: item.skor_akhir,
      ranking,
      rekomendasi,
    });
  });

  return results;
}

/**
 * MAIN FUNCTION: Eksekusi perhitungan SMART lengkap
 *
 * Flow:
 * 1. Ambil data alternatif (produk + nilai kriteria)
 * 2. Normalisasi nilai berdasarkan tipe kriteria
 * 3. Hitung skor akhir dengan bobot
 * 4. Generate ranking dan rekomendasi
 * 5. Simpan hasil ke database
 */
export async function hitungSMART(tanggal: Date): Promise<SMARTResult[]> {
  // Validasi: pastikan ada kriteria
  const kriteriaCount = await prisma.kriteria.count();
  if (kriteriaCount === 0) {
    throw new Error("Belum ada kriteria yang didefinisikan");
  }

  // Validasi: pastikan total bobot = 1
  const kriteria = await prisma.kriteria.findMany();
  const totalBobot = kriteria.reduce((sum, k) => sum + k.bobot.toNumber(), 0);
  if (Math.abs(totalBobot - 1) > 0.0001) {
    throw new Error(
      `Total bobot kriteria harus = 1.0000, saat ini: ${totalBobot}`,
    );
  }

  // STEP 1: Ambil data alternatif
  const alternatifData = await getAlternatifData(tanggal);

  if (alternatifData.length === 0) {
    throw new Error("Tidak ada data nilai alternatif untuk tanggal ini");
  }

  // STEP 2: Normalisasi
  const normalisasi = normalisasiNilai(alternatifData);

  // STEP 3: Hitung skor
  const skorData = hitungSkorAkhir(alternatifData, normalisasi);

  // STEP 4: Ranking dan rekomendasi
  const results = generateRankingDanRekomendasi(skorData);

  // STEP 5: Simpan ke database (hapus hasil lama untuk tanggal ini)
  await prisma.hasilSMART.deleteMany({
    where: { tanggal },
  });

  await prisma.hasilSMART.createMany({
    data: results.map((r) => ({
      tanggal,
      produk_id: r.produk_id,
      skor_akhir: new Decimal(r.skor_akhir),
      ranking: r.ranking,
      rekomendasi: r.rekomendasi,
    })),
  });

  return results;
}

/**
 * Fungsi helper: Ambil hasil SMART untuk tanggal tertentu
 */
export async function getHasilSMART(tanggal: Date) {
  return prisma.hasilSMART.findMany({
    where: { tanggal },
    include: {
      produk: true,
    },
    orderBy: {
      ranking: "asc",
    },
  });
}
