"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
    Search, Barcode, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, QrCode,
    Smartphone, Receipt, User, Printer, Check, X, Loader2
} from "lucide-react";

interface Product {
    id: string;
    nama: string;
    harga_jual: number;
    stok: number;
    kategori: string;
    sku: string;
    barcode: string;
}

interface CartItem extends Product {
    qty: number;
    discount: number;
}

interface Customer {
    id: string;
    nama: string;
    telepon: string;
}

export default function KasirPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [categories, setCategories] = useState<string[]>(["Semua"]);
    const [loading, setLoading] = useState(true);

    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("Semua");
    const [customerOpen, setCustomerOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [discountOpen, setDiscountOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [paymentMethod, setPaymentMethod] = useState("Tunai");
    const [cashAmount, setCashAmount] = useState("");
    const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [lastInvoice, setLastInvoice] = useState("");
    const [catatan, setCatatan] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [prodRes, custRes, katRes] = await Promise.all([
                fetch("/api/produk"), fetch("/api/pelanggan"), fetch("/api/kategori"),
            ]);
            const prodData = await prodRes.json();
            const custData = await custRes.json();
            const katData = await katRes.json();
            setProducts(Array.isArray(prodData) ? prodData : []);
            setCustomers(Array.isArray(custData) ? custData : []);
            const katNames = (Array.isArray(katData) ? katData : []).map((k: { nama: string }) => k.nama);
            setCategories(["Semua", ...katNames]);
        } catch (e) { console.error("Fetch error:", e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredProducts = products.filter(p => {
        const matchSearch = p.nama.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode ?? "").includes(searchTerm) || (p.sku ?? "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = activeCategory === "Semua" || p.kategori === activeCategory;
        return matchSearch && matchCat;
    });

    const addToCart = (product: Product) => {
        if (product.stok <= 0) return;
        setCart(prev => {
            const existing = prev.find(c => c.id === product.id);
            if (existing) {
                if (existing.qty >= product.stok) return prev;
                return prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c);
            }
            return [...prev, { ...product, qty: 1, discount: 0 }];
        });
    };

    const updateQty = (id: string, delta: number) => {
        setCart(prev => prev.map(c => {
            if (c.id !== id) return c;
            const newQty = c.qty + delta;
            if (newQty < 1 || newQty > c.stok) return c;
            return { ...c, qty: newQty };
        }));
    };

    const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));

    const subtotal = cart.reduce((s, c) => s + c.harga_jual * c.qty, 0);
    const totalDiscount = cart.reduce((s, c) => s + c.discount, 0);
    const grandTotal = subtotal - totalDiscount;
    const cashNum = parseInt(cashAmount) || 0;
    const change = cashNum - grandTotal;

    const handlePayment = async () => {
        setSubmitting(true);
        try {
            const res = await fetch("/api/transaksi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pelanggan: selectedCustomer?.nama ?? "Umum",
                    metode: paymentMethod,
                    catatan,
                    items: cart.map(c => ({
                        produk_id: c.id,
                        nama: c.nama,
                        harga: c.harga_jual,
                        jumlah: c.qty,
                        diskon: c.discount,
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan transaksi");
            setLastInvoice(data.nomor ?? "INV-???");
            setPaymentOpen(false);
            setReceiptOpen(true);
        } catch (e) {
            alert((e as Error).message);
        }
        setSubmitting(false);
    };

    const handleNewTransaction = () => {
        setCart([]);
        setSelectedCustomer(null);
        setPaymentMethod("Tunai");
        setCashAmount("");
        setCatatan("");
        setReceiptOpen(false);
        fetchData(); // refresh stock
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] gap-4">
            {/* ─── LEFT: Product Grid ─── */}
            <div className="flex flex-1 flex-col gap-4 overflow-hidden">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Cari produk, scan barcode..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <Button variant="outline" className="gap-2"><Barcode className="h-4 w-4" /> Scan</Button>
                </div>

                <div className="flex gap-2 flex-wrap">
                    {categories.map(c => (
                        <Button key={c} variant={activeCategory === c ? "default" : "outline"} size="sm" onClick={() => setActiveCategory(c)}>{c}</Button>
                    ))}
                </div>

                <ScrollArea className="flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pr-4">
                            {filteredProducts.map(p => (
                                <Card key={p.id} className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${p.stok <= 0 ? "opacity-50" : ""}`} onClick={() => addToCart(p)}>
                                    <CardContent className="p-3">
                                        <div className="aspect-square rounded-lg bg-gradient-to-br from-muted to-muted/30 mb-2 flex items-center justify-center">
                                            <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
                                        </div>
                                        <h4 className="text-sm font-medium truncate">{p.nama}</h4>
                                        <p className="text-xs text-muted-foreground">{p.sku ?? "-"}</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-sm font-bold text-primary">{formatCurrency(p.harga_jual)}</span>
                                            <Badge variant={p.stok <= 5 ? "warning" : "secondary"} className="text-[10px]">{p.stok}</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {filteredProducts.length === 0 && !loading && <p className="col-span-full text-center py-8 text-muted-foreground">Tidak ada produk ditemukan</p>}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* ─── RIGHT: Cart ─── */}
            <Card className="flex w-[380px] flex-col shrink-0">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Keranjang</CardTitle>
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setCustomerOpen(true)}>
                            <User className="h-3.5 w-3.5" /> {selectedCustomer ? selectedCustomer.nama : "Pilih Pelanggan"}
                        </Button>
                    </div>
                </CardHeader>
                <Separator />
                <ScrollArea className="flex-1 px-4">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">Keranjang kosong</p>
                            <p className="text-xs text-muted-foreground">Klik produk untuk menambahkan</p>
                        </div>
                    ) : (
                        <div className="space-y-3 py-3">
                            {cart.map(item => (
                                <div key={item.id} className="flex gap-3 rounded-lg border p-2.5 group">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.nama}</p>
                                        <p className="text-xs text-muted-foreground">{formatCurrency(item.harga_jual)}</p>
                                        {item.discount > 0 && <p className="text-xs text-emerald-600">Diskon: -{formatCurrency(item.discount)}</p>}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                                        <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <p className="text-sm font-semibold">{formatCurrency(item.harga_jual * item.qty - item.discount)}</p>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedCartItem(item); setDiscountOpen(true); }}>%</Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.id)}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="border-t p-4 space-y-3">
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal ({cart.reduce((s, c) => s + c.qty, 0)} item)</span><span>{formatCurrency(subtotal)}</span></div>
                        {totalDiscount > 0 && <div className="flex justify-between text-emerald-600"><span>Diskon</span><span>-{formatCurrency(totalDiscount)}</span></div>}
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="gap-2" disabled={cart.length === 0} onClick={() => setCart([])}>
                            <X className="h-4 w-4" /> Batal
                        </Button>
                        <Button className="gap-2 gradient-primary text-white" disabled={cart.length === 0} onClick={() => setPaymentOpen(true)}>
                            <CreditCard className="h-4 w-4" /> Bayar
                        </Button>
                    </div>
                </div>
            </Card>

            {/* ─── Customer Selection Dialog ─── */}
            <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Pilih Pelanggan</DialogTitle><DialogDescription>Pilih pelanggan atau tambah baru</DialogDescription></DialogHeader>
                    <div className="space-y-2 py-2">
                        <Input placeholder="Cari pelanggan..." />
                        <div className="space-y-1 max-h-[300px] overflow-y-auto">
                            <button className={`w-full flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent ${!selectedCustomer ? "border-primary bg-accent" : ""}`}
                                onClick={() => { setSelectedCustomer(null); setCustomerOpen(false); }}>
                                <div><p className="font-medium">Umum (Non-member)</p><p className="text-xs text-muted-foreground">-</p></div>
                                {!selectedCustomer && <Check className="h-4 w-4 text-primary" />}
                            </button>
                            {customers.map(c => (
                                <button key={c.id} className={`w-full flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent ${selectedCustomer?.id === c.id ? "border-primary bg-accent" : ""}`}
                                    onClick={() => { setSelectedCustomer(c); setCustomerOpen(false); }}>
                                    <div><p className="font-medium">{c.nama}</p><p className="text-xs text-muted-foreground">{c.telepon ?? "-"}</p></div>
                                    {selectedCustomer?.id === c.id && <Check className="h-4 w-4 text-primary" />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCustomerOpen(false)}>Tutup</Button>
                        <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />Pelanggan Baru</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Payment Dialog ─── */}
            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Pembayaran</DialogTitle><DialogDescription>Total: {formatCurrency(grandTotal)}</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label className="mb-2 block">Metode Pembayaran</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: "Tunai", icon: Banknote, label: "Tunai" },
                                    { value: "Transfer", icon: Smartphone, label: "Transfer" },
                                    { value: "QRIS", icon: QrCode, label: "QRIS" },
                                    { value: "Debit", icon: CreditCard, label: "Debit/Kredit" },
                                ].map(m => (
                                    <button key={m.value} className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${paymentMethod === m.value ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent"}`}
                                        onClick={() => setPaymentMethod(m.value)}>
                                        <m.icon className="h-4 w-4" /> {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {paymentMethod === "Tunai" && (
                            <>
                                <div className="grid gap-2"><Label>Jumlah Dibayar</Label><Input type="number" placeholder="0" value={cashAmount} onChange={e => setCashAmount(e.target.value)} className="text-lg font-semibold" /></div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[grandTotal, 50000, 100000, 200000].map(v => (
                                        <Button key={v} variant="outline" size="sm" className="text-xs" onClick={() => setCashAmount(String(v))}>{v === grandTotal ? "Uang Pas" : formatCurrency(v)}</Button>
                                    ))}
                                </div>
                                {cashNum >= grandTotal && cashNum > 0 && (
                                    <div className="flex justify-between text-lg font-bold rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3">
                                        <span>Kembalian</span>
                                        <span className="text-emerald-600">{formatCurrency(change)}</span>
                                    </div>
                                )}
                            </>
                        )}
                        {(paymentMethod === "Transfer" || paymentMethod === "QRIS") && (
                            <div className="rounded-lg border p-4 text-center space-y-2">
                                <QrCode className="h-24 w-24 mx-auto text-muted-foreground/30" />
                                <p className="text-sm text-muted-foreground">{paymentMethod === "QRIS" ? "Scan QRIS untuk membayar" : "Transfer ke rekening toko"}</p>
                                <p className="text-lg font-bold">{formatCurrency(grandTotal)}</p>
                            </div>
                        )}
                        <div className="grid gap-2"><Label>Catatan (opsional)</Label><Textarea placeholder="Catatan transaksi..." className="h-16" value={catatan} onChange={e => setCatatan(e.target.value)} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentOpen(false)}>Batal</Button>
                        <Button onClick={handlePayment} disabled={(paymentMethod === "Tunai" && cashNum < grandTotal) || submitting} className="gap-2">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Konfirmasi Pembayaran
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Receipt Preview Dialog ─── */}
            <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Pembayaran Berhasil</DialogTitle><DialogDescription>Struk transaksi</DialogDescription></DialogHeader>
                    <div className="text-center space-y-4 py-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <Check className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Pembayaran Berhasil!</h3>
                            <p className="text-sm text-muted-foreground">{lastInvoice}</p>
                        </div>
                        <Separator />
                        <div className="text-left space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pelanggan</span><span>{selectedCustomer?.nama ?? "Umum"}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Metode</span><span>{paymentMethod}</span></div>
                            <Separator />
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span>{item.nama} × {item.qty}</span>
                                    <span>{formatCurrency(item.harga_jual * item.qty)}</span>
                                </div>
                            ))}
                            <Separator />
                            <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(grandTotal)}</span></div>
                            {paymentMethod === "Tunai" && cashNum > 0 && (
                                <>
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Dibayar</span><span>{formatCurrency(cashNum)}</span></div>
                                    <div className="flex justify-between text-sm text-emerald-600"><span>Kembalian</span><span>{formatCurrency(change)}</span></div>
                                </>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="flex-1 gap-2"><Printer className="h-4 w-4" /> Cetak Struk</Button>
                        <Button className="flex-1 gap-2" onClick={handleNewTransaction}><Receipt className="h-4 w-4" /> Transaksi Baru</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Item Discount Dialog ─── */}
            <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Diskon Item</DialogTitle><DialogDescription>{selectedCartItem?.nama}</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><Label>Diskon (Rp)</Label><Input type="number" placeholder="0" defaultValue={selectedCartItem?.discount ?? 0} onChange={e => {
                            if (selectedCartItem) {
                                const val = parseInt(e.target.value) || 0;
                                setCart(prev => prev.map(c => c.id === selectedCartItem.id ? { ...c, discount: val } : c));
                            }
                        }} /></div>
                        <div className="grid grid-cols-4 gap-2">
                            {[1000, 2000, 5000, 10000].map(v => (
                                <Button key={v} variant="outline" size="sm" className="text-xs" onClick={() => {
                                    if (selectedCartItem) setCart(prev => prev.map(c => c.id === selectedCartItem.id ? { ...c, discount: v } : c));
                                }}>{formatCurrency(v)}</Button>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDiscountOpen(false)}>Batal</Button>
                        <Button onClick={() => setDiscountOpen(false)}>Terapkan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
