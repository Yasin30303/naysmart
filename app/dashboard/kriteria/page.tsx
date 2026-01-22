"use client";

/**
 * Halaman Master Data Kriteria - READ ONLY
 * Kriteria sudah dikunci/fixed dan tidak dapat diubah oleh pengguna
 * Total bobot = 1.0000
 */

import { trpc } from "@/lib/trpc/client";
import { Lock, Info, CheckCircle } from "lucide-react";

export default function KriteriaPage() {
  // Query data kriteria
  const { data: kriteriaList, isLoading } = trpc.kriteria.list.useQuery();
  const { data: bobotInfo } = trpc.kriteria.getTotalBobot.useQuery();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-6 h-6 text-gray-500" />
              Master Data Kriteria
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Kriteria penilaian SMART (sudah dikunci/fixed)
            </p>
          </div>
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Mode Read-Only</span>
          </div>
        </div>

        {/* Alert Total Bobot */}
        {bobotInfo && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              bobotInfo.isValid
                ? "bg-green-50 border-green-200"
                : "bg-yellow-50 border-yellow-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle
                className={`w-5 h-5 ${
                  bobotInfo.isValid ? "text-green-600" : "text-yellow-600"
                }`}
              />
              <div>
                <p className="font-semibold">
                  Total Bobot: {bobotInfo.total.toFixed(4)}
                </p>
                <p className="text-sm">
                  {bobotInfo.isValid
                    ? "Total bobot sudah valid (= 1.0000)"
                    : "Total bobot harus = 1.0000 untuk perhitungan SMART"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabel Kriteria */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Loading...
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    No
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Nama Kriteria
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Bobot
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Tipe
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Sumber Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {!kriteriaList || kriteriaList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      Belum ada data kriteria. Jalankan seed untuk menginisialisasi kriteria.
                    </td>
                  </tr>
                ) : (
                  kriteriaList.map((kriteria, index) => {
                    // Map kriteria name to data source description
                    const getDataSource = (nama: string) => {
                      const namaLower = nama.toLowerCase();
                      if (namaLower === "stok terjual") return "stok_harian.stok_terjual";
                      if (namaLower === "keuntungan") return "(harga - harga_awal) × stok_terjual";
                      if (namaLower === "sisa produk") return "stok_harian.stok_sisa";
                      if (namaLower === "harga") return "produk.harga";
                      if (namaLower === "harga awal") return "produk.harga_awal";
                      if (namaLower === "stok awal") return "stok_harian.stok_awal";
                      if (namaLower === "omzet") return "stok_terjual × harga";
                      if (namaLower === "hari penjualan") return "Jumlah hari dengan transaksi";
                      return "Auto-calculated";
                    };

                    return (
                      <tr
                        key={kriteria.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4 font-medium">
                          {kriteria.nama_kriteria}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {parseFloat(kriteria.bobot.toString()).toFixed(4)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              kriteria.tipe === "benefit"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {kriteria.tipe === "benefit" ? "Benefit ↑" : "Cost ↓"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                          {getDataSource(kriteria.nama_kriteria)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-blue-800 mb-2">
                Informasi Kriteria:
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  • <strong>Kriteria sudah dikunci</strong> dan tidak dapat diubah untuk menjaga konsistensi analisis
                </li>
                <li>
                  • <strong>Benefit (↑):</strong> Nilai semakin tinggi semakin baik
                </li>
                <li>
                  • <strong>Cost (↓):</strong> Nilai semakin rendah semakin baik
                </li>
                <li>
                  • Nilai alternatif dihitung otomatis dari data Stok Harian dan Produk
                </li>
                <li>
                  • Pastikan data <strong>Harga Awal</strong> sudah diinput di menu Produk
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Rumus Perhitungan */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm text-gray-700 mb-3">
            Rumus Perhitungan Nilai:
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-800">1. Stok Terjual:</span>
                <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">stok_harian.stok_terjual</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-800">2. Keuntungan:</span>
                <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">(harga - harga_awal) × stok_terjual</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-800">3. Sisa Produk:</span>
                <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">stok_harian.stok_sisa</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-800">4. Harga:</span>
                <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">produk.harga</code>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-800">5. Harga Awal:</span>
                <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">produk.harga_awal</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-800">6. Stok Awal:</span>
                <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">stok_harian.stok_awal</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-800">7. Omzet:</span>
                <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">stok_terjual × harga</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-800">8. Hari Penjualan:</span>
                <code className="bg-gray-200 px-2 py-0.5 rounded text-xs">count(distinct tanggal_penjualan)</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
