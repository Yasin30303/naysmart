"use client";

/**
 * Halaman Input Nilai Alternatif
 * Pemilik input nilai setiap kriteria untuk setiap produk
 * Data ini yang akan digunakan untuk perhitungan SMART
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function NilaiAlternatifPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [nilaiData, setNilaiData] = useState<
    Record<string, Record<string, string>>
  >({}); // produk_id -> kriteria_id -> nilai

  // Queries
  const { data: produkList } = trpc.produk.list.useQuery();
  const { data: kriteriaList } = trpc.kriteria.list.useQuery();
  const { data: nilaiAlternatif, refetch } =
    trpc.smart.getNilaiAlternatif.useQuery(
      { tanggal: new Date(selectedDate) },
      { enabled: !!selectedDate },
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
    if (nilaiAlternatif) {
      const dataMap: Record<string, Record<string, string>> = {};
      nilaiAlternatif.forEach((nilai) => {
        if (!dataMap[nilai.produk_id]) {
          dataMap[nilai.produk_id] = {};
        }
        dataMap[nilai.produk_id][nilai.kriteria_id] = nilai.nilai.toString();
      });
      setNilaiData(dataMap);
    } else {
      setNilaiData({});
    }
  }, [nilaiAlternatif]);

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
        tanggal: new Date(selectedDate),
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

          {/* Date Picker */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="tanggal">Pilih Tanggal</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="tanggal"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={bulkInputMutation.isPending}
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {bulkInputMutation.isPending ? "Menyimpan..." : "Simpan Semua"}
            </Button>
          </div>

          {/* Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Petunjuk:</strong> Input nilai untuk setiap kriteria pada
              setiap produk. Nilai dapat berupa angka desimal. Pastikan semua
              kolom terisi sebelum menyimpan.
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
