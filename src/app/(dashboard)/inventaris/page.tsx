"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Plus, Pencil, Trash2, Eye, Archive, Monitor, Wrench, AlertTriangle, Loader2 } from "lucide-react";

interface Asset {
    id: string; kode: string; nama: string; kategori: string; lokasi: string;
    kondisi: string; tanggal_beli: string; nilai: number;
    deskripsi: string; created_at: string;
    [key: string]: unknown;
}

const conditionMap: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
    baik: "success", rusak_ringan: "warning", rusak_berat: "destructive",
    Baik: "success", "Rusak Ringan": "warning", "Rusak Berat": "destructive",
};

const categoryOptions = ["Elektronik", "Furnitur", "Keamanan", "Peralatan", "Kendaraan", "Lainnya"];
const locationOptions = ["Toko Utama", "Gudang", "Kantor", "Cabang 1"];
const conditionOptions = ["baik", "rusak_ringan", "rusak_berat"];

export default function InventarisPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<Asset | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ nama: "", kode: "", kategori: "", lokasi: "", kondisi: "baik", nilai: 0, tanggal_beli: "", deskripsi: "" });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/inventaris");
            const json = await res.json();
            setAssets(Array.isArray(json) ? json : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openAdd = () => { setSelected(null); setEditMode(false); setForm({ nama: "", kode: "", kategori: "", lokasi: "", kondisi: "baik", nilai: 0, tanggal_beli: "", deskripsi: "" }); setFormOpen(true); };
    const openEdit = (a: Asset) => {
        setSelected(a); setEditMode(true);
        setForm({ nama: a.nama, kode: a.kode ?? "", kategori: a.kategori ?? "", lokasi: a.lokasi ?? "", kondisi: a.kondisi ?? "baik", nilai: a.nilai ?? 0, tanggal_beli: a.tanggal_beli ?? "", deskripsi: a.deskripsi ?? "" });
        setFormOpen(true);
    };
    const openDetail = (a: Asset) => { setSelected(a); setDetailOpen(true); };
    const openDelete = (a: Asset) => { setSelected(a); setDeleteOpen(true); };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editMode ? `/api/inventaris/${selected?.id}` : "/api/inventaris";
            const method = editMode ? "PATCH" : "POST";
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (!res.ok) throw new Error("Gagal menyimpan");
            setFormOpen(false); fetchData();
        } catch (e) { alert((e as Error).message); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!selected) return;
        try { await fetch(`/api/inventaris/${selected.id}`, { method: "DELETE" }); fetchData(); } catch (e) { alert((e as Error).message); }
    };

    const totalValue = assets.reduce((s, a) => s + (a.nilai ?? 0), 0);
    const needRepair = assets.filter(a => a.kondisi === "rusak_ringan").length;
    const damaged = assets.filter(a => a.kondisi === "rusak_berat").length;

    const columns: Column<Asset>[] = [
        { key: "kode", label: "Kode", render: (item) => <span className="font-mono text-sm font-medium">{item.kode}</span> },
        { key: "nama", label: "Nama Aset", render: (item) => (<div><p className="font-medium">{item.nama}</p><p className="text-xs text-muted-foreground">{item.kategori}</p></div>) },
        { key: "lokasi", label: "Lokasi" },
        { key: "kondisi", label: "Kondisi", render: (item) => <Badge variant={conditionMap[item.kondisi] ?? "secondary"}>{item.kondisi}</Badge> },
        { key: "nilai", label: "Nilai", render: (item) => formatCurrency(item.nilai) },
        { key: "tanggal_beli", label: "Tgl Beli", render: (item) => item.tanggal_beli ? formatDateShort(item.tanggal_beli) : "-" },
        {
            key: "actions", label: "Aksi", render: (item) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(item)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(item)}><Trash2 className="h-4 w-4" /></Button>
                </div>
            )
        },
    ];

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Inventaris" description="Kelola aset dan peralatan kantor" action={{ label: "Tambah Aset", icon: Plus, onClick: openAdd }} />
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard title="Total Aset" value={`${assets.length} unit`} icon={Archive} iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
                <StatCard title="Nilai Total" value={formatCurrency(totalValue)} icon={Monitor} iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                <StatCard title="Perlu Perbaikan" value={`${needRepair} unit`} icon={Wrench} iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
                <StatCard title="Rusak" value={`${damaged} unit`} icon={AlertTriangle} iconClassName="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
            </div>

            <DataTable columns={columns} data={assets} searchPlaceholder="Cari aset..." />

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editMode ? "Edit Aset" : "Tambah Aset Baru"}</DialogTitle><DialogDescription>{editMode ? "Ubah data aset" : "Isi data aset baru"}</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Nama Aset *</Label><Input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} /></div>
                            <div className="grid gap-2"><Label>Kode Aset</Label><Input value={form.kode} onChange={e => setForm(f => ({ ...f, kode: e.target.value }))} placeholder="Auto-generate" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Kategori *</Label>
                                <Select value={form.kategori} onValueChange={v => setForm(f => ({ ...f, kategori: v }))}><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                                    <SelectContent>{categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>Lokasi *</Label>
                                <Select value={form.lokasi} onValueChange={v => setForm(f => ({ ...f, lokasi: v }))}><SelectTrigger><SelectValue placeholder="Pilih lokasi" /></SelectTrigger>
                                    <SelectContent>{locationOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Nilai Perolehan *</Label><Input type="number" value={form.nilai} onChange={e => setForm(f => ({ ...f, nilai: Number(e.target.value) }))} /></div>
                            <div className="grid gap-2"><Label>Tgl Beli</Label><Input type="date" value={form.tanggal_beli} onChange={e => setForm(f => ({ ...f, tanggal_beli: e.target.value }))} /></div>
                        </div>
                        <div className="grid gap-2"><Label>Kondisi</Label>
                            <Select value={form.kondisi} onValueChange={v => setForm(f => ({ ...f, kondisi: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{conditionOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>Deskripsi</Label><Textarea value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editMode ? "Simpan Perubahan" : "Tambah Aset"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
                <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader><SheetTitle>Detail Aset</SheetTitle></SheetHeader>
                    {selected && (
                        <div className="space-y-6 mt-6">
                            <div className="flex items-start justify-between">
                                <div><h3 className="text-lg font-semibold">{selected.nama}</h3><p className="text-sm text-muted-foreground font-mono">{selected.kode}</p></div>
                                <Badge variant={conditionMap[selected.kondisi] ?? "secondary"}>{selected.kondisi}</Badge>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><p className="text-muted-foreground">Kategori</p><p className="font-medium">{selected.kategori}</p></div>
                                <div><p className="text-muted-foreground">Lokasi</p><p className="font-medium">{selected.lokasi}</p></div>
                                <div><p className="text-muted-foreground">Nilai</p><p className="font-medium">{formatCurrency(selected.nilai)}</p></div>
                                <div><p className="text-muted-foreground">Tgl Beli</p><p className="font-medium">{selected.tanggal_beli ? formatDateShort(selected.tanggal_beli) : "-"}</p></div>
                                <div className="col-span-2"><p className="text-muted-foreground">Deskripsi</p><p className="font-medium">{selected.deskripsi || "-"}</p></div>
                            </div>
                            <div className="flex gap-2">
                                <Button className="flex-1 gap-2" onClick={() => { setDetailOpen(false); openEdit(selected); }}><Pencil className="h-4 w-4" /> Edit</Button>
                                <Button variant="destructive" className="gap-2" onClick={() => { setDetailOpen(false); openDelete(selected); }}><Trash2 className="h-4 w-4" /> Hapus</Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Hapus Aset?" description={`Aset "${selected?.nama}" (${selected?.kode}) akan dihapus.`} confirmLabel="Ya, Hapus" onConfirm={handleDelete} />
        </div>
    );
}
