"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Wrench,
    Truck,
    Receipt,
    Wallet,
    Archive,
    Users,
    BarChart3,
    Sparkles,
    Settings,
    Store,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/kasir", label: "Kasir", icon: ShoppingCart },
    { type: "separator" as const },
    { href: "/barang-stok", label: "Barang & Stok", icon: Package },
    { href: "/jasa", label: "Jasa/Service", icon: Wrench },
    { href: "/pembelian", label: "Pembelian", icon: Truck },
    { type: "separator" as const },
    { href: "/hutang-piutang", label: "Hutang & Piutang", icon: Receipt },
    { href: "/pengeluaran", label: "Pengeluaran", icon: Wallet },
    { href: "/karyawan-gaji", label: "Karyawan & Gaji", icon: Users },
    { href: "/inventaris", label: "Inventaris", icon: Archive },
    { type: "separator" as const },
    { href: "/laporan", label: "Laporan", icon: BarChart3 },
    { href: "/tanya-ai", label: "Tanya AI", icon: Sparkles },
    { type: "separator" as const },
    { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

interface MobileSidebarContentProps {
    onClose: () => void;
}

export function MobileSidebarContent({ onClose }: MobileSidebarContentProps) {
    const pathname = usePathname();

    return (
        <>
            {/* Brand */}
            <div className="flex items-center gap-3 pb-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-primary">
                    <Store className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                    <span className="text-base font-bold tracking-tight">MyPOS</span>
                    <span className="text-[10px] leading-none text-muted-foreground">
                        Kelola Bisnis Mudah
                    </span>
                </div>
            </div>

            <Separator />

            {/* Nav items */}
            <ScrollArea className="flex-1 py-4">
                <nav className="flex flex-col gap-1">
                    {navItems.map((item, idx) => {
                        if ("type" in item && item.type === "separator") {
                            return <Separator key={`sep-${idx}`} className="my-2" />;
                        }

                        if (!("href" in item)) return null;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-accent text-primary shadow-sm"
                                        : "text-foreground/70 hover:bg-accent/50 hover:text-foreground"
                                )}
                            >
                                <Icon className="h-5 w-5 shrink-0" />
                                <span>{item.label}</span>
                                {item.href === "/tanya-ai" && (
                                    <span className="ml-auto flex h-5 items-center rounded-full bg-primary/10 px-2 text-[10px] font-semibold text-primary">
                                        AI
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>
        </>
    );
}
