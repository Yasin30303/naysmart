"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSession, UserWithRole } from "@/lib/auth-client";
import { Package, ListChecks, ShoppingCart, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user as unknown as UserWithRole | undefined;
  const userRole = user?.role || "staf";

  // Stabilize today's date to prevent infinite re-renders
  const today = useMemo(() => {
    const now = new Date();
    // Reset to start of day to ensure consistent date object
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // Queries untuk statistik
  const { data: produkList } = trpc.produk.list.useQuery();
  const { data: kriteriaList } = trpc.kriteria.list.useQuery();
  const { data: bobotInfo } = trpc.kriteria.getTotalBobot.useQuery();

  const { data: penjualanHariIni } = trpc.penjualan.listByDate.useQuery({
    tanggal: today,
  });

  const { data: hasilSMART } = trpc.smart.getHasil.useQuery({
    tanggal: today,
  });

  const stats = [
    {
      label: "Total Produk",
      value: produkList?.length || 0,
      icon: Package,
      color: "bg-blue-500",
      visible: true,
    },
    {
      label: "Kriteria",
      value: kriteriaList?.length || 0,
      icon: ListChecks,
      color: "bg-green-500",
      visible: userRole === "pemilik",
    },
    {
      label: "Transaksi Hari Ini",
      value: penjualanHariIni?.length || 0,
      icon: ShoppingCart,
      color: "bg-purple-500",
      visible: true,
    },
    {
      label: "Produk Diranking",
      value: hasilSMART?.length || 0,
      icon: TrendingUp,
      color: "bg-orange-500",
      visible: userRole === "pemilik",
    },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Selamat Datang, {session?.user.name}!
          </h1>
          <p className="text-gray-500 mt-1">
            {userRole === "pemilik"
              ? "Kelola toko dan lihat analisis penjualan"
              : "Input transaksi penjualan harian"}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats
            .filter((stat) => stat.visible)
            .map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`${stat.color} p-3 rounded-lg bg-opacity-10`}
                    >
                      <Icon
                        className={`w-6 h-6 ${stat.color.replace("bg-", "text-")}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Untuk Pemilik */}
          {userRole === "pemilik" && (
            <>
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Master Data</h3>
                <div className="space-y-3">
                  <Link href="/dashboard/produk">
                    <Button variant="outline" className="w-full justify-start">
                      <Package className="w-4 h-4 mr-2" />
                      Kelola Produk
                    </Button>
                  </Link>
                  <Link href="/dashboard/kriteria">
                    <Button variant="outline" className="w-full justify-start">
                      <ListChecks className="w-4 h-4 mr-2" />
                      Kelola Kriteria
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Status Kriteria</h3>
                {bobotInfo && (
                  <div>
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">
                          Total Bobot
                        </span>
                        <span className="text-lg font-bold">
                          {bobotInfo.total.toFixed(4)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            bobotInfo.isValid ? "bg-green-500" : "bg-yellow-500"
                          }`}
                          style={{ width: `${bobotInfo.total * 100}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {bobotInfo.isValid ? (
                        <span className="text-green-600 font-medium">
                          ✓ Total bobot valid untuk perhitungan SMART
                        </span>
                      ) : (
                        <span className="text-yellow-600 font-medium">
                          ⚠ Total bobot harus = 1.0000
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Untuk Semua User */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
            <h3 className="text-lg font-semibold mb-2">Transaksi Penjualan</h3>
            <p className="text-blue-100 mb-4">
              {userRole === "pemilik"
                ? "Lihat dan kelola transaksi penjualan"
                : "Input transaksi penjualan baru"}
            </p>
            <Link href="/dashboard/penjualan">
              <Button variant="secondary" className="w-full">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Buka Penjualan
              </Button>
            </Link>
          </div>

          {userRole === "pemilik" && (
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-sm p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Analisis SMART</h3>
              <p className="text-green-100 mb-4">
                Lihat hasil ranking dan rekomendasi produk
              </p>
              <Link href="/dashboard/hasil-smart">
                <Button variant="secondary" className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Lihat Hasil SMART
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity - untuk pemilik */}
        {userRole === "pemilik" &&
          penjualanHariIni &&
          penjualanHariIni.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">
                Transaksi Hari Ini ({penjualanHariIni.length})
              </h3>
              <div className="space-y-3">
                {penjualanHariIni.slice(0, 5).map((transaksi) => (
                  <div
                    key={transaksi.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{transaksi.user.name}</p>
                      <p className="text-sm text-gray-500">
                        {transaksi.detail.length} item
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-blue-600">
                        Rp{" "}
                        {parseFloat(transaksi.total.toString()).toLocaleString(
                          "id-ID",
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaksi.createdAt).toLocaleTimeString(
                          "id-ID",
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
