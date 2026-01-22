"use client";

/**
 * Halaman Master Data Produk
 * Hanya dapat diakses oleh Pemilik
 * Fitur: CRUD produk
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function ProdukPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama_produk: "",
    harga: "",
  });

  // Query data produk
  const { data: produkList, refetch } = trpc.produk.list.useQuery();

  // Mutations
  const createMutation = trpc.produk.create.useMutation({
    onSuccess: () => {
      refetch();
      resetForm();
      alert("Produk berhasil ditambahkan");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.produk.update.useMutation({
    onSuccess: () => {
      refetch();
      resetForm();
      alert("Produk berhasil diupdate");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.produk.delete.useMutation({
    onSuccess: () => {
      refetch();
      alert("Produk berhasil dihapus");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({ nama_produk: "", harga: "" });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const harga = parseFloat(formData.harga);
    if (isNaN(harga) || harga <= 0) {
      alert("Harga harus berupa angka positif");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        nama_produk: formData.nama_produk,
        harga,
      });
    } else {
      createMutation.mutate({
        nama_produk: formData.nama_produk,
        harga,
      });
    }
  };

  const handleEdit = (produk: { id: string; nama_produk: string; harga: { toString: () => string } }) => {
    setEditingId(produk.id);
    setFormData({
      nama_produk: produk.nama_produk,
      harga: produk.harga.toString(),
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string, nama: string) => {
    if (confirm(`Yakin ingin menghapus produk "${nama}"?`)) {
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
              Master Data Produk
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Kelola data produk untuk perhitungan SMART
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} disabled={isFormOpen}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Produk
          </Button>
        </div>

        {/* Form Input/Edit */}
        {isFormOpen && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              {editingId ? "Edit Produk" : "Tambah Produk Baru"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nama_produk">Nama Produk</Label>
                  <Input
                    id="nama_produk"
                    value={formData.nama_produk}
                    onChange={(e) =>
                      setFormData({ ...formData, nama_produk: e.target.value })
                    }
                    placeholder="Contoh: Kopi Susu"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="harga">Harga (Rp)</Label>
                  <Input
                    id="harga"
                    type="number"
                    step="0.01"
                    value={formData.harga}
                    onChange={(e) =>
                      setFormData({ ...formData, harga: e.target.value })
                    }
                    placeholder="15000"
                    required
                  />
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

        {/* Tabel Produk */}
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
                  Harga
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {!produkList || produkList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    Belum ada data produk. Klik Tambah Produk untuk memulai.
                  </td>
                </tr>
              ) : (
                produkList.map((produk, index) => (
                  <tr
                    key={produk.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">{index + 1}</td>
                    <td className="py-3 px-4 font-medium">
                      {produk.nama_produk}
                    </td>
                    <td className="py-3 px-4">
                      Rp{" "}
                      {parseFloat(produk.harga.toString()).toLocaleString(
                        "id-ID",
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(produk)}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleDelete(produk.id, produk.nama_produk)
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

        {produkList && produkList.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Total: {produkList.length} produk
          </div>
        )}
      </div>
    </div>
  );
}
