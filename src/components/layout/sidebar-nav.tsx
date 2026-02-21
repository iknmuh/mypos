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
    ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface SidebarNavProps {
    isCollapsed: boolean;
    onToggle: () => void;
}

export function SidebarNav({ isCollapsed, onToggle }: SidebarNavProps) {
    const pathname = usePathname();

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar transition-all duration-300 ease-in-out",
                isCollapsed ? "w-[68px]" : "w-[260px]"
            )}
        >
            {/* Logo / Brand */}
            <div className="flex h-16 items-center gap-3 border-b px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-primary">
                    <Store className="h-5 w-5 text-white" />
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col animate-fade-in">
                        <span className="text-base font-bold tracking-tight text-sidebar-foreground">
                            MyPOS
                        </span>
                        <span className="text-[10px] leading-none text-muted-foreground">
                            Kelola Bisnis Mudah
                        </span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-3 py-4">
                <nav className="flex flex-col gap-1">
                    {navItems.map((item, idx) => {
                        if ("type" in item && item.type === "separator") {
                            return <Separator key={`sep-${idx}`} className="my-2" />;
                        }

                        if (!("href" in item)) return null;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        const Icon = item.icon;

                        if (isCollapsed) {
                            return (
                                <Tooltip key={item.href} delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                "flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
                                                isActive
                                                    ? "bg-sidebar-accent text-primary shadow-sm"
                                                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                            )}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="font-medium">
                                        {item.label}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-sidebar-accent text-primary shadow-sm"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                )}
                            >
                                <Icon className="h-5 w-5 shrink-0" />
                                <span className="animate-fade-in">{item.label}</span>
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

            {/* Collapse toggle */}
            <div className="border-t p-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="h-9 w-9 mx-auto"
                >
                    <ChevronLeft
                        className={cn(
                            "h-4 w-4 transition-transform duration-300",
                            isCollapsed && "rotate-180"
                        )}
                    />
                </Button>
            </div>
        </aside>
    );
}
