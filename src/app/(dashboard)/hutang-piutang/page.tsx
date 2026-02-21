"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Receipt, HandCoins, CreditCard, Plus, Loader2 } from "lucide-react";

interface HutangPiutang {
    id: string;
    tipe: string;
    nama: string;
    deskripsi: string;
    jumlah: number;
    sisa: number;
    jatuh_tempo: string;
    status: string;
    created_at: string;
    [key: string]: unknown;
}

export default function HutangPiutangPage() {
    const [data, setData] = useState<HutangPiutang[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [payOpen, setPayOpen] = useState(false);
    const [selected, setSelected] = useState<HutangPiutang | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ tipe: "hutang", nama: "", jumlah: 0, jatuh_tempo: "", deskripsi: "" });
    const [payAmount, setPayAmount] = useState(0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/hutang-piutang");
            const json = await res.json();
            setData(Array.isArray(json) ? json : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const hutang = data.filter(d => d.tipe === "hutang");
    const piutang = data.filter(d => d.tipe === "piutang");
    const totalHutang = hutang.reduce((s, d) => s + (d.sisa ?? 0), 0);
    const totalPiutang = piutang.reduce((s, d) => s + (d.sisa ?? 0), 0);

    const openAdd = () => { setForm({ tipe: "hutang", nama: "", jumlah: 0, jatuh_tempo: "", deskripsi: "" }); setFormOpen(true); };
    const openPay = (item: HutangPiutang) => { setSelected(item); setPayAmount(0); setPayOpen(true); };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/hutang-piutang", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (!res.ok) throw new Error("Gagal menyimpan");
            setFormOpen(false); fetchData();
        } catch (e) { alert((e as Error).message); }
        setSaving(false);
    };

    const handlePay = async () => {
        if (!selected || payAmount <= 0) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/hutang-piutang/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pembayaran: payAmount }) });
            if (!res.ok) throw new Error("Gagal mencatat pembayaran");
            setPayOpen(false); fetchData();
        } catch (e) { alert((e as Error).message); }
        setSaving(false);
    };

    const makeColumns = (items: HutangPiutang[]): Column<HutangPiutang>[] => [
        { key: "nama", label: "Pihak", render: (item) => <span className="font-medium">{item.nama}</span> },
        { key: "jumlah", label: "Total", render: (item) => formatCurrency(item.jumlah) },
        { key: "sisa", label: "Sisa", render: (item) => <span className="font-semibold text-destructive">{formatCurrency(item.sisa ?? item.jumlah)}</span> },
        { key: "jatuh_tempo", label: "Jatuh Tempo", render: (item) => item.jatuh_tempo ? formatDateShort(item.jatuh_tempo) : "-" },
        { key: "status", label: "Status", render: (item) => <Badge variant={item.status === "lunas" ? "success" : "warning"}>{item.status ?? "belum"}</Badge> },
        {
            key: "actions", label: "Aksi", render: (item) => item.status !== "lunas" ? (
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => openPay(item)}><CreditCard className="h-3 w-3" /> Bayar</Button>
            ) : <span className="text-xs text-muted-foreground">Lunas</span>
        },
    ];

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Hutang & Piutang" description="Kelola hutang ke supplier dan piutang dari pelanggan" action={{ label: "Tambah Baru", icon: Plus, onClick: openAdd }} />

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard title="Total Hutang" value={formatCurrency(totalHutang)} icon={Receipt} iconClassName="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
                <StatCard title="Total Piutang" value={formatCurrency(totalPiutang)} icon={HandCoins} iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                <StatCard title="Total Catatan" value={`${data.length} catatan`} icon={CreditCard} iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            </div>

            <Tabs defaultValue="hutang">
                <TabsList><TabsTrigger value="hutang">Hutang ({hutang.length})</TabsTrigger><TabsTrigger value="piutang">Piutang ({piutang.length})</TabsTrigger></TabsList>
                <TabsContent value="hutang"><DataTable columns={makeColumns(hutang)} data={hutang} searchPlaceholder="Cari hutang..." /></TabsContent>
                <TabsContent value="piutang"><DataTable columns={makeColumns(piutang)} data={piutang} searchPlaceholder="Cari piutang..." /></TabsContent>
            </Tabs>

            {/* Add Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Tambah Hutang/Piutang</DialogTitle><DialogDescription>Catat hutang atau piutang baru</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Tipe *</Label>
                            <Select value={form.tipe} onValueChange={v => setForm(f => ({ ...f, tipe: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="hutang">Hutang</SelectItem><SelectItem value="piutang">Piutang</SelectItem></SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>Pihak (Supplier/Pelanggan) *</Label><Input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="Nama pihak" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Jumlah *</Label><Input type="number" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: Number(e.target.value) }))} /></div>
                            <div className="grid gap-2"><Label>Jatuh Tempo</Label><Input type="date" value={form.jatuh_tempo} onChange={e => setForm(f => ({ ...f, jatuh_tempo: e.target.value }))} /></div>
                        </div>
                        <div className="grid gap-2"><Label>Deskripsi</Label><Input value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} placeholder="Keterangan (opsional)" /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Catat Pembayaran</DialogTitle><DialogDescription>{selected?.nama} — Sisa: {formatCurrency(selected?.sisa ?? 0)}</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Jumlah Pembayaran *</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayOpen(false)}>Batal</Button>
                        <Button onClick={handlePay} disabled={saving || payAmount <= 0}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Bayar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
