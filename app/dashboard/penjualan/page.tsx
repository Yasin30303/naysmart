"use client";

/**
 * Halaman Penjualan
 * Staf: Input transaksi baru
 * Pemilik: View semua transaksi
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSession, UserWithRole } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ShoppingCart, Calendar } from "lucide-react";

interface CartItem {
  produk_id: string;
  nama_produk: string;
  harga: number;
  jumlah: number;
  subtotal: number;
}

export default function PenjualanPage() {
  const { data: session } = useSession();
  const user = session?.user as unknown as UserWithRole | undefined;
  const userRole = user?.role || "staf";

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduk, setSelectedProduk] = useState("");
  const [jumlah, setJumlah] = useState("");

  // Queries
  const { data: produkList } = trpc.produk.list.useQuery();
  const { data: penjualanList, refetch } = trpc.penjualan.listByDate.useQuery(
    { tanggal: new Date(selectedDate) },
    { enabled: !!selectedDate },
  );
  const { data: stokList } = trpc.stokHarian.listByDate.useQuery(
    { tanggal: new Date(selectedDate) },
    { enabled: !!selectedDate },
  );

  // Mutation
  const createMutation = trpc.penjualan.create.useMutation({
    onSuccess: () => {
      refetch();
      setCart([]);
      alert("Transaksi berhasil disimpan!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleAddToCart = () => {
    if (!selectedProduk || !jumlah || parseInt(jumlah) <= 0) {
      alert("Pilih produk dan jumlah yang valid");
      return;
    }

    const produk = produkList?.find((p) => p.id === selectedProduk);
    if (!produk) return;

    const qty = parseInt(jumlah);
    const harga = parseFloat(produk.harga.toString());
    const subtotal = harga * qty;

    // Cek stok tersedia
    const stok = stokList?.find((s) => s.produk_id === selectedProduk);
    if (!stok) {
      alert("Stok untuk produk ini belum diinput hari ini");
      return;
    }

    // Hitung total qty di cart untuk produk ini
    const existingCartItem = cart.find(
      (item) => item.produk_id === selectedProduk,
    );
    const totalQtyInCart = existingCartItem ? existingCartItem.jumlah : 0;

    if (totalQtyInCart + qty > stok.stok_sisa) {
      alert(`Stok tidak mencukupi. Sisa stok: ${stok.stok_sisa}`);
      return;
    }

    // Update atau tambah ke cart
    if (existingCartItem) {
      setCart(
        cart.map((item) =>
          item.produk_id === selectedProduk
            ? {
                ...item,
                jumlah: item.jumlah + qty,
                subtotal: (item.jumlah + qty) * harga,
              }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          produk_id: selectedProduk,
          nama_produk: produk.nama_produk,
          harga,
          jumlah: qty,
          subtotal,
        },
      ]);
    }

    // Reset form
    setSelectedProduk("");
    setJumlah("");
  };

  const handleRemoveFromCart = (produk_id: string) => {
    setCart(cart.filter((item) => item.produk_id !== produk_id));
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Keranjang kosong");
      return;
    }

    if (confirm(`Proses transaksi dengan ${cart.length} item?`)) {
      createMutation.mutate({
        tanggal: new Date(selectedDate),
        items: cart.map((item) => ({
          produk_id: item.produk_id,
          jumlah: item.jumlah,
        })),
      });
    }
  };

  const totalBelanja = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Input (Kiri) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Transaksi Penjualan
              </h1>

              {/* Date Picker */}
              <div className="mb-6">
                <Label htmlFor="tanggal">Tanggal Transaksi</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="tanggal"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10"
                    disabled={userRole !== "staf"}
                  />
                </div>
              </div>

              {/* Add Product Form */}
              {userRole === "staf" && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold mb-4">Tambah Produk</h3>
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-3">
                      <Label htmlFor="produk">Produk</Label>
                      <select
                        id="produk"
                        value={selectedProduk}
                        onChange={(e) => setSelectedProduk(e.target.value)}
                        className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Pilih Produk</option>
                        {produkList?.map((produk) => {
                          const stok = stokList?.find(
                            (s) => s.produk_id === produk.id,
                          );
                          return (
                            <option key={produk.id} value={produk.id}>
                              {produk.nama_produk} - Rp{" "}
                              {parseFloat(
                                produk.harga.toString(),
                              ).toLocaleString("id-ID")}
                              {stok && ` (Stok: ${stok.stok_sisa})`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="jumlah">Jumlah</Label>
                      <Input
                        id="jumlah"
                        type="number"
                        min="1"
                        value={jumlah}
                        onChange={(e) => setJumlah(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddToCart} className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Cart */}
              {userRole === "staf" && (
                <div>
                  <h3 className="font-semibold mb-4">Keranjang Belanja</h3>
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Keranjang masih kosong</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div
                          key={item.produk_id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.nama_produk}</p>
                            <p className="text-sm text-gray-600">
                              {item.jumlah} x Rp{" "}
                              {item.harga.toLocaleString("id-ID")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-blue-600">
                              Rp {item.subtotal.toLocaleString("id-ID")}
                            </p>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleRemoveFromCart(item.produk_id)
                              }
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-semibold">Total:</span>
                          <span className="text-2xl font-bold text-blue-600">
                            Rp {totalBelanja.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <Button
                          onClick={handleCheckout}
                          className="w-full"
                          disabled={createMutation.isPending}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {createMutation.isPending
                            ? "Memproses..."
                            : "Proses Transaksi"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* History (Kanan) */}
          <div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold mb-4">
                Riwayat Hari Ini ({penjualanList?.length || 0})
              </h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {!penjualanList || penjualanList.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    Belum ada transaksi hari ini
                  </p>
                ) : (
                  penjualanList.map((transaksi) => (
                    <div
                      key={transaksi.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900">
                          {transaksi.user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaksi.createdAt).toLocaleTimeString(
                            "id-ID",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                      </div>
                      <div className="space-y-1 mb-2">
                        {transaksi.detail.map((detail) => (
                          <p key={detail.id} className="text-xs text-gray-600">
                            {detail.jumlah}x {detail.produk.nama_produk}
                          </p>
                        ))}
                      </div>
                      <p className="text-sm font-bold text-blue-600">
                        Rp{" "}
                        {parseFloat(transaksi.total.toString()).toLocaleString(
                          "id-ID",
                        )}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
