"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut, UserWithRole } from "@/lib/auth-client";
import {
  Home,
  Package,
  ListChecks,
  Database,
  ShoppingCart,
  Calculator,
  LogOut,
  Menu,
  X,
  User,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Redirect ke login jika belum login
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const user = session.user as unknown as UserWithRole;
  const userRole = user.role || "staf";
  const userName = user.name;

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const menuItems = [
    {
      href: "/dashboard",
      icon: Home,
      label: "Dashboard",
      roles: ["pemilik", "staf"],
    },
    {
      href: "/dashboard/produk",
      icon: Package,
      label: "Data Produk",
      roles: ["pemilik"],
    },
    {
      href: "/dashboard/kriteria",
      icon: ListChecks,
      label: "Data Kriteria",
      roles: ["pemilik"],
    },
    {
      href: "/dashboard/stok-harian",
      icon: Database,
      label: "Stok Harian",
      roles: ["pemilik"],
    },
    {
      href: "/dashboard/penjualan",
      icon: ShoppingCart,
      label: "Penjualan",
      roles: ["pemilik", "staf"],
    },
    {
      href: "/dashboard/nilai-alternatif",
      icon: ListChecks,
      label: "Nilai Alternatif",
      roles: ["pemilik"],
    },
    {
      href: "/dashboard/hasil-smart",
      icon: TrendingUp,
      label: "Hasil SMART",
      roles: ["pemilik"],
    },
  ];

  const visibleMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-blue-600">SPK SMART</h2>
              <p className="text-xs text-gray-500">Decision Support System</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start"
            >
              <LogOut className="w-5 h-5 mr-3" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">SPK SMART</h1>
          <div className="w-6" />
        </div>
      </div>

      {/* Overlay untuk mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:pl-64 pt-16 lg:pt-0">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
