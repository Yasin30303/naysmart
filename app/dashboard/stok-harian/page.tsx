"use client";

/**
 * Halaman Input Stok Harian
 * Pemilik input stok awal setiap hari
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { getTodayString, parseToUTCDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Calendar, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function StokHarianPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [stokInputs, setStokInputs] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Queries
  const { data: produkList } = trpc.produk.list.useQuery();
  const { data: stokList, refetch } = trpc.stokHarian.listByDate.useQuery(
    { tanggal: parseToUTCDate(selectedDate) },
    { enabled: !!selectedDate },
  );

  // Initialize inputs when stokList or produkList changes
  useEffect(() => {
    if (produkList) {
      const stokMap = new Map(stokList?.map((s) => [s.produk_id, s]) || []);
      const initialInputs: Record<string, number> = {};
      produkList.forEach((produk) => {
        const existingStok = stokMap.get(produk.id);
        initialInputs[produk.id] = existingStok?.stok_awal ?? 0;
      });
      setStokInputs(initialInputs);
      setHasChanges(false);
    }
  }, [produkList, stokList, selectedDate]);

  // Mutation for bulk save
  const bulkUpsertMutation = trpc.stokHarian.bulkUpsert.useMutation({
    onSuccess: () => {
      refetch();
      setHasChanges(false);
      alert("Semua stok berhasil disimpan!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleInputChange = (produk_id: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setStokInputs({ ...stokInputs, [produk_id]: numValue });
    setHasChanges(true);
  };

  const handleSaveAll = () => {
    if (!produkList || produkList.length === 0) {
      alert("Tidak ada produk untuk disimpan");
      return;
    }

    const items = produkList.map((produk) => ({
      produk_id: produk.id,
      stok_awal: stokInputs[produk.id] ?? 0,
    }));

    bulkUpsertMutation.mutate({
      tanggal: parseToUTCDate(selectedDate),
      items,
    });
  };

  // Create map of existing stock for display
  const stokMap = new Map(stokList?.map((s) => [s.produk_id, s]) || []);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Input Stok Harian
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Input stok awal untuk setiap produk per hari
            </p>
          </div>

          {/* Date Picker */}
          <div className="mb-6 flex items-center gap-4">
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
            <div className="pt-6">
              <p className="text-sm text-gray-600">
                <strong>
                  {format(parseToUTCDate(selectedDate), "dd MMMM yyyy")}
                </strong>
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Catatan:</strong> Input stok awal di pagi hari sebelum
              transaksi penjualan. Stok terjual akan update otomatis saat ada
              transaksi. Isi semua stok lalu klik &quot;Simpan Semua&quot; untuk
              menyimpan sekaligus.
            </p>
          </div>

          {/* Save All Button */}
          <div className="mb-4 flex justify-end">
            <Button
              onClick={handleSaveAll}
              disabled={
                bulkUpsertMutation.isPending ||
                !produkList ||
                produkList.length === 0
              }
              className="flex items-center gap-2"
            >
              {bulkUpsertMutation.isPending ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Semua
                  {hasChanges && (
                    <span className="ml-1 text-yellow-300">●</span>
                  )}
                </>
              )}
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    No
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Nama Produk
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Stok Awal
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Stok Terjual
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Stok Sisa
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {!produkList || produkList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      Belum ada produk. Tambahkan produk terlebih dahulu.
                    </td>
                  </tr>
                ) : (
                  produkList.map((produk, index) => {
                    const stok = stokMap.get(produk.id);
                    const inputValue = stokInputs[produk.id] ?? 0;

                    return (
                      <tr
                        key={produk.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4 font-medium">
                          {produk.nama_produk}
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            type="number"
                            min="0"
                            value={inputValue}
                            onChange={(e) =>
                              handleInputChange(produk.id, e.target.value)
                            }
                            className="w-24"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-red-600 font-medium">
                            {stok?.stok_terjual ?? 0}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-medium ${
                              stok && stok.stok_sisa < 10
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {stok?.stok_sisa ?? "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {stok ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              Tersimpan
                            </span>
                          ) : (
                            <span className="text-yellow-600 text-sm">
                              Belum diinput
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {stokList && stokList.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Total Stok Awal</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stokList.reduce((sum, s) => sum + s.stok_awal, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Terjual</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stokList.reduce((sum, s) => sum + s.stok_terjual, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Sisa</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stokList.reduce((sum, s) => sum + s.stok_sisa, 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
