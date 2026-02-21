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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Plus, Pencil, Trash2, Eye, Users, UserCheck, Banknote, CalendarDays, Loader2 } from "lucide-react";

interface Employee {
    id: string; nama: string; jabatan: string; hp: string;
    alamat: string; tanggal_masuk: string; gaji_pokok: number; status: string;
    [key: string]: unknown;
}

interface Payroll {
    id: string; periode: string; karyawan_id: string; nama_karyawan: string;
    gaji_pokok: number; tunjangan: number; potongan: number; total: number; status: string;
    [key: string]: unknown;
}

export default function KaryawanGajiPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [payrollFormOpen, setPayrollFormOpen] = useState(false);
    const [selected, setSelected] = useState<Employee | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ nama: "", jabatan: "", hp: "", alamat: "", tanggal_masuk: "", gaji_pokok: 0 });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [empRes, payRes] = await Promise.all([fetch("/api/karyawan"), fetch("/api/penggajian")]);
            const empData = await empRes.json();
            const payData = await payRes.json();
            setEmployees(Array.isArray(empData) ? empData : []);
            setPayrolls(Array.isArray(payData) ? payData : []);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openAdd = () => { setSelected(null); setEditMode(false); setForm({ nama: "", jabatan: "", hp: "", alamat: "", tanggal_masuk: "", gaji_pokok: 0 }); setFormOpen(true); };
    const openEdit = (e: Employee) => {
        setSelected(e); setEditMode(true);
        setForm({ nama: e.nama, jabatan: e.jabatan ?? "", hp: e.hp ?? "", alamat: e.alamat ?? "", tanggal_masuk: e.tanggal_masuk ?? "", gaji_pokok: e.gaji_pokok ?? 0 });
        setFormOpen(true);
    };
    const openDetail = (e: Employee) => { setSelected(e); setDetailOpen(true); };
    const openDelete = (e: Employee) => { setSelected(e); setDeleteOpen(true); };

    const handleSave = async () => {
        setSaving(true);
        try {
            const url = editMode ? `/api/karyawan/${selected?.id}` : "/api/karyawan";
            const method = editMode ? "PATCH" : "POST";
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (!res.ok) throw new Error("Gagal menyimpan");
            setFormOpen(false); fetchData();
        } catch (e) { alert((e as Error).message); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!selected) return;
        try { await fetch(`/api/karyawan/${selected.id}`, { method: "DELETE" }); fetchData(); } catch (e) { alert((e as Error).message); }
    };

    const activeCount = employees.filter(e => e.status === "aktif" || e.status === "Aktif").length;
    const totalGaji = payrolls.reduce((s, p) => s + (p.total ?? 0), 0);

    const empColumns: Column<Employee>[] = [
        { key: "nama", label: "Nama", render: (item) => (<div><p className="font-medium">{item.nama}</p></div>) },
        { key: "jabatan", label: "Jabatan" },
        { key: "hp", label: "HP" },
        { key: "gaji_pokok", label: "Gaji Pokok", render: (item) => formatCurrency(item.gaji_pokok) },
        { key: "status", label: "Status", render: (item) => <Badge variant={item.status?.toLowerCase() === "aktif" ? "success" : "warning"}>{item.status}</Badge> },
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

    const payrollColumns: Column<Payroll>[] = [
        { key: "nama_karyawan", label: "Karyawan" },
        { key: "gaji_pokok", label: "Gaji Pokok", render: (item) => formatCurrency(item.gaji_pokok) },
        { key: "tunjangan", label: "Tunjangan", render: (item) => formatCurrency(item.tunjangan ?? 0) },
        { key: "potongan", label: "Potongan", render: (item) => <span className="text-destructive">-{formatCurrency(item.potongan ?? 0)}</span> },
        { key: "total", label: "Gaji Bersih", render: (item) => <span className="font-semibold">{formatCurrency(item.total)}</span> },
        { key: "status", label: "Status", render: (item) => <Badge variant={item.status === "dibayar" ? "success" : item.status === "proses" ? "warning" : "secondary"}>{item.status}</Badge> },
    ];

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Karyawan & Gaji" description="Kelola data karyawan dan penggajian" action={{ label: "Tambah Karyawan", icon: Plus, onClick: openAdd }} />
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard title="Total Karyawan" value={`${employees.length} orang`} icon={Users} iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
                <StatCard title="Aktif" value={`${activeCount} orang`} icon={UserCheck} iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                <StatCard title="Total Gaji" value={formatCurrency(totalGaji)} icon={Banknote} iconClassName="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
                <StatCard title="Periode" value={new Date().toLocaleDateString("id-ID", { month: "short", year: "numeric" })} icon={CalendarDays} iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
            </div>
            <Tabs defaultValue="karyawan">
                <TabsList><TabsTrigger value="karyawan">Data Karyawan</TabsTrigger><TabsTrigger value="gaji">Penggajian</TabsTrigger></TabsList>
                <TabsContent value="karyawan"><DataTable columns={empColumns} data={employees} searchPlaceholder="Cari karyawan..." /></TabsContent>
                <TabsContent value="gaji"><DataTable columns={payrollColumns} data={payrolls} searchPlaceholder="Cari karyawan..." /></TabsContent>
            </Tabs>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editMode ? "Edit Karyawan" : "Tambah Karyawan Baru"}</DialogTitle><DialogDescription>{editMode ? "Ubah data karyawan" : "Isi data karyawan baru"}</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <p className="text-sm font-semibold text-muted-foreground">Data Pribadi</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Nama Lengkap *</Label><Input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="Nama lengkap" /></div>
                            <div className="grid gap-2"><Label>No. HP</Label><Input value={form.hp} onChange={e => setForm(f => ({ ...f, hp: e.target.value }))} placeholder="08xxxxxxxxxx" /></div>
                        </div>
                        <div className="grid gap-2"><Label>Alamat</Label><Input value={form.alamat} onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))} /></div>
                        <Separator />
                        <p className="text-sm font-semibold text-muted-foreground">Data Kerja</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Jabatan *</Label><Input value={form.jabatan} onChange={e => setForm(f => ({ ...f, jabatan: e.target.value }))} placeholder="Jabatan" /></div>
                            <div className="grid gap-2"><Label>Tgl Masuk</Label><Input type="date" value={form.tanggal_masuk} onChange={e => setForm(f => ({ ...f, tanggal_masuk: e.target.value }))} /></div>
                        </div>
                        <div className="grid gap-2"><Label>Gaji Pokok *</Label><Input type="number" value={form.gaji_pokok} onChange={e => setForm(f => ({ ...f, gaji_pokok: Number(e.target.value) }))} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editMode ? "Simpan Perubahan" : "Tambah Karyawan"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
                <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader><SheetTitle>Detail Karyawan</SheetTitle></SheetHeader>
                    {selected && (
                        <div className="space-y-6 mt-6">
                            <div className="flex items-start justify-between">
                                <div><h3 className="text-lg font-semibold">{selected.nama}</h3><p className="text-sm text-muted-foreground">{selected.jabatan}</p></div>
                                <Badge variant={selected.status?.toLowerCase() === "aktif" ? "success" : "warning"}>{selected.status}</Badge>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><p className="text-muted-foreground">HP</p><p className="font-medium">{selected.hp ?? "-"}</p></div>
                                <div><p className="text-muted-foreground">Tgl Masuk</p><p className="font-medium">{selected.tanggal_masuk ? formatDateShort(selected.tanggal_masuk) : "-"}</p></div>
                                <div className="col-span-2"><p className="text-muted-foreground">Alamat</p><p className="font-medium">{selected.alamat ?? "-"}</p></div>
                                <div><p className="text-muted-foreground">Gaji Pokok</p><p className="font-medium">{formatCurrency(selected.gaji_pokok)}</p></div>
                            </div>
                            <div className="flex gap-2">
                                <Button className="flex-1 gap-2" onClick={() => { setDetailOpen(false); openEdit(selected); }}><Pencil className="h-4 w-4" /> Edit</Button>
                                <Button variant="destructive" className="gap-2" onClick={() => { setDetailOpen(false); openDelete(selected); }}><Trash2 className="h-4 w-4" /> Hapus</Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Hapus Karyawan?" description={`Data karyawan "${selected?.nama}" akan dihapus.`} confirmLabel="Ya, Hapus" onConfirm={handleDelete} />
        </div>
    );
}
