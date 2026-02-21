-- ============================================================
-- MyPOS Database Indexes for Query Optimization
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── TRANSACTION INDEXES ──────────────────────────────────────────
-- Composite index for dashboard queries (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaksi_dashboard 
    ON transaksi(store_id, status, created_at DESC) 
    INCLUDE (grand_total, metode)
    WHERE status = 'selesai';

-- Index for transaction list with date filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaksi_store_status_date 
    ON transaksi(store_id, status, created_at DESC);

-- Index for transaction items lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaksi_item_transaksi 
    ON transaksi_item(transaksi_id);

-- Index for product sales reporting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaksi_item_produk 
    ON transaksi_item(produk_id);

-- ── PRODUCT INDEXES ──────────────────────────────────────────────
-- Index for product listing with search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_produk_store_aktif_nama 
    ON produk(store_id, aktif, nama);

-- Index for low stock detection (partial index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_produk_low_stock 
    ON produk(store_id, nama, stok, stok_minimum)
    WHERE aktif = true;

-- Index for barcode lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_produk_barcode 
    ON produk(store_id, barcode)
    WHERE barcode IS NOT NULL;

-- Index for SKU lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_produk_kode 
    ON produk(store_id, kode)
    WHERE kode IS NOT NULL;

-- Index for category filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_produk_kategori 
    ON produk(store_id, kategori_id)
    WHERE aktif = true;

-- ── STOCK ADJUSTMENT INDEXES ─────────────────────────────────────
-- Index for stock history lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stok_adjustment_produk_date 
    ON stok_adjustment(produk_id, created_at DESC);

-- Index for store-wide stock movements
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stok_adjustment_store_date 
    ON stok_adjustment(store_id, created_at DESC);

-- ── PURCHASE INDEXES ─────────────────────────────────────────────
-- Index for purchase list with status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pembelian_store_status_date 
    ON pembelian(store_id, status, created_at DESC);

-- Index for purchase items lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pembelian_item_pembelian 
    ON pembelian_item(pembelian_id);

-- Index for supplier relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pembelian_supplier 
    ON pembelian(store_id, supplier_id);

-- ── HUTANG/PIUTANG INDEXES ───────────────────────────────────────
-- Index for debt list with status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hutang_piutang_store_tipe_status 
    ON hutang_piutang(store_id, tipe, status);

-- Index for due date tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hutang_piutang_jatuh_tempo 
    ON hutang_piutang(store_id, tipe, jatuh_tempo)
    WHERE status = 'belum_lunas';

-- Index for payment history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pembayaran_hp_hutang 
    ON pembayaran_hp(hutang_id, created_at DESC);

-- ── JASA/SERVICE INDEXES ─────────────────────────────────────────
-- Index for service list with status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jasa_store_status_date 
    ON jasa(store_id, status, created_at DESC);

-- ── KARYAWAN INDEXES ─────────────────────────────────────────────
-- Index for employee list
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_karyawan_store_status 
    ON karyawan(store_id, status);

-- Index for payroll by employee
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_penggajian_karyawan 
    ON penggajian(karyawan_id, periode);

-- Index for payroll by store
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_penggajian_store_status 
    ON penggajian(store_id, status);

-- ── PENGELUARAN INDEXES ──────────────────────────────────────────
-- Index for expense list with date filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pengeluaran_store_date 
    ON pengeluaran(store_id, tanggal DESC);

-- Index for expense category aggregation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pengeluaran_store_kategori 
    ON pengeluaran(store_id, kategori);

-- ── PELANGGAN/SUPPLIER INDEXES ───────────────────────────────────
-- Index for customer search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pelanggan_store_nama 
    ON pelanggan(store_id, nama);

-- Index for supplier search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_store_nama 
    ON supplier(store_id, nama);

-- ── INVENTARIS INDEXES ───────────────────────────────────────────
-- Index for inventory list
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventaris_store_kategori 
    ON inventaris(store_id, kategori);

-- ── KATEGORI INDEXES ─────────────────────────────────────────────
-- Index for category list
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kategori_produk_store 
    ON kategori_produk(store_id, nama);

-- ── AUDIT LOG INDEXES (for future audit system) ──────────────────
-- Index for audit log queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_store_date 
    ON audit_log(store_id, created_at DESC);

-- Index for record-level audit trail
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_record 
    ON audit_log(table_name, record_id);

-- ── FULL-TEXT SEARCH INDEXES ─────────────────────────────────────
-- Full-text search for products (optional, for advanced search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_produk_fulltext 
    ON produk 
    USING GIN (to_tsvector('simple', nama || ' ' || COALESCE(kode, '') || ' ' || COALESCE(kategori, '')));

-- ── PARTIAL INDEXES FOR COMMON FILTERS ───────────────────────────
-- Active products only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_produk_aktif 
    ON produk(store_id, nama)
    WHERE aktif = true;

-- Unpaid debts only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hutang_piutang_belum_lunas 
    ON hutang_piutang(store_id, tipe, jatuh_tempo)
    WHERE status = 'belum_lunas';

-- Pending services only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jasa_pending 
    ON jasa(store_id, created_at)
    WHERE status IN ('antrian', 'dikerjakan');

-- ── COVERING INDEXES FOR DASHBOARD ───────────────────────────────
-- Covering index for today's sales query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaksi_today_sales 
    ON transaksi(store_id, created_at)
    INCLUDE (grand_total, metode, pelanggan)
    WHERE status = 'selesai';

-- ── ANALYZE TABLES AFTER INDEX CREATION ──────────────────────────
ANALYZE transaksi;
ANALYZE transaksi_item;
ANALYZE produk;
ANALYZE stok_adjustment;
ANALYZE pembelian;
ANALYZE pembelian_item;
ANALYZE hutang_piutang;
ANALYZE pembayaran_hp;
ANALYZE jasa;
ANALYZE karyawan;
ANALYZE penggajian;
ANALYZE pengeluaran;
ANALYZE pelanggan;
ANALYZE supplier;
ANALYZE inventaris;
ANALYZE kategori_produk;
