"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Store, Users, Printer, Settings, Shield, UserPlus, Pencil, Trash2,
    Save, Bell, Smartphone, Wifi, Eye, EyeOff, KeyRound, Loader2
} from "lucide-react";

interface StoreSettings {
    nama_toko: string; telepon: string; alamat: string; npwp: string; email: string;
    catatan_struk: string; pajak_aktif: boolean; persentase_pajak: number;
    auto_print: boolean; mata_uang: string; format_tanggal: string;
    notif_stok: boolean; notif_hutang: boolean; notif_laporan: boolean;
    auto_backup: boolean; auto_logout: boolean; waktu_logout: number;
    [key: string]: unknown;
}

interface UserAccount { id: number; name: string; email: string; role: string; status: string; lastLogin: string; }
interface PrinterDevice { id: number; name: string; type: string; port: string; status: string; isDefault: boolean; }

const roles = ["Admin", "Kasir", "Supervisor", "Staff Gudang", "Teknisi"];
const printerTypes = ["Thermal", "Dot Matrix", "Inkjet", "Label"];

const defaultSettings: StoreSettings = {
    nama_toko: "", telepon: "", alamat: "", npwp: "", email: "", catatan_struk: "",
    pajak_aktif: true, persentase_pajak: 11, auto_print: true, mata_uang: "IDR", format_tanggal: "dd/mm/yyyy",
    notif_stok: true, notif_hutang: true, notif_laporan: false, auto_backup: true, auto_logout: true, waktu_logout: 30,
};

const initialUsers: UserAccount[] = [
    { id: 1, name: "Admin", email: "admin@mypos.local", role: "Admin", status: "Aktif", lastLogin: "2026-02-21 09:15" },
    { id: 2, name: "Siti Aminah", email: "siti@mypos.local", role: "Kasir", status: "Aktif", lastLogin: "2026-02-21 08:00" },
];

const initialPrinters: PrinterDevice[] = [
    { id: 1, name: "Printer Kasir 1", type: "Thermal", port: "USB001", status: "Online", isDefault: true },
    { id: 2, name: "Printer Gudang", type: "Dot Matrix", port: "USB002", status: "Offline", isDefault: false },
];

