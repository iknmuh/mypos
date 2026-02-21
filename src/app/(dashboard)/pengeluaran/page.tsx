"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Plus, Pencil, Trash2, Wallet, TrendingDown, Receipt, Loader2 } from "lucide-react";

interface Expense {
    id: string;
    tanggal: string;
    deskripsi: string;
    kategori: string;
    jumlah: number;
    created_at: string;
    [key: string]: unknown;
}

const categories = ["Operasional", "Gaji", "Sewa", "Listrik & Air", "Internet", "Transportasi", "Perawatan", "Marketing", "Perlengkapan", "Lainnya"];

export default function PengeluaranPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<Expense | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ deskripsi: "", kategori: "", jumlah: 0, tanggal: new Date().toISOString().slice(0, 10) });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/pengeluaran");
            const json = await res.json();
            setExpenses(Array.isArray(json) ? json : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openAdd = () => { setSelected(null); setEditMode(false); setForm({ deskripsi: "", kategori: "", jumlah: 0, tanggal: new Date().toISOString().slice(0, 10) }); setFormOpen(true); };
    const openEdit = (e: Expense) => {
        setSelected(e); setEditMode(true);
        setForm({ deskripsi: e.deskripsi ?? "", kategori: e.kategori, jumlah: e.jumlah, tanggal: e.tanggal ?? "" });
        setFormOpen(true);
    };
    const openDelete = (e: Expense) => { setSelected(e); setDeleteOpen(true); };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editMode ? `/api/pengeluaran/${selected?.id}` : "/api/pengeluaran";
            const method = editMode ? "PATCH" : "POST";
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (!res.ok) throw new Error("Gagal menyimpan");
            setFormOpen(false); fetchData();
        } catch (e) { alert((e as Error).message); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!selected) return;
        try { await fetch(`/api/pengeluaran/${selected.id}`, { method: "DELETE" }); fetchData(); } catch (e) { alert((e as Error).message); }
    };

    const totalAll = expenses.reduce((s, e) => s + e.jumlah, 0);

    const columns: Column<Expense>[] = [
        { key: "tanggal", label: "Tanggal", render: (item) => formatDateShort(item.tanggal ?? item.created_at) },
        {
            key: "deskripsi", label: "Deskripsi", render: (item) => (
                <p className="font-medium">{item.deskripsi ?? "-"}</p>
            )
        },
        { key: "kategori", label: "Kategori", render: (item) => <Badge variant="secondary">{item.kategori}</Badge> },
        { key: "jumlah", label: "Jumlah", render: (item) => <span className="font-semibold text-destructive">{formatCurrency(item.jumlah)}</span> },
        {
            key: "actions", label: "Aksi", render: (item) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(item)}><Trash2 className="h-4 w-4" /></Button>
                </div>
            )
        },
    ];

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Pengeluaran" description="Catat dan kelola semua pengeluaran toko" action={{ label: "Catat Pengeluaran", icon: Plus, onClick: openAdd }} />
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard title="Total Pengeluaran" value={formatCurrency(totalAll)} icon={Wallet} iconClassName="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
                <StatCard title="Transaksi" value={`${expenses.length} catatan`} icon={Receipt} iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
                <StatCard title="Rata-rata" value={formatCurrency(expenses.length > 0 ? Math.round(totalAll / expenses.length) : 0)} icon={TrendingDown} iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
            </div>
            <DataTable columns={columns} data={expenses} searchPlaceholder="Cari pengeluaran..." />

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>{editMode ? "Edit Pengeluaran" : "Catat Pengeluaran Baru"}</DialogTitle><DialogDescription>{editMode ? "Ubah data pengeluaran" : "Isi detail pengeluaran"}</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Deskripsi *</Label><Input value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} placeholder="Deskripsi pengeluaran" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Kategori *</Label>
                                <Select value={form.kategori} onValueChange={v => setForm(f => ({ ...f, kategori: v }))}><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>Jumlah *</Label><Input type="number" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: Number(e.target.value) }))} /></div>
                        </div>
                        <div className="grid gap-2"><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editMode ? "Simpan Perubahan" : "Catat Pengeluaran"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Hapus Pengeluaran?" description={`Pengeluaran "${selected?.deskripsi}" sebesar ${formatCurrency(selected?.jumlah ?? 0)} akan dihapus.`} confirmLabel="Ya, Hapus" onConfirm={handleDelete} />
        </div>
    );
}
