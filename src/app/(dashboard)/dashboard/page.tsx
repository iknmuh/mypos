"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
    DollarSign, TrendingUp, ShoppingCart, Users,
    AlertTriangle, ArrowRight, Package, Clock, Loader2,
} from "lucide-react";

interface DashboardData {
    omzet_hari_ini: number;
    total_transaksi: number;
    pelanggan_baru: number;
    low_stock: { nama: string; stok: number; stok_minimum: number }[];
    recent_sales: { id: string; pelanggan: string; grand_total: number; created_at: string; metode: string }[];
    upcoming_payables: { pihak: string; sisa: number; jatuh_tempo: string }[];
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/dashboard")
            .then(res => res.json())
            .then(d => setData(d))
            .catch(e => console.error("Dashboard fetch error:", e))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const today = new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Ringkasan bisnis hari ini — {today}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Omzet Hari Ini" value={formatCurrency(data?.omzet_hari_ini ?? 0)} icon={DollarSign}
                    iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                <StatCard title="Profit (est.)" value={formatCurrency(Math.round((data?.omzet_hari_ini ?? 0) * 0.25))} icon={TrendingUp}
                    iconClassName="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" />
                <StatCard title="Total Transaksi" value={String(data?.total_transaksi ?? 0)} icon={ShoppingCart}
                    iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
                <StatCard title="Pelanggan Baru" value={String(data?.pelanggan_baru ?? 0)} icon={Users}
                    iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
            </div>

            {/* Main content grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Recent Sales */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base">Penjualan Terakhir</CardTitle>
                        <Button variant="ghost" size="sm" className="text-xs gap-1">Lihat Semua <ArrowRight className="h-3 w-3" /></Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {(data?.recent_sales ?? []).length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">Belum ada penjualan hari ini</p>
                            ) : (data?.recent_sales ?? []).map((sale) => (
                                <div key={sale.id} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                            <ShoppingCart className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{sale.pelanggan ?? "Umum"}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(sale.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">{formatCurrency(sale.grand_total)}</p>
                                        <Badge variant="secondary" className="text-[10px]">{sale.metode ?? "-"}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Right column */}
                <div className="space-y-6">
                    {/* Low Stock Alert */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" /> Stok Menipis
                            </CardTitle>
                            <Badge variant="warning">{(data?.low_stock ?? []).length}</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {(data?.low_stock ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Semua stok aman 👍</p>
                                ) : (data?.low_stock ?? []).map((item) => (
                                    <div key={item.nama} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">{item.nama}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-semibold text-destructive">{item.stok}</span>
                                            <span className="text-xs text-muted-foreground">/{item.stok_minimum}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Hutang Jatuh Tempo */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4 text-red-500" /> Hutang Jatuh Tempo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {(data?.upcoming_payables ?? []).length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Tidak ada hutang jatuh tempo</p>
                                ) : (data?.upcoming_payables ?? []).map((item, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{item.pihak}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(item.jatuh_tempo).toLocaleDateString("id-ID")}</p>
                                        </div>
                                        <span className="text-sm font-semibold text-destructive">{formatCurrency(item.sisa)}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
