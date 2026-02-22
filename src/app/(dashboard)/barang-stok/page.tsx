"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, Column } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatNumber, formatDateShort } from "@/lib/utils";
import { Plus, Package, Pencil, Trash2, Eye, Loader2, Tags, FolderOpen } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
interface Product {
    id: string;
    nama: string;
    kode: string;
    kategori: string;
    harga_beli: number;
    harga_jual: number;
    stok: number;
    stok_minimum: number;
    satuan: string;
    aktif: boolean;
    created_at: string;
    [key: string]: unknown;
}

interface Kategori {
    id: string;
    nama: string;
    created_at: string;
    [key: string]: unknown;
}

const units = ["Pcs", "Pack", "Botol", "Karung", "Kotak", "Renceng", "Lusin", "Kg", "Liter"];

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function BarangStokPage() {
    const [activeTab, setActiveTab] = useState("produk");

    return (
        <div className="space-y-6">
            <PageHeader
                title="Barang & Stok"
                description="Kelola produk, stok, dan kategori produk"
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="produk" className="gap-2">
                        <Package className="h-4 w-4" /> Produk
                    </TabsTrigger>
                    <TabsTrigger value="kategori" className="gap-2">
                        <Tags className="h-4 w-4" /> Kategori
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="produk" className="mt-6">
                    <ProdukTab />
                </TabsContent>
                <TabsContent value="kategori" className="mt-6">
                    <KategoriTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// PRODUK TAB  (original page logic)
// ══════════════════════════════════════════════════════════════
function ProdukTab() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        nama: "", kode: "", kategori: "", harga_beli: 0, harga_jual: 0,
        stok: 0, stok_minimum: 0, satuan: "Pcs",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [prodRes, katRes] = await Promise.all([fetch("/api/produk"), fetch("/api/kategori")]);
            const prodData = await prodRes.json();
            const katData = await katRes.json();
            setProducts(Array.isArray(prodData) ? prodData : []);
            setCategories((Array.isArray(katData) ? katData : []).map((k: { nama: string }) => k.nama));
        } catch (e) { console.error("Fetch error:", e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openAdd = () => {
        setSelectedProduct(null); setEditMode(false);
        setForm({ nama: "", kode: "", kategori: "", harga_beli: 0, harga_jual: 0, stok: 0, stok_minimum: 0, satuan: "Pcs" });
        setFormOpen(true);
    };
    const openEdit = (p: Product) => {
        setSelectedProduct(p); setEditMode(true);
        setForm({ nama: p.nama, kode: p.kode ?? "", kategori: p.kategori ?? "", harga_beli: p.harga_beli, harga_jual: p.harga_jual, stok: p.stok, stok_minimum: p.stok_minimum, satuan: p.satuan ?? "Pcs" });
        setFormOpen(true);
    };
    const openDetail = (p: Product) => { setSelectedProduct(p); setDetailOpen(true); };
    const openDelete = (p: Product) => { setSelectedProduct(p); setDeleteOpen(true); };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editMode ? `/api/produk/${selectedProduct?.id}` : "/api/produk";
            const method = editMode ? "PATCH" : "POST";
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Gagal menyimpan"); }
            setFormOpen(false);
            fetchData();
        } catch (e) { alert((e as Error).message); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!selectedProduct) return;
        try {
            const res = await fetch(`/api/produk/${selectedProduct.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Gagal menghapus");
            fetchData();
        } catch (e) { alert((e as Error).message); }
    };

    const columns: Column<Product>[] = [
        {
            key: "nama", label: "Nama Produk", render: (item) => (
                <div>
                    <p className="font-medium">{item.nama}</p>
                    <p className="text-xs text-muted-foreground">{item.kode ?? "-"}</p>
                </div>
            )
        },
        { key: "kategori", label: "Kategori" },
        { key: "harga_beli", label: "Harga Beli", render: (item) => formatCurrency(item.harga_beli) },
        { key: "harga_jual", label: "Harga Jual", render: (item) => formatCurrency(item.harga_jual) },
        {
            key: "stok", label: "Stok", render: (item) => (
                <div className="flex items-center gap-2">
                    <span className={item.stok <= item.stok_minimum ? "text-destructive font-semibold" : ""}>{formatNumber(item.stok)} {item.satuan ?? ""}</span>
                    {item.stok <= item.stok_minimum && item.stok > 0 && <Badge variant="warning" className="text-[10px]">Menipis</Badge>}
                    {item.stok === 0 && <Badge variant="destructive" className="text-[10px]">Habis</Badge>}
                </div>
            )
        },
        { key: "aktif", label: "Status", render: (item) => <Badge variant={item.aktif ? "success" : "secondary"}>{item.aktif ? "Aktif" : "Nonaktif"}</Badge> },
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
            <div className="flex justify-end">
                <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Tambah Produk</Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Produk</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{products.length}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Stok Menipis</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-600">{products.filter(p => p.stok <= p.stok_minimum && p.stok > 0).length}</p></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Package className="h-4 w-4" /> Stok Habis</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{products.filter(p => p.stok === 0).length}</p></CardContent></Card>
            </div>

            <DataTable columns={columns} data={products} searchPlaceholder="Cari produk, SKU, atau barcode..." />

            {/* Add/Edit Product Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editMode ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
                        <DialogDescription>{editMode ? "Ubah informasi produk" : "Isi data produk yang akan ditambahkan"}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Nama Produk *</Label><Input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="Nama produk" /></div>
                            <div className="grid gap-2"><Label>Kode Produk</Label><Input value={form.kode} onChange={e => setForm(f => ({ ...f, kode: e.target.value }))} placeholder="PRD-001" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Kategori *</Label>
                                <Select value={form.kategori} onValueChange={v => setForm(f => ({ ...f, kategori: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid gap-2"><Label>Harga Beli *</Label><Input type="number" value={form.harga_beli} onChange={e => setForm(f => ({ ...f, harga_beli: Number(e.target.value) }))} /></div>
                            <div className="grid gap-2"><Label>Harga Jual *</Label><Input type="number" value={form.harga_jual} onChange={e => setForm(f => ({ ...f, harga_jual: Number(e.target.value) }))} /></div>
                            <div className="grid gap-2">
                                <Label>Satuan</Label>
                                <Select value={form.satuan} onValueChange={v => setForm(f => ({ ...f, satuan: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Pilih satuan" /></SelectTrigger>
                                    <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Stok Awal</Label><Input type="number" value={form.stok} onChange={e => setForm(f => ({ ...f, stok: Number(e.target.value) }))} /></div>
                            <div className="grid gap-2"><Label>Stok Minimum</Label><Input type="number" value={form.stok_minimum} onChange={e => setForm(f => ({ ...f, stok_minimum: Number(e.target.value) }))} /></div>
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editMode ? "Simpan Perubahan" : "Tambah Produk"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Product Detail Sheet */}
            <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
                <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader><SheetTitle>Detail Produk</SheetTitle></SheetHeader>
                    {selectedProduct && (
                        <div className="space-y-6 mt-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">{selectedProduct.nama}</h3>
                                    <p className="text-sm text-muted-foreground">Kode: {selectedProduct.kode ?? "-"}</p>
                                </div>
                                <Badge variant={selectedProduct.aktif ? "success" : "secondary"}>{selectedProduct.aktif ? "Aktif" : "Nonaktif"}</Badge>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><p className="text-muted-foreground">Kategori</p><p className="font-medium">{selectedProduct.kategori ?? "-"}</p></div>
                                <div><p className="text-muted-foreground">Satuan</p><p className="font-medium">{selectedProduct.satuan ?? "-"}</p></div>
                                <div><p className="text-muted-foreground">Harga Beli</p><p className="font-medium">{formatCurrency(selectedProduct.harga_beli)}</p></div>
                                <div><p className="text-muted-foreground">Harga Jual</p><p className="font-medium">{formatCurrency(selectedProduct.harga_jual)}</p></div>
                                <div><p className="text-muted-foreground">Margin</p><p className="font-medium text-emerald-600">{formatCurrency(selectedProduct.harga_jual - selectedProduct.harga_beli)} ({selectedProduct.harga_beli > 0 ? Math.round((selectedProduct.harga_jual - selectedProduct.harga_beli) / selectedProduct.harga_beli * 100) : 0}%)</p></div>
                                <div><p className="text-muted-foreground">Stok</p><p className={`font-medium ${selectedProduct.stok <= selectedProduct.stok_minimum ? "text-destructive" : ""}`}>{selectedProduct.stok} {selectedProduct.satuan ?? ""} (min: {selectedProduct.stok_minimum})</p></div>

                                <div><p className="text-muted-foreground">Tanggal Ditambah</p><p className="font-medium">{formatDateShort(selectedProduct.created_at)}</p></div>
                            </div>
                            <div className="flex gap-2">
                                <Button className="flex-1 gap-2" onClick={() => { setDetailOpen(false); openEdit(selectedProduct); }}><Pencil className="h-4 w-4" /> Edit</Button>
                                <Button variant="destructive" className="gap-2" onClick={() => { setDetailOpen(false); openDelete(selectedProduct); }}><Trash2 className="h-4 w-4" /> Hapus</Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Hapus Produk?" description={`Produk "${selectedProduct?.nama}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`} confirmLabel="Ya, Hapus" onConfirm={handleDelete} />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════
// KATEGORI TAB  (new)
// ══════════════════════════════════════════════════════════════
function KategoriTab() {
    const [categories, setCategories] = useState<Kategori[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<Kategori | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [nama, setNama] = useState("");

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/kategori");
            const data = await res.json();
            setCategories(Array.isArray(data) ? data : []);
        } catch (e) { console.error("Fetch error:", e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const openAdd = () => { setSelected(null); setEditMode(false); setNama(""); setFormOpen(true); };
    const openEdit = (k: Kategori) => { setSelected(k); setEditMode(true); setNama(k.nama); setFormOpen(true); };
    const openDelete = (k: Kategori) => { setSelected(k); setDeleteOpen(true); };

    const handleSave = async () => {
        if (!nama.trim()) { alert("Nama kategori wajib diisi"); return; }
        setSaving(true);
        try {
            const method = editMode ? "PUT" : "POST";
            const body = editMode ? { id: selected?.id, nama: nama.trim() } : { nama: nama.trim() };
            const res = await fetch("/api/kategori", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Gagal menyimpan"); }
            setFormOpen(false);
            fetchCategories();
        } catch (e) { alert((e as Error).message); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!selected) return;
        try {
            const res = await fetch("/api/kategori", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id }) });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Gagal menghapus"); }
            fetchCategories();
        } catch (e) { alert((e as Error).message); }
    };

    const columns: Column<Kategori>[] = [
        {
            key: "nama", label: "Nama Kategori", render: (item) => (
                <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.nama}</span>
                </div>
            )
        },
        { key: "created_at", label: "Tanggal Dibuat", render: (item) => formatDateShort(item.created_at) },
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
            <div className="flex justify-end">
                <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Tambah Kategori</Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Tags className="h-4 w-4" /> Total Kategori</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold">{categories.length}</p></CardContent>
                </Card>
            </div>

            <DataTable columns={columns} data={categories} searchPlaceholder="Cari kategori..." />

            {/* Add/Edit Category Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editMode ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
                        <DialogDescription>{editMode ? "Ubah nama kategori" : "Masukkan nama kategori produk baru"}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Nama Kategori *</Label>
                            <Input
                                value={nama}
                                onChange={e => setNama(e.target.value)}
                                placeholder="Contoh: Makanan, Minuman, Elektronik"
                                onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {editMode ? "Simpan" : "Tambah"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Hapus Kategori?"
                description={`Kategori "${selected?.nama}" akan dihapus. Produk yang menggunakan kategori ini tidak akan terhapus, hanya referensi kategorinya yang dihilangkan.`}
                confirmLabel="Ya, Hapus"
                onConfirm={handleDelete}
            />
        </div>
    );
}
