"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
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
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Plus, Pencil, Trash2, Eye, Clock, User, Phone, FileText, Loader2 } from "lucide-react";

// Matches DB: id, store_id, kode, nama, pelanggan, hp, deskripsi, estimasi, harga, status, created_at, updated_at
interface ServiceOrder {
    id: string; kode: string; nama: string; pelanggan: string; hp: string;
    deskripsi: string; estimasi: string; harga: number; status: string;
    created_at: string;
    [key: string]: unknown;
}

const statusMap: Record<string, "warning" | "info" | "success" | "secondary" | "destructive"> = {
    antrian: "warning", dikerjakan: "info", selesai: "success", diambil: "success", dibatalkan: "destructive",
};

export default function JasaPage() {
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selected, setSelected] = useState<ServiceOrder | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newStatus, setNewStatus] = useState("");
    const [form, setForm] = useState({
        nama: "", pelanggan: "", hp: "", deskripsi: "", estimasi: "", harga: 0,
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/jasa");
            const json = await res.json();
            setOrders(Array.isArray(json) ? json : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openAdd = () => {
        setSelected(null); setEditMode(false);
        setForm({ nama: "", pelanggan: "", hp: "", deskripsi: "", estimasi: "", harga: 0 });
        setFormOpen(true);
    };
    const openEdit = (o: ServiceOrder) => {
        setSelected(o); setEditMode(true);
        setForm({ nama: o.nama ?? "", pelanggan: o.pelanggan ?? "", hp: o.hp ?? "", deskripsi: o.deskripsi ?? "", estimasi: o.estimasi ?? "", harga: o.harga ?? 0 });
        setFormOpen(true);
    };
    const openDetail = (o: ServiceOrder) => { setSelected(o); setDetailOpen(true); };
    const openDelete = (o: ServiceOrder) => { setSelected(o); setDeleteOpen(true); };
    const openStatusDialog = (o: ServiceOrder) => { setSelected(o); setNewStatus(o.status); setStatusDialogOpen(true); };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editMode ? `/api/jasa/${selected?.id}` : "/api/jasa";
            const method = editMode ? "PATCH" : "POST";
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ?? "Gagal menyimpan"); }
            setFormOpen(false); fetchData();
        } catch (e) { alert((e as Error).message); }
        setSaving(false);
    };

    const handleStatusChange = async () => {
        if (!selected) return;
        try {
            await fetch(`/api/jasa/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
            setStatusDialogOpen(false); fetchData();
        } catch (e) { alert((e as Error).message); }
    };

    const handleDelete = async () => {
        if (!selected) return;
        try { await fetch(`/api/jasa/${selected.id}`, { method: "DELETE" }); fetchData(); } catch (e) { alert((e as Error).message); }
    };

    const columns: Column<ServiceOrder>[] = [
        { key: "kode", label: "Kode", render: (item) => <span className="font-mono text-sm font-medium">{item.kode ?? item.id?.slice(0, 8)}</span> },
        { key: "nama", label: "Nama Jasa" },
        { key: "pelanggan", label: "Pelanggan", render: (item) => (<div><p className="font-medium">{item.pelanggan}</p><p className="text-xs text-muted-foreground">{item.hp}</p></div>) },
        { key: "deskripsi", label: "Deskripsi", render: (item) => <span className="text-sm max-w-[200px] truncate block">{item.deskripsi ?? "-"}</span> },
        { key: "status", label: "Status", render: (item) => <Badge variant={statusMap[item.status] ?? "secondary"} className="cursor-pointer" onClick={() => openStatusDialog(item)}>{item.status}</Badge> },
        { key: "harga", label: "Harga", render: (item) => formatCurrency(item.harga) },
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
            <PageHeader title="Jasa / Service" description="Kelola order jasa dan layanan service" action={{ label: "Buat Order Jasa", icon: Plus, onClick: openAdd }} />
            <DataTable columns={columns} data={orders} searchPlaceholder="Cari order jasa..." />

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editMode ? "Edit Order Jasa" : "Buat Order Jasa Baru"}</DialogTitle><DialogDescription>{editMode ? "Ubah data order" : "Isi data jasa baru"}</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Nama Jasa *</Label><Input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="Nama layanan jasa" /></div>
                        <Separator />
                        <p className="text-sm font-semibold text-muted-foreground">Data Pelanggan</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Pelanggan</Label><Input value={form.pelanggan} onChange={e => setForm(f => ({ ...f, pelanggan: e.target.value }))} /></div>
                            <div className="grid gap-2"><Label>No. HP</Label><Input value={form.hp} onChange={e => setForm(f => ({ ...f, hp: e.target.value }))} /></div>
                        </div>
                        <Separator />
                        <div className="grid gap-2"><Label>Deskripsi</Label><Textarea value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))} placeholder="Deskripsi atau keluhan" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Estimasi</Label><Input value={form.estimasi} onChange={e => setForm(f => ({ ...f, estimasi: e.target.value }))} placeholder="e.g. 2 hari" /></div>
                            <div className="grid gap-2"><Label>Harga</Label><Input type="number" value={form.harga} onChange={e => setForm(f => ({ ...f, harga: Number(e.target.value) }))} /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editMode ? "Simpan" : "Buat Order"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
                <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader><SheetTitle>Detail Order Jasa</SheetTitle></SheetHeader>
                    {selected && (
                        <div className="space-y-6 mt-6">
                            <div className="flex items-start justify-between">
                                <div><p className="font-mono text-lg font-bold">{selected.kode ?? selected.id?.slice(0, 8)}</p><p className="text-sm text-muted-foreground">{formatDateShort(selected.created_at)}</p></div>
                                <Badge variant={statusMap[selected.status] ?? "secondary"} className="text-sm">{selected.status}</Badge>
                            </div>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" />Jasa</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><p className="text-muted-foreground">Nama Jasa</p><p className="font-medium">{selected.nama}</p></div>
                                    <div><p className="text-muted-foreground">Harga</p><p className="font-medium">{formatCurrency(selected.harga)}</p></div>
                                    <div><p className="text-muted-foreground">Estimasi</p><p className="font-medium">{selected.estimasi || "-"}</p></div>
                                    <div className="col-span-2"><p className="text-muted-foreground">Deskripsi</p><p className="font-medium">{selected.deskripsi || "-"}</p></div>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4" />Pelanggan</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><p className="text-muted-foreground">Nama</p><p className="font-medium">{selected.pelanggan || "-"}</p></div>
                                    <div><p className="text-muted-foreground">HP</p><p className="font-medium flex items-center gap-1"><Phone className="h-3 w-3" />{selected.hp || "-"}</p></div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button className="flex-1 gap-2" onClick={() => { setDetailOpen(false); openEdit(selected); }}><Pencil className="h-4 w-4" /> Edit</Button>
                                <Button variant="outline" className="flex-1 gap-2" onClick={() => { setDetailOpen(false); openStatusDialog(selected); }}>Ubah Status</Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Ubah Status Order</DialogTitle><DialogDescription>{selected?.kode ?? selected?.id?.slice(0, 8)}</DialogDescription></DialogHeader>
                    <div className="grid gap-2 py-4">
                        <Label>Status Baru</Label>
                        <Select value={newStatus} onValueChange={setNewStatus}><SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{["antrian", "dikerjakan", "selesai", "diambil", "dibatalkan"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Batal</Button>
                        <Button onClick={handleStatusChange}>Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Hapus Order Jasa?" description={`Order "${selected?.kode ?? selected?.id?.slice(0, 8)}" akan dihapus.`} confirmLabel="Ya, Hapus" onConfirm={handleDelete} />
        </div>
    );
}
