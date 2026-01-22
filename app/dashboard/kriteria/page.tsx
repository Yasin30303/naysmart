"use client";

/**
 * Halaman Master Data Kriteria
 * Hanya dapat diakses oleh Pemilik
 * Fitur: CRUD kriteria dengan validasi total bobot = 1
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";

export default function KriteriaPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama_kriteria: "",
    bobot: "",
    tipe: "benefit" as "benefit" | "cost",
  });

  // Query data kriteria
  const { data: kriteriaList, refetch } = trpc.kriteria.list.useQuery();
  const { data: bobotInfo } = trpc.kriteria.getTotalBobot.useQuery();

  // Mutations
  const createMutation = trpc.kriteria.create.useMutation({
    onSuccess: () => {
      refetch();
      resetForm();
      alert("Kriteria berhasil ditambahkan");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.kriteria.update.useMutation({
    onSuccess: () => {
      refetch();
      resetForm();
      alert("Kriteria berhasil diupdate");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.kriteria.delete.useMutation({
    onSuccess: () => {
      refetch();
      alert("Kriteria berhasil dihapus");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({ nama_kriteria: "", bobot: "", tipe: "benefit" });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const bobot = parseFloat(formData.bobot);
    if (isNaN(bobot) || bobot <= 0 || bobot > 1) {
      alert("Bobot harus antara 0 dan 1");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        nama_kriteria: formData.nama_kriteria,
        bobot,
        tipe: formData.tipe,
      });
    } else {
      createMutation.mutate({
        nama_kriteria: formData.nama_kriteria,
        bobot,
        tipe: formData.tipe,
      });
    }
  };

  const handleEdit = (kriteria: any) => {
    setEditingId(kriteria.id);
    setFormData({
      nama_kriteria: kriteria.nama_kriteria,
      bobot: kriteria.bobot.toString(),
      tipe: kriteria.tipe,
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus kriteria "${nama}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Master Data Kriteria
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Kelola kriteria penilaian untuk metode SMART
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} disabled={isFormOpen}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Kriteria
          </Button>
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
              <AlertCircle
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

        {/* Form Input/Edit */}
        {isFormOpen && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {editingId ? "Edit Kriteria" : "Tambah Kriteria Baru"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="nama_kriteria">Nama Kriteria</Label>
                  <Input
                    id="nama_kriteria"
                    value={formData.nama_kriteria}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nama_kriteria: e.target.value,
                      })
                    }
                    placeholder="Contoh: Jumlah Penjualan"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="bobot">Bobot (0-1)</Label>
                  <Input
                    id="bobot"
                    type="number"
                    step="0.0001"
                    max="1"
                    min="0"
                    value={formData.bobot}
                    onChange={(e) =>
                      setFormData({ ...formData, bobot: e.target.value })
                    }
                    placeholder="0.25"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tersisa:{" "}
                    {(
                      1 -
                      (bobotInfo?.total || 0) +
                      (editingId ? parseFloat(formData.bobot || "0") : 0)
                    ).toFixed(4)}
                  </p>
                </div>
                <div>
                  <Label htmlFor="tipe">Tipe</Label>
                  <select
                    id="tipe"
                    value={formData.tipe}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipe: e.target.value as "benefit" | "cost",
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    required
                  >
                    <option value="benefit">Benefit (↑ lebih baik)</option>
                    <option value="cost">Cost (↓ lebih baik)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {editingId ? "Update" : "Simpan"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tabel Kriteria */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
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
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {!kriteriaList || kriteriaList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    Belum ada data kriteria. Klik Tambah Kriteria untuk memulai.
                  </td>
                </tr>
              ) : (
                kriteriaList.map((kriteria, index) => (
                  <tr
                    key={kriteria.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4 font-medium">
                      {kriteria.nama_kriteria}
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(kriteria)}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleDelete(kriteria.id, kriteria.nama_kriteria)
                          }
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">
            Informasi:
          </h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              • <strong>Benefit:</strong> Nilai semakin tinggi semakin baik
              (contoh: Penjualan, Keuntungan)
            </li>
            <li>
              • <strong>Cost:</strong> Nilai semakin rendah semakin baik
              (contoh: Harga Beli, Stok Sisa)
            </li>
            <li>• Total bobot semua kriteria harus = 1.0000</li>
            <li>• Gunakan 4 digit desimal untuk presisi (contoh: 0.2500)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
