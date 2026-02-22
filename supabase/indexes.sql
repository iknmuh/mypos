-- ============================================================
-- MyPOS Database Indexes for Query Optimization
-- Run this in: Supabase Dashboard → SQL Editor
-- Note: Using regular CREATE INDEX (not CONCURRENTLY) for SQL Editor
-- ============================================================

-- ── TRANSACTION INDEXES ──────────────────────────────────────────
-- Composite index for dashboard queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_transaksi_dashboard 
    ON transaksi(store_id, status, created_at DESC) 
    INCLUDE (grand_total, metode)
    WHERE status = 'selesai';

-- Index for transaction list with date filtering
CREATE INDEX IF NOT EXISTS idx_transaksi_store_status_date 
    ON transaksi(store_id, status, created_at DESC);

-- Index for transaction items lookup
CREATE INDEX IF NOT EXISTS idx_transaksi_item_transaksi 
    ON transaksi_item(transaksi_id);

-- Index for product sales reporting
CREATE INDEX IF NOT EXISTS idx_transaksi_item_produk 
    ON transaksi_item(produk_id);

-- ── PRODUCT INDEXES ──────────────────────────────────────────────
-- Index for product listing with search
CREATE INDEX IF NOT EXISTS idx_produk_store_aktif_nama 
    ON produk(store_id, aktif, nama);

-- Index for low stock detection (partial index)
CREATE INDEX IF NOT EXISTS idx_produk_low_stock 
    ON produk(store_id, nama, stok, stok_minimum)
    WHERE aktif = true;

-- Index for kode/SKU lookup
CREATE INDEX IF NOT EXISTS idx_produk_kode 
    ON produk(store_id, kode)
    WHERE kode IS NOT NULL;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_produk_kategori 
    ON produk(store_id, kategori_id)
    WHERE aktif = true;

-- ── STOCK ADJUSTMENT INDEXES ─────────────────────────────────────
-- Index for stock history lookup
CREATE INDEX IF NOT EXISTS idx_stok_adjustment_produk_date 
    ON stok_adjustment(produk_id, created_at DESC);

-- Index for store-wide stock movements
CREATE INDEX IF NOT EXISTS idx_stok_adjustment_store_date 
    ON stok_adjustment(store_id, created_at DESC);

-- ── PURCHASE INDEXES ─────────────────────────────────────────────
-- Index for purchase list with status filtering
CREATE INDEX IF NOT EXISTS idx_pembelian_store_status_date 
    ON pembelian(store_id, status, created_at DESC);

-- Index for purchase items lookup
CREATE INDEX IF NOT EXISTS idx_pembelian_item_pembelian 
    ON pembelian_item(pembelian_id);

-- Index for supplier relationship
CREATE INDEX IF NOT EXISTS idx_pembelian_supplier 
    ON pembelian(store_id, supplier_id);

-- ── HUTANG/PIUTANG INDEXES ───────────────────────────────────────
-- Index for debt list with status filtering
CREATE INDEX IF NOT EXISTS idx_hutang_piutang_store_tipe_status 
    ON hutang_piutang(store_id, tipe, status);

-- Index for due date tracking
CREATE INDEX IF NOT EXISTS idx_hutang_piutang_jatuh_tempo 
    ON hutang_piutang(store_id, tipe, jatuh_tempo)
    WHERE status = 'belum_lunas';

-- Index for payment history
CREATE INDEX IF NOT EXISTS idx_pembayaran_hp_hutang 
    ON pembayaran_hp(hutang_id, created_at DESC);

-- ── JASA/SERVICE INDEXES ─────────────────────────────────────────
-- Index for service list with status filtering
CREATE INDEX IF NOT EXISTS idx_jasa_store_status_date 
    ON jasa(store_id, status, created_at DESC);

-- ── KARYAWAN INDEXES ─────────────────────────────────────────────
-- Index for employee list
CREATE INDEX IF NOT EXISTS idx_karyawan_store_status 
    ON karyawan(store_id, status);

-- Index for payroll by employee
CREATE INDEX IF NOT EXISTS idx_penggajian_karyawan 
    ON penggajian(karyawan_id, periode);

-- Index for payroll by store
CREATE INDEX IF NOT EXISTS idx_penggajian_store_status 
    ON penggajian(store_id, status);

-- ── PENGELUARAN INDEXES ──────────────────────────────────────────
-- Index for expense list with date filtering
CREATE INDEX IF NOT EXISTS idx_pengeluaran_store_date 
    ON pengeluaran(store_id, tanggal DESC);

-- Index for expense category aggregation
CREATE INDEX IF NOT EXISTS idx_pengeluaran_store_kategori 
    ON pengeluaran(store_id, kategori);

-- ── PELANGGAN/SUPPLIER INDEXES ───────────────────────────────────
-- Index for customer search
CREATE INDEX IF NOT EXISTS idx_pelanggan_store_nama 
    ON pelanggan(store_id, nama);

-- Index for supplier search
CREATE INDEX IF NOT EXISTS idx_supplier_store_nama 
    ON supplier(store_id, nama);

-- ── INVENTARIS INDEXES ───────────────────────────────────────────
-- Index for inventory list
CREATE INDEX IF NOT EXISTS idx_inventaris_store_kategori 
    ON inventaris(store_id, kategori);

-- ── KATEGORI INDEXES ─────────────────────────────────────────────
-- Index for category list
CREATE INDEX IF NOT EXISTS idx_kategori_produk_store 
    ON kategori_produk(store_id, nama);

-- ── PARTIAL INDEXES FOR COMMON FILTERS ───────────────────────────
-- Active products only
CREATE INDEX IF NOT EXISTS idx_produk_aktif 
    ON produk(store_id, nama)
    WHERE aktif = true;

-- Unpaid debts only
CREATE INDEX IF NOT EXISTS idx_hutang_piutang_belum_lunas 
    ON hutang_piutang(store_id, tipe, jatuh_tempo)
    WHERE status = 'belum_lunas';

-- Pending services only
CREATE INDEX IF NOT EXISTS idx_jasa_pending 
    ON jasa(store_id, created_at)
    WHERE status IN ('antrian', 'dikerjakan');

-- ── COVERING INDEXES FOR DASHBOARD ───────────────────────────────
-- Covering index for today's sales query
CREATE INDEX IF NOT EXISTS idx_transaksi_today_sales 
    ON transaksi(store_id, created_at)
    INCLUDE (grand_total, metode, pelanggan)
    WHERE status = 'selesai';
