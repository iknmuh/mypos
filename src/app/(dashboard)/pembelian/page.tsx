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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Plus, Pencil, Trash2, Eye, Package, Loader2 } from "lucide-react";

interface PurchaseOrder {
    id: string;
    nomor: string;
    supplier_id: string;
    supplier: string;
    total: number;
    status: string;
    items: { nama: string; qty: number; harga: number }[];
    catatan: string;
    tanggal_po: string;
    tanggal_terima: string;
    created_at: string;
    [key: string]: unknown;
}

const statusMap: Record<string, "warning" | "info" | "success" | "secondary" | "destructive"> = {
    draft: "secondary", dipesan: "info", diterima: "success", dibatalkan: "destructive",
};

export default function PembelianPage() {
    const [pos, setPOs] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<{ id: string; nama: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<PurchaseOrder | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ supplier_id: "", items: [{ nama: "", qty: 1, harga: 0 }], catatan: "", tanggal_po: new Date().toISOString().slice(0, 10) });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [poRes, supRes] = await Promise.all([fetch("/api/pembelian"), fetch("/api/supplier")]);
            const poData = await poRes.json();
            const supData = await supRes.json();
            setPOs(Array.isArray(poData) ? poData : []);
            setSuppliers(Array.isArray(supData) ? supData : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openAdd = () => { setSelected(null); setEditMode(false); setForm({ supplier_id: "", items: [{ nama: "", qty: 1, harga: 0 }], catatan: "", tanggal_po: new Date().toISOString().slice(0, 10) }); setFormOpen(true); };
    const openEdit = (po: PurchaseOrder) => { setSelected(po); setEditMode(true); setFormOpen(true); };
    const openDetail = (po: PurchaseOrder) => { setSelected(po); setDetailOpen(true); };
    const openDelete = (po: PurchaseOrder) => { setSelected(po); setDeleteOpen(true); };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editMode ? `/api/pembelian/${selected?.id}` : "/api/pembelian";
            const method = editMode ? "PATCH" : "POST";
            const supplierName = suppliers.find(s => s.id === form.supplier_id)?.nama ?? "";
            const body = { supplier_id: form.supplier_id, supplier: supplierName, catatan: form.catatan, tanggal_po: form.tanggal_po, total: form.items.reduce((s, i) => s + i.qty * i.harga, 0) };
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error("Gagal menyimpan");
            setFormOpen(false); fetchData();
        } catch (e) { alert((e as Error).message); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!selected) return;
        try { await fetch(`/api/pembelian/${selected.id}`, { method: "DELETE" }); fetchData(); } catch (e) { alert((e as Error).message); }
    };

    const handleReceive = async (po: PurchaseOrder) => {
        try {
            await fetch(`/api/pembelian/${po.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "diterima" }) });
            fetchData();
        } catch (e) { alert((e as Error).message); }
    };

    const poColumns: Column<PurchaseOrder>[] = [
        { key: "nomor", label: "No. PO", render: (item) => <span className="font-mono text-sm font-medium">{item.nomor}</span> },
        { key: "supplier", label: "Supplier" },
        { key: "created_at", label: "Tanggal", render: (item) => formatDateShort(item.created_at) },
        { key: "total", label: "Total", render: (item) => formatCurrency(item.total) },
        { key: "status", label: "Status", render: (item) => <Badge variant={statusMap[item.status] ?? "secondary"}>{item.status}</Badge> },
        {
            key: "actions", label: "Aksi", render: (item) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(item)}><Eye className="h-4 w-4" /></Button>
                    {item.status !== "diterima" && item.status !== "dibatalkan" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleReceive(item)}><Package className="h-4 w-4" /></Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    {item.status === "draft" && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(item)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
            )
        },
    ];

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Pembelian" description="Kelola purchase order dan penerimaan barang" action={{ label: "Buat PO Baru", icon: Plus, onClick: openAdd }} />
            <DataTable columns={poColumns} data={pos} searchPlaceholder="Cari PO atau supplier..." />

            {/* Add/Edit PO Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editMode ? "Edit Purchase Order" : "Buat Purchase Order"}</DialogTitle>
                        <DialogDescription>{editMode ? "Ubah data PO" : "Buat pesanan pembelian ke supplier"}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Supplier *</Label>
                                <Select value={form.supplier_id} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                                    <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>Tanggal PO</Label><Input type="date" value={form.tanggal_po} onChange={e => setForm(f => ({ ...f, tanggal_po: e.target.value }))} /></div>
                        </div>
                        <Separator />
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-semibold text-muted-foreground">Item Pesanan</p>
                                <Button variant="outline" size="sm" className="gap-1" onClick={() => setForm(f => ({ ...f, items: [...f.items, { nama: "", qty: 1, harga: 0 }] }))}><Plus className="h-3 w-3" />Tambah</Button>
                            </div>
                            <div className="space-y-3">
                                {form.items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                        <div className="col-span-5 grid gap-1"><Label className="text-xs">Produk</Label><Input value={item.nama} onChange={e => { const items = [...form.items]; items[idx].nama = e.target.value; setForm(f => ({ ...f, items })); }} placeholder="Nama produk" /></div>
                                        <div className="col-span-2 grid gap-1"><Label className="text-xs">Qty</Label><Input type="number" value={item.qty} onChange={e => { const items = [...form.items]; items[idx].qty = Number(e.target.value); setForm(f => ({ ...f, items })); }} /></div>
                                        <div className="col-span-3 grid gap-1"><Label className="text-xs">Harga</Label><Input type="number" value={item.harga} onChange={e => { const items = [...form.items]; items[idx].harga = Number(e.target.value); setForm(f => ({ ...f, items })); }} /></div>
                                        <div className="col-span-2 text-right">
                                            <p className="text-sm font-medium">{formatCurrency(item.qty * item.harga)}</p>
                                            {form.items.length > 1 && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}><Trash2 className="h-3 w-3" /></Button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm font-semibold"><span>Total:</span><span>{formatCurrency(form.items.reduce((s, i) => s + i.qty * i.harga, 0))}</span></div>
                        <div className="grid gap-2"><Label>Catatan</Label><Textarea value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} placeholder="Catatan PO (opsional)" /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editMode ? "Simpan" : "Buat PO"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PO Detail Sheet */}
            <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
                <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader><SheetTitle>Detail Purchase Order</SheetTitle></SheetHeader>
                    {selected && (
                        <div className="space-y-6 mt-6">
                            <div className="flex items-start justify-between">
                                <div><p className="font-mono text-lg font-bold">{selected.nomor}</p><p className="text-sm text-muted-foreground">{formatDateShort(selected.created_at)}</p></div>
                                <Badge variant={statusMap[selected.status] ?? "secondary"}>{selected.status}</Badge>
                            </div>
                            <Separator />
                            <div className="text-sm space-y-2">
                                <div><p className="text-muted-foreground">Supplier</p><p className="font-medium">{selected.supplier ?? "-"}</p></div>
                                {selected.tanggal_po && <div><p className="text-muted-foreground">Tanggal PO</p><p className="font-medium">{formatDateShort(selected.tanggal_po)}</p></div>}
                            </div>
                            <Separator />
                            <div>
                                <p className="text-sm font-semibold mb-3">Item Pesanan</p>
                                <div className="space-y-2">
                                    {(selected.items ?? []).map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm border rounded-lg p-2.5">
                                            <div><p className="font-medium">{item.nama}</p><p className="text-xs text-muted-foreground">{item.qty} × {formatCurrency(item.harga)}</p></div>
                                            <p className="font-semibold">{formatCurrency(item.qty * item.harga)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between text-sm font-bold mt-3 pt-3 border-t"><span>Total</span><span>{formatCurrency(selected.total)}</span></div>
                            </div>
                            {selected.catatan && <div className="text-sm"><p className="text-muted-foreground">Catatan</p><p>{selected.catatan}</p></div>}
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Hapus PO?" description={`PO "${selected?.nomor_po}" akan dihapus.`} confirmLabel="Ya, Hapus" onConfirm={handleDelete} />
        </div>
    );
}
