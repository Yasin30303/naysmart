"use client";

/**
 * Halaman Hasil Perhitungan SMART
 * Menampilkan ranking produk dan rekomendasi
 * Dapat diakses oleh Pemilik (untuk trigger perhitungan) dan Staf (read-only)
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { getTodayString, parseToUTCDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calculator, TrendingUp, TrendingDown, Minus, X } from "lucide-react";
import { format } from "date-fns";

export default function HasilSMARTPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // Get utils for query invalidation
  const utils = trpc.useUtils();

  // Queries
  const { data: hasilSMART, refetch } = trpc.smart.getHasil.useQuery(
    { tanggal: parseToUTCDate(selectedDate) },
    { enabled: !!selectedDate },
  );

  const { data: tanggalList } = trpc.smart.listTanggalHasil.useQuery();

  // Mutations
  const hitungMutation = trpc.smart.hitung.useMutation({
    onSuccess: () => {
      refetch();
      // Invalidate all SMART queries across the app
      utils.smart.getHasil.invalidate();
      utils.smart.listTanggalHasil.invalidate();
      alert("Perhitungan SMART berhasil!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleHitung = () => {
    if (
      confirm(
        `Hitung SMART untuk tanggal ${format(parseToUTCDate(selectedDate), "dd MMM yyyy")}?`,
      )
    ) {
      hitungMutation.mutate({ tanggal: parseToUTCDate(selectedDate) });
    }
  };

  const getRecommendationBadge = (rekomendasi: string) => {
    // Match new recommendation format based on score ranges
    if (rekomendasi.includes("ditambah")) {
      return {
        icon: <TrendingUp className="w-4 h-4" />,
        className: "bg-green-100 text-green-800 border border-green-300",
        text: rekomendasi,
      };
    } else if (rekomendasi.includes("tetap")) {
      return {
        icon: <Minus className="w-4 h-4" />,
        className: "bg-blue-100 text-blue-800 border border-blue-300",
        text: rekomendasi,
      };
    } else if (rekomendasi.includes("dikurangi")) {
      return {
        icon: <TrendingDown className="w-4 h-4" />,
        className: "bg-yellow-100 text-yellow-800 border border-yellow-300",
        text: rekomendasi,
      };
    } else if (
      rekomendasi.includes("Dihentikan") ||
      rekomendasi === "hentikan"
    ) {
      return {
        icon: <X className="w-4 h-4" />,
        className: "bg-red-100 text-red-800 border border-red-300",
        text: rekomendasi,
      };
    }
    // Fallback for legacy data
    switch (rekomendasi) {
      case "tambah":
        return {
          icon: <TrendingUp className="w-4 h-4" />,
          className: "bg-green-100 text-green-800",
          text: "Tambah Stok",
        };
      case "tetap":
        return {
          icon: <Minus className="w-4 h-4" />,
          className: "bg-blue-100 text-blue-800",
          text: "Pertahankan",
        };
      case "kurangi":
        return {
          icon: <TrendingDown className="w-4 h-4" />,
          className: "bg-yellow-100 text-yellow-800",
          text: "Kurangi Stok",
        };
      case "hentikan":
        return {
          icon: <X className="w-4 h-4" />,
          className: "bg-red-100 text-red-800",
          text: "Pertimbangkan Hentikan",
        };
      default:
        return {
          icon: null,
          className: "bg-gray-100 text-gray-800",
          text: rekomendasi,
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Hasil Perhitungan SMART
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ranking produk berdasarkan metode SMART
          </p>
        </div>

        {/* Filter & Action */}
        <div className="mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="tanggal">Pilih Tanggal</Label>
            <Input
              id="tanggal"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <Button onClick={handleHitung} disabled={hitungMutation.isPending}>
            <Calculator className="w-4 h-4 mr-2" />
            {hitungMutation.isPending ? "Menghitung..." : "Hitung SMART"}
          </Button>
        </div>

        {/* Tanggal yang Tersedia */}
        {tanggalList && tanggalList.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Tanggal yang sudah dihitung:
            </p>
            <div className="flex flex-wrap gap-2">
              {tanggalList.map((tanggal) => (
                <button
                  key={tanggal.toISOString()}
                  onClick={() =>
                    setSelectedDate(tanggal.toISOString().split("T")[0])
                  }
                  className={`px-3 py-1 rounded text-sm ${
                    selectedDate === tanggal.toISOString().split("T")[0]
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {format(tanggal, "dd MMM yyyy")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hasil SMART */}
        {!hasilSMART || hasilSMART.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calculator className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Belum ada hasil perhitungan</p>
            <p className="text-sm mt-2">
              Klik Hitung SMART untuk menghitung ranking produk
            </p>
          </div>
        ) : (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 font-medium">
                  Ditambah 20%
                </p>
                <p className="text-xs text-green-600 mb-1">Skor 0.80 - 1.00</p>
                <p className="text-2xl font-bold text-green-900">
                  {
                    hasilSMART.filter((h) => h.rekomendasi.includes("ditambah"))
                      .length
                  }
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700 font-medium">
                  Jumlah Tetap
                </p>
                <p className="text-xs text-blue-600 mb-1">Skor 0.50 - 0.79</p>
                <p className="text-2xl font-bold text-blue-900">
                  {
                    hasilSMART.filter((h) => h.rekomendasi.includes("tetap"))
                      .length
                  }
                </p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700 font-medium">
                  Dikurangi 20%
                </p>
                <p className="text-xs text-yellow-600 mb-1">Skor 0.15 - 0.49</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {
                    hasilSMART.filter((h) =>
                      h.rekomendasi.includes("dikurangi"),
                    ).length
                  }
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 font-medium">Dihentikan</p>
                <p className="text-xs text-red-600 mb-1">Skor ≤ 0.14</p>
                <p className="text-2xl font-bold text-red-900">
                  {
                    hasilSMART.filter(
                      (h) =>
                        h.rekomendasi.includes("Dihentikan") ||
                        h.rekomendasi === "hentikan",
                    ).length
                  }
                </p>
              </div>
            </div>

            {/* Tabel Hasil */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Ranking
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Nama Produk
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Skor Akhir
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Rekomendasi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hasilSMART.map((hasil) => {
                    const badge = getRecommendationBadge(hasil.rekomendasi);
                    return (
                      <tr
                        key={hasil.id}
                        className={`border-b border-gray-100 ${
                          hasil.ranking === 1
                            ? "bg-yellow-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {hasil.ranking === 1 && (
                              <span className="text-2xl">🏆</span>
                            )}
                            <span className="font-bold text-lg">
                              {hasil.ranking}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">
                            {hasil.produk.nama_produk}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono">
                            {parseFloat(hasil.skor_akhir.toString()).toFixed(6)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.className}`}
                          >
                            {badge.icon}
                            <span>{badge.text}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Keterangan */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">
                Interpretasi Rekomendasi (Berdasarkan Rentang Skor Akhir):
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-start gap-2 p-3 bg-white rounded border border-gray-200">
                  <div className="bg-green-100 text-green-800 p-1 rounded">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">
                      Skor 0.80 - 1.00
                    </p>
                    <p className="text-sm text-gray-700">
                      Dilanjutkan ditambah jumlah 20%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Produk sangat laku, tingkatkan stok 20%
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-white rounded border border-gray-200">
                  <div className="bg-blue-100 text-blue-800 p-1 rounded">
                    <Minus className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">
                      Skor 0.50 - 0.79
                    </p>
                    <p className="text-sm text-gray-700">
                      Dilanjutkan jumlah tetap
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Produk cukup laku, pertahankan stok
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-white rounded border border-gray-200">
                  <div className="bg-yellow-100 text-yellow-800 p-1 rounded">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-yellow-800">
                      Skor 0.15 - 0.49
                    </p>
                    <p className="text-sm text-gray-700">
                      Dilanjutkan dikurangi jumlah 20%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Produk kurang laku, kurangi stok 20%
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-white rounded border border-gray-200">
                  <div className="bg-red-100 text-red-800 p-1 rounded">
                    <X className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-red-800">Skor ≤ 0.14</p>
                    <p className="text-sm text-gray-700">Dihentikan</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Produk tidak laku, hentikan penjualan
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
