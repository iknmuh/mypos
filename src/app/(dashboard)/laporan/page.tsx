"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { formatCurrency } from "@/lib/utils";
import {
    BarChart3, FileText, Download, DollarSign, TrendingUp, ShoppingCart,
    Package, Loader2
} from "lucide-react";

interface SaleRow { id: string; nomor: string; pelanggan: string; grand_total: number; metode: string; status: string; created_at: string;[key: string]: unknown; }
interface ProductRow { nama: string; jumlah: number; revenue: number;[key: string]: unknown; }
interface FinanceRow { label: string; jumlah: number;[key: string]: unknown; }

export default function LaporanPage() {
    const [salesData, setSalesData] = useState<SaleRow[]>([]);
    const [topProducts, setTopProducts] = useState<ProductRow[]>([]);
    const [financeData, setFinanceData] = useState<FinanceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("month");

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const [salesRes, prodRes, finRes] = await Promise.all([
                fetch(`/api/laporan?type=sales&period=${period}`),
                fetch(`/api/laporan?type=products&period=${period}`),
                fetch(`/api/laporan?type=finance&period=${period}`),
            ]);
            const salesJson = await salesRes.json();
            const prodJson = await prodRes.json();
            const finJson = await finRes.json();
            setSalesData(Array.isArray(salesJson.data) ? salesJson.data : Array.isArray(salesJson) ? salesJson : []);
            setTopProducts(Array.isArray(prodJson.data) ? prodJson.data : Array.isArray(prodJson) ? prodJson : []);
            setFinanceData(Array.isArray(finJson.data) ? finJson.data : Array.isArray(finJson) ? finJson : []);
        } catch (e) { console.error("Report fetch error:", e); }
        setLoading(false);
    }, [period]);

    useEffect(() => { fetchReport(); }, [fetchReport]);

    const totalRevenue = salesData.reduce((s, r) => s + (r.grand_total ?? 0), 0);

    const salesColumns: Column<SaleRow>[] = [
        { key: "nomor", label: "No. Invoice", render: (item) => <span className="font-mono text-sm">{item.nomor}</span> },
        { key: "pelanggan", label: "Pelanggan" },
        { key: "grand_total", label: "Total", render: (item) => <span className="font-semibold">{formatCurrency(item.grand_total)}</span> },
        { key: "metode", label: "Metode", render: (item) => <Badge variant="secondary">{item.metode}</Badge> },
        { key: "status", label: "Status", render: (item) => <Badge variant={item.status === "selesai" ? "success" : item.status === "dibatalkan" ? "destructive" : "secondary"}>{item.status}</Badge> },
        { key: "created_at", label: "Tanggal", render: (item) => new Date(item.created_at).toLocaleDateString("id-ID") },
    ];

    const productColumns: Column<ProductRow>[] = [
        { key: "nama", label: "Produk", render: (item) => <span className="font-medium">{item.nama}</span> },
        { key: "jumlah", label: "Terjual", render: (item) => `${item.jumlah} unit` },
        { key: "revenue", label: "Pendapatan", render: (item) => <span className="font-semibold">{formatCurrency(item.revenue)}</span> },
    ];

    const financeColumns: Column<FinanceRow>[] = [
        { key: "label", label: "Keterangan", render: (item) => <span className="font-medium">{item.label}</span> },
        { key: "jumlah", label: "Jumlah", render: (item) => <span className={`font-semibold ${item.jumlah < 0 ? "text-destructive" : "text-emerald-600"}`}>{formatCurrency(item.jumlah)}</span> },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Laporan</h1>
                    <p className="text-sm text-muted-foreground">Analisis penjualan, produk, dan keuangan</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Hari Ini</SelectItem>
                            <SelectItem value="week">Minggu Ini</SelectItem>
                            <SelectItem value="month">Bulan Ini</SelectItem>
                            <SelectItem value="year">Tahun Ini</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard title="Total Pendapatan" value={formatCurrency(totalRevenue)} icon={DollarSign} iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                <StatCard title="Total Transaksi" value={`${salesData.length}`} icon={ShoppingCart} iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
                <StatCard title="Produk Terjual" value={`${topProducts.reduce((s, p) => s + p.jumlah, 0)} unit`} icon={Package} iconClassName="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
                <Tabs defaultValue="sales">
                    <TabsList>
                        <TabsTrigger value="sales"><FileText className="h-4 w-4 mr-1" />Penjualan</TabsTrigger>
                        <TabsTrigger value="products"><Package className="h-4 w-4 mr-1" />Produk</TabsTrigger>
                        <TabsTrigger value="finance"><TrendingUp className="h-4 w-4 mr-1" />Keuangan</TabsTrigger>
                    </TabsList>
                    <TabsContent value="sales"><DataTable columns={salesColumns} data={salesData} searchPlaceholder="Cari transaksi..." /></TabsContent>
                    <TabsContent value="products"><DataTable columns={productColumns} data={topProducts} searchPlaceholder="Cari produk..." /></TabsContent>
                    <TabsContent value="finance"><DataTable columns={financeColumns} data={financeData} searchPlaceholder="Cari..." /></TabsContent>
                </Tabs>
            )}
        </div>
    );
}
