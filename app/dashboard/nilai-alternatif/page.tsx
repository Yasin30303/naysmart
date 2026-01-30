"use client";

/**
 * Halaman Input Nilai Alternatif
 * Pemilik input nilai setiap kriteria untuk setiap produk
 * Data ini yang akan digunakan untuk perhitungan SMART
 * Fitur: Auto-load dari data penjualan & stok
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { getTodayString, parseToUTCDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Save,
  Calendar,
  RefreshCw,
  Zap,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function NilaiAlternatifPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [nilaiData, setNilaiData] = useState<
    Record<string, Record<string, string>>
  >({}); // produk_id -> kriteria_id -> nilai
  const [autoLoadStatus, setAutoLoadStatus] = useState<string | null>(null);

  // Queries
  const { data: produkList } = trpc.produk.list.useQuery();
  const { data: kriteriaList } = trpc.kriteria.list.useQuery();
  const { data: nilaiAlternatif, refetch } =
    trpc.smart.getNilaiAlternatif.useQuery(
      { tanggal: parseToUTCDate(selectedDate) },
      { enabled: !!selectedDate },
    );

  // Auto-calculate query
  const { refetch: refetchAuto } = trpc.smart.getAutoCalculatedValues.useQuery(
    { tanggal: parseToUTCDate(selectedDate) },
    { enabled: false }, // Manual trigger only
  );

  // Mutation
  const bulkInputMutation = trpc.smart.bulkInputNilaiAlternatif.useMutation({
    onSuccess: () => {
      refetch();
      alert("Nilai alternatif berhasil disimpan!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // Load existing data
  useEffect(() => {
    if (nilaiAlternatif && nilaiAlternatif.length > 0) {
      const dataMap: Record<string, Record<string, string>> = {};
      nilaiAlternatif.forEach((nilai) => {
        if (!dataMap[nilai.produk_id]) {
          dataMap[nilai.produk_id] = {};
        }
        dataMap[nilai.produk_id][nilai.kriteria_id] = nilai.nilai.toString();
      });
      setNilaiData(dataMap);
      setAutoLoadStatus(null);
    } else {
      setNilaiData({});
    }
  }, [nilaiAlternatif]);

  // Handle auto-load values
  const handleAutoLoad = async () => {
    setAutoLoadStatus("loading");
    const result = await refetchAuto();

    if (result.data) {
      const { values, summary } = result.data;

      // Convert to string format for input fields
      const dataMap: Record<string, Record<string, string>> = {};
      for (const [produkId, kriteriaValues] of Object.entries(values)) {
        dataMap[produkId] = {};
        for (const [kriteriaId, nilai] of Object.entries(kriteriaValues)) {
          dataMap[produkId][kriteriaId] = nilai.toString();
        }
      }

      setNilaiData(dataMap);

      // Show status
      if (!summary.hasStokData && !summary.hasPenjualanData) {
        setAutoLoadStatus("no-data");
      } else if (!summary.hasStokData) {
        setAutoLoadStatus("no-stok");
      } else if (!summary.hasPenjualanData) {
        setAutoLoadStatus("no-penjualan");
      } else {
        setAutoLoadStatus("success");
      }
    } else {
      setAutoLoadStatus("error");
    }
  };

  const handleInputChange = (
    produk_id: string,
    kriteria_id: string,
    value: string,
  ) => {
    setNilaiData({
      ...nilaiData,
      [produk_id]: {
        ...(nilaiData[produk_id] || {}),
        [kriteria_id]: value,
      },
    });
  };

  const handleSave = () => {
    if (!produkList || !kriteriaList) return;

    // Validasi: semua produk harus punya nilai untuk semua kriteria
    const dataArray: Array<{
      produk_id: string;
      kriteria_id: string;
      nilai: number;
    }> = [];

    for (const produk of produkList) {
      for (const kriteria of kriteriaList) {
        const nilai = nilaiData[produk.id]?.[kriteria.id];
        if (!nilai || nilai === "") {
          alert(
            `Nilai untuk ${produk.nama_produk} - ${kriteria.nama_kriteria} belum diisi`,
          );
          return;
        }

        const numNilai = parseFloat(nilai);
        if (isNaN(numNilai) || numNilai < 0) {
          alert(
            `Nilai untuk ${produk.nama_produk} - ${kriteria.nama_kriteria} tidak valid`,
          );
          return;
        }

        dataArray.push({
          produk_id: produk.id,
          kriteria_id: kriteria.id,
          nilai: numNilai,
        });
      }
    }

    if (confirm("Simpan semua nilai alternatif?")) {
      bulkInputMutation.mutate({
        tanggal: parseToUTCDate(selectedDate),
        data: dataArray,
      });
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Input Nilai Alternatif
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Tentukan nilai setiap kriteria untuk setiap produk
            </p>
          </div>

          {/* Date Picker & Actions */}
          <div className="mb-6 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] max-w-xs">
              <Label htmlFor="tanggal">Pilih Tanggal</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="tanggal"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setAutoLoadStatus(null);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              onClick={handleAutoLoad}
              variant="outline"
              className="bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <Zap className="w-4 h-4 mr-2" />
              Auto-Load dari Data
            </Button>

            <Button onClick={handleSave} disabled={bulkInputMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {bulkInputMutation.isPending ? "Menyimpan..." : "Simpan Semua"}
            </Button>
          </div>

          {/* Auto-Load Status */}
          {autoLoadStatus && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                autoLoadStatus === "success"
                  ? "bg-green-50 border border-green-200"
                  : autoLoadStatus === "loading"
                    ? "bg-blue-50 border border-blue-200"
                    : autoLoadStatus === "error"
                      ? "bg-red-50 border border-red-200"
                      : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              {autoLoadStatus === "success" && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">
                      Data berhasil dimuat!
                    </p>
                    <p className="text-sm text-green-700">
                      Nilai kriteria telah dihitung dari data penjualan dan
                      stok. Anda dapat mengedit jika perlu.
                    </p>
                  </div>
                </>
              )}
              {autoLoadStatus === "loading" && (
                <>
                  <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5 animate-spin" />
                  <p className="font-medium text-blue-800">Memuat data...</p>
                </>
              )}
              {autoLoadStatus === "no-data" && (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">
                      Tidak ada data untuk tanggal ini
                    </p>
                    <p className="text-sm text-yellow-700">
                      Pastikan sudah ada data stok harian dan penjualan untuk
                      tanggal {selectedDate}
                    </p>
                  </div>
                </>
              )}
              {autoLoadStatus === "no-stok" && (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">
                      Data stok tidak ditemukan
                    </p>
                    <p className="text-sm text-yellow-700">
                      Nilai penjualan dimuat, tapi stok sisa bernilai 0.
                      Tambahkan data stok harian terlebih dahulu.
                    </p>
                  </div>
                </>
              )}
              {autoLoadStatus === "no-penjualan" && (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">
                      Data penjualan tidak ditemukan
                    </p>
                    <p className="text-sm text-yellow-700">
                      Nilai stok dimuat, tapi penjualan bernilai 0. Tambahkan
                      transaksi penjualan terlebih dahulu.
                    </p>
                  </div>
                </>
              )}
              {autoLoadStatus === "error" && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="font-medium text-red-800">
                    Gagal memuat data. Silakan coba lagi.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Petunjuk:</strong> Klik{" "}
              <strong>&quot;Auto-Load dari Data&quot;</strong> untuk mengisi
              nilai otomatis dari data penjualan dan stok. Anda dapat mengedit
              nilai secara manual jika diperlukan. Pastikan semua kolom terisi
              sebelum menyimpan.
            </p>
          </div>

          {/* Table */}
          {!produkList ||
          produkList.length === 0 ||
          !kriteriaList ||
          kriteriaList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium">Data tidak lengkap</p>
              <p className="text-sm mt-2">
                Pastikan sudah ada produk dan kriteria sebelum input nilai
                alternatif
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 bg-gray-50">
                      Produk
                    </th>
                    {kriteriaList.map((kriteria) => (
                      <th
                        key={kriteria.id}
                        className="text-center py-3 px-4 font-semibold text-gray-700 bg-gray-50 border-l border-gray-200"
                      >
                        <div>{kriteria.nama_kriteria}</div>
                        <div className="text-xs font-normal text-gray-500 mt-1">
                          Bobot:{" "}
                          {parseFloat(kriteria.bobot.toString()).toFixed(4)}
                        </div>
                        <div className="text-xs font-normal">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              kriteria.tipe === "benefit"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {kriteria.tipe === "benefit"
                              ? "↑ Benefit"
                              : "↓ Cost"}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {produkList.map((produk, index) => (
                    <tr
                      key={produk.id}
                      className={`border-b border-gray-100 ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="py-3 px-4 font-medium">
                        {produk.nama_produk}
                      </td>
                      {kriteriaList.map((kriteria) => (
                        <td
                          key={kriteria.id}
                          className="py-3 px-4 border-l border-gray-200"
                        >
                          <Input
                            type="number"
                            step="0.01"
                            value={nilaiData[produk.id]?.[kriteria.id] || ""}
                            onChange={(e) =>
                              handleInputChange(
                                produk.id,
                                kriteria.id,
                                e.target.value,
                              )
                            }
                            placeholder="0.00"
                            className="text-center"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Kriteria Legend */}
          {kriteriaList && kriteriaList.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">
                Penjelasan Kriteria:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {kriteriaList.map((kriteria) => (
                  <div key={kriteria.id} className="flex items-start gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        kriteria.tipe === "benefit"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {kriteria.tipe === "benefit" ? "↑" : "↓"}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {kriteria.nama_kriteria}
                      </p>
                      <p className="text-xs text-gray-600">
                        {kriteria.tipe === "benefit"
                          ? "Semakin tinggi semakin baik"
                          : "Semakin rendah semakin baik"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