export default function PengaturanPage() {
    const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState(initialUsers);
    const [printers, setPrinters] = useState(initialPrinters);
    const [userFormOpen, setUserFormOpen] = useState(false);
    const [printerFormOpen, setPrinterFormOpen] = useState(false);
    const [deleteUserOpen, setDeleteUserOpen] = useState(false);
    const [deletePrinterOpen, setDeletePrinterOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
    const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/pengaturan");
            if (res.ok) {
                const data = await res.json();
                // Ensure no null values reach controlled inputs
                const sanitized = Object.fromEntries(
                    Object.entries({ ...defaultSettings, ...data }).map(([k, v]) => [k, v ?? defaultSettings[k] ?? ""])
                );
                setSettings(sanitized as StoreSettings);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/pengaturan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
            if (!res.ok) throw new Error("Gagal menyimpan");
            alert("Pengaturan berhasil disimpan!");
        } catch (e) { alert((e as Error).message); }
        setSaving(false);
    };

    const openAddUser = () => { setSelectedUser(null); setEditMode(false); setUserFormOpen(true); };
    const openEditUser = (u: UserAccount) => { setSelectedUser(u); setEditMode(true); setUserFormOpen(true); };
    const openDeleteUser = (u: UserAccount) => { setSelectedUser(u); setDeleteUserOpen(true); };
    const openAddPrinter = () => { setSelectedPrinter(null); setEditMode(false); setPrinterFormOpen(true); };
    const openEditPrinter = (p: PrinterDevice) => { setSelectedPrinter(p); setEditMode(true); setPrinterFormOpen(true); };
    const openDeletePrinter = (p: PrinterDevice) => { setSelectedPrinter(p); setDeletePrinterOpen(true); };

    const handleDeleteUser = () => { if (selectedUser) setUsers(prev => prev.filter(u => u.id !== selectedUser.id)); };
    const handleDeletePrinter = () => { if (selectedPrinter) setPrinters(prev => prev.filter(p => p.id !== selectedPrinter.id)); };

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Pengaturan" description="Kelola konfigurasi sistem dan aplikasi" />

            <Tabs defaultValue="toko">
                <TabsList>
                    <TabsTrigger value="toko" className="gap-2"><Store className="h-4 w-4" /> Toko</TabsTrigger>
                    <TabsTrigger value="pengguna" className="gap-2"><Users className="h-4 w-4" /> Pengguna</TabsTrigger>
                    <TabsTrigger value="perangkat" className="gap-2"><Printer className="h-4 w-4" /> Perangkat</TabsTrigger>
                    <TabsTrigger value="lainnya" className="gap-2"><Settings className="h-4 w-4" /> Lainnya</TabsTrigger>
                </TabsList>

                {/* ─── TOKO TAB ─── */}
                <TabsContent value="toko" className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Profil Toko</CardTitle><CardDescription>Informasi dasar toko Anda</CardDescription></CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2"><Label>Nama Toko *</Label><Input value={settings.nama_toko} onChange={e => setSettings(s => ({ ...s, nama_toko: e.target.value }))} /></div>
                                <div className="grid gap-2"><Label>No. Telepon</Label><Input value={settings.telepon} onChange={e => setSettings(s => ({ ...s, telepon: e.target.value }))} /></div>
                            </div>
                            <div className="grid gap-2"><Label>Alamat</Label><Textarea value={settings.alamat} onChange={e => setSettings(s => ({ ...s, alamat: e.target.value }))} className="h-16" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2"><Label>NPWP</Label><Input value={settings.npwp} onChange={e => setSettings(s => ({ ...s, npwp: e.target.value }))} /></div>
                                <div className="grid gap-2"><Label>Email</Label><Input value={settings.email} onChange={e => setSettings(s => ({ ...s, email: e.target.value }))} /></div>
                            </div>
                            <div className="grid gap-2"><Label>Catatan Struk</Label><Textarea value={settings.catatan_struk} onChange={e => setSettings(s => ({ ...s, catatan_struk: e.target.value }))} className="h-16" /></div>
                            <Button className="w-fit gap-2" onClick={handleSaveSettings} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">Pengaturan Penjualan</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div><Label>Pajak (PPN)</Label><p className="text-xs text-muted-foreground">Terapkan PPN {settings.persentase_pajak}% pada transaksi</p></div>
                                <Switch checked={settings.pajak_aktif} onCheckedChange={v => setSettings(s => ({ ...s, pajak_aktif: v }))} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div><Label>Auto Print Struk</Label><p className="text-xs text-muted-foreground">Cetak struk otomatis setelah pembayaran</p></div>
                                <Switch checked={settings.auto_print} onCheckedChange={v => setSettings(s => ({ ...s, auto_print: v }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2"><Label>Mata Uang</Label>
                                    <Select value={settings.mata_uang} onValueChange={v => setSettings(s => ({ ...s, mata_uang: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="IDR">IDR - Rupiah</SelectItem><SelectItem value="USD">USD - Dollar</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2"><Label>Format Tanggal</Label>
                                    <Select value={settings.format_tanggal} onValueChange={v => setSettings(s => ({ ...s, format_tanggal: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem><SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button className="w-fit gap-2" onClick={handleSaveSettings} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── PENGGUNA TAB ─── */}
                <TabsContent value="pengguna" className="space-y-4">
                    <div className="flex justify-end"><Button className="gap-2" onClick={openAddUser}><UserPlus className="h-4 w-4" /> Tambah Pengguna</Button></div>
                    <div className="grid gap-3">
                        {users.map(u => (
                            <Card key={u.id}>
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{u.name.charAt(0).toUpperCase()}</div>
                                        <div><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="secondary">{u.role}</Badge>
                                        <Badge variant={u.status === "Aktif" ? "success" : "secondary"}>{u.status}</Badge>
                                        <p className="text-xs text-muted-foreground hidden md:block">Login: {u.lastLogin}</p>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedUser(u); setPasswordOpen(true); }}><KeyRound className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditUser(u)}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeleteUser(u)} disabled={u.role === "Admin"}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ─── PERANGKAT TAB ─── */}
                <TabsContent value="perangkat" className="space-y-4">
                    <div className="flex justify-end"><Button className="gap-2" onClick={openAddPrinter}><Printer className="h-4 w-4" /> Tambah Printer</Button></div>
                    <div className="grid gap-3">
                        {printers.map(p => (
                            <Card key={p.id}>
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${p.status === "Online" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" : "bg-muted text-muted-foreground"}`}><Printer className="h-5 w-5" /></div>
                                        <div>
                                            <div className="flex items-center gap-2"><p className="font-medium">{p.name}</p>{p.isDefault && <Badge variant="info" className="text-[10px]">Default</Badge>}</div>
                                            <p className="text-xs text-muted-foreground">{p.type} • Port: {p.port}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={p.status === "Online" ? "success" : "secondary"}>{p.status}</Badge>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditPrinter(p)}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDeletePrinter(p)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <Card>
                        <CardHeader><CardTitle className="text-base">Perangkat Lainnya</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30"><Smartphone className="h-5 w-5" /></div><div><Label>Barcode Scanner</Label><p className="text-xs text-muted-foreground">Scanner Wireless Bluetooth</p></div></div>
                                <Badge variant="success">Terhubung</Badge>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30"><Wifi className="h-5 w-5" /></div><div><Label>Customer Display</Label><p className="text-xs text-muted-foreground">Tidak terhubung</p></div></div>
                                <Badge variant="secondary">Offline</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── LAINNYA TAB ─── */}
                <TabsContent value="lainnya" className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Notifikasi</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3"><Bell className="h-5 w-5 text-muted-foreground" /><div><Label>Stok Menipis</Label><p className="text-xs text-muted-foreground">Alert saat stok di bawah minimum</p></div></div>
                                <Switch checked={settings.notif_stok} onCheckedChange={v => setSettings(s => ({ ...s, notif_stok: v }))} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3"><Bell className="h-5 w-5 text-muted-foreground" /><div><Label>Hutang Jatuh Tempo</Label><p className="text-xs text-muted-foreground">Pengingat hutang mendekati deadline</p></div></div>
                                <Switch checked={settings.notif_hutang} onCheckedChange={v => setSettings(s => ({ ...s, notif_hutang: v }))} />
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3"><Bell className="h-5 w-5 text-muted-foreground" /><div><Label>Laporan Harian</Label><p className="text-xs text-muted-foreground">Kirim ringkasan penjualan harian</p></div></div>
                                <Switch checked={settings.notif_laporan} onCheckedChange={v => setSettings(s => ({ ...s, notif_laporan: v }))} />
                            </div>
                            <Button className="w-fit gap-2" onClick={handleSaveSettings} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">Keamanan</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3"><Shield className="h-5 w-5 text-muted-foreground" /><div><Label>Auto-Logout</Label><p className="text-xs text-muted-foreground">Logout otomatis setelah idle</p></div></div>
                                <Switch checked={settings.auto_logout} onCheckedChange={v => setSettings(s => ({ ...s, auto_logout: v }))} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Waktu Auto-Logout (menit)</Label>
                                <Select value={String(settings.waktu_logout)} onValueChange={v => setSettings(s => ({ ...s, waktu_logout: Number(v) }))}><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="15">15 menit</SelectItem><SelectItem value="30">30 menit</SelectItem><SelectItem value="60">60 menit</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <Button className="w-fit gap-2" onClick={handleSaveSettings} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">Data & Backup</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div><Label>Backup Otomatis</Label><p className="text-xs text-muted-foreground">Backup data harian ke cloud</p></div>
                                <Switch checked={settings.auto_backup} onCheckedChange={v => setSettings(s => ({ ...s, auto_backup: v }))} />
                            </div>
                            <Separator />
                            <div className="flex gap-2">
                                <Button variant="outline" className="gap-2"><Save className="h-4 w-4" /> Backup Manual</Button>
                                <Button variant="outline" className="gap-2" disabled>Restore Data</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ─── User Add/Edit Dialog ─── */}
            <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editMode ? "Edit Pengguna" : "Tambah Pengguna Baru"}</DialogTitle><DialogDescription>{editMode ? "Ubah data pengguna" : "Isi data pengguna baru"}</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Nama Lengkap *</Label><Input defaultValue={selectedUser?.name ?? ""} placeholder="Nama lengkap" /></div>
                        <div className="grid gap-2"><Label>Email *</Label><Input type="email" defaultValue={selectedUser?.email ?? ""} placeholder="email@mypos.local" /></div>
                        <div className="grid gap-2"><Label>Role *</Label>
                            <Select defaultValue={selectedUser?.role}><SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                                <SelectContent>{roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        {!editMode && (
                            <div className="grid gap-2"><Label>Password *</Label>
                                <div className="relative"><Input type={showPassword ? "text" : "password"} placeholder="Min. 6 karakter" />
                                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                                </div>
                            </div>
                        )}
                        {editMode && (
                            <div className="grid gap-2"><Label>Status</Label>
                                <Select defaultValue={selectedUser?.status}><SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Nonaktif">Nonaktif</SelectItem></SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setUserFormOpen(false)}>Batal</Button><Button onClick={() => setUserFormOpen(false)}>{editMode ? "Simpan" : "Tambah"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Change Password Dialog ─── */}
            <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Ganti Password</DialogTitle><DialogDescription>{selectedUser?.name}</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Password Baru *</Label><Input type="password" placeholder="Min. 6 karakter" /></div>
                        <div className="grid gap-2"><Label>Konfirmasi Password *</Label><Input type="password" placeholder="Ulangi password" /></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setPasswordOpen(false)}>Batal</Button><Button onClick={() => setPasswordOpen(false)}>Ganti Password</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Printer Add/Edit Dialog ─── */}
            <Dialog open={printerFormOpen} onOpenChange={setPrinterFormOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editMode ? "Edit Printer" : "Tambah Printer Baru"}</DialogTitle><DialogDescription>Konfigurasi perangkat printer</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Nama Printer *</Label><Input defaultValue={selectedPrinter?.name ?? ""} placeholder="Nama printer" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2"><Label>Tipe *</Label>
                                <Select defaultValue={selectedPrinter?.type}><SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                                    <SelectContent>{printerTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2"><Label>Port</Label><Input defaultValue={selectedPrinter?.port ?? ""} placeholder="USB001" /></div>
                        </div>
                        <div className="flex items-center justify-between"><Label>Jadikan Default</Label><Switch defaultChecked={selectedPrinter?.isDefault} /></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setPrinterFormOpen(false)}>Batal</Button><Button onClick={() => setPrinterFormOpen(false)}>{editMode ? "Simpan" : "Tambah"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog open={deleteUserOpen} onOpenChange={setDeleteUserOpen} title="Hapus Pengguna?" description={`Akun "${selectedUser?.name}" akan dihapus permanen.`} confirmLabel="Ya, Hapus" onConfirm={handleDeleteUser} />
            <ConfirmDialog open={deletePrinterOpen} onOpenChange={setDeletePrinterOpen} title="Hapus Printer?" description={`Printer "${selectedPrinter?.name}" akan dihapus.`} confirmLabel="Ya, Hapus" onConfirm={handleDeletePrinter} />
        </div>
    );
}
