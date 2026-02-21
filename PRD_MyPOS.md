# MyPOS — Tech Spec Document (v1.1)
_Web-first POS + Inventory + Service + Finance untuk Multi-Tenant SaaS (UMKM-friendly, Bahasa Indonesia)_

## 0) Keputusan Produk
- **Platform**: Web App (Next.js) → bisa dibuka di HP/Tablet/PC (device manapun)
- **Mode Offline**: PWA + antrean transaksi (outbox) untuk POS, sinkron saat online
- **Target pengguna**: masyarakat umum & UMKM (kelas menengah ke bawah) → **UI bahasa Indonesia sederhana**
- **Multi-tenant SaaS**: cloud
- **Currency**: **IDR**
- **Payment method**: Tunai / Transfer / QRIS / E-wallet (**hanya metode bayar**, bukan ledger terpisah)
- **Stack**: Next.js + shadcn/ui + Supabase + Clerk Auth + ai-sdk (Gemini)

---

## 1) Tujuan Sistem
### 1.1 Outcome
- Pencatatan penjualan/pembelian/stok/kas/hutang/piutang **terhubung otomatis**
- Owner bisa lihat **omzet, profit, stok menipis, hutang/piutang jatuh tempo** tanpa Excel manual
- Kasir bisa transaksi cepat (scan → bayar → struk) bahkan saat internet putus

### 1.2 Prinsip (Best Practice)
1. **Single source of truth**: Postgres (Supabase) sebagai data utama.
2. **Append-only untuk transaksi**: koreksi via Void/Retur, bukan edit transaksi lama.
3. **Ledger-based**: stok dan kas tercatat lewat mutasi (ledger) agar konsisten.
4. **Auditability**: perubahan penting wajib ada audit log.
5. **UMKM-friendly**: mode sederhana sebagai default, akuntansi detail disembunyikan.

---

## 2) Arsitektur Tingkat Tinggi
### 2.1 Komponen
- **Next.js (App Router)**: UI utama (Owner/Admin/Kasir/Service)
- **Clerk Auth**: autentikasi user, session, identitas pengguna
- **Supabase**:
  - Postgres (RLS untuk isolasi tenant)
  - Storage (opsional: export PDF/Excel, arsip)
  - Realtime (opsional: dashboard live)
- **AI**:
  - `ai-sdk` (streaming chat)
  - Google Gemini API (jawab pakai data tool)
- **PWA Layer**:
  - Service Worker caching (shell UI)
  - IndexedDB (cache master produk + outbox transaksi)

### 2.2 Multi-Tenant Model
- Semua data bisnis wajib punya `tenant_id`
- User punya akses melalui `tenant_members`
- RLS menolak akses lintas tenant

---

## 3) Offline-first POS (PWA)
### 3.1 Apa yang bisa offline
- Tambah transaksi POS (penjualan) + pembayaran
- Cetak struk sederhana (opsional, tergantung device)
- Simpan transaksi ke outbox untuk sinkronisasi

### 3.2 Data yang disimpan lokal
**Cache (read-only)**
- Produk ringkas (nama, barcode, harga)
- Metode pembayaran
- Cabang/gudang default

**Outbox (write)**
- Draft transaksi POS yang sudah diproses (PENDING_SYNC)
- Payload pembayaran

### 3.3 Sync Flow
1. Transaksi dibuat → tersimpan ke IndexedDB (status `PENDING_SYNC`)
2. Saat online → `POST /api/pos/sync` (batch)
3. Server proses idempotent → mengembalikan status per transaksi
4. Lokal ditandai `SYNCED` atau `FAILED` (pesan Indonesia yang jelas)

### 3.4 Konflik & Idempotensi
- Transaksi: append-only (idempotent via `client_txn_id`)
- Master data: server-wins (berdasarkan `updated_at` / version)

---

## 4) UX & Bahasa Indonesia (UMKM-friendly)
### 4.1 Prinsip UI
- Istilah sederhana, minim jargon akuntansi
- 1 layar = 1 tujuan (tidak membingungkan)
- Tombol aksi utama jelas (mis. **Proses**, **Simpan**)
- Validasi dan error message bahasa Indonesia

### 4.2 Glossary (wajib konsisten)
- Invoice → **Struk/Tagihan**
- Sales → **Penjualan**
- Purchase → **Pembelian**
- Accounts Receivable → **Piutang**
- Accounts Payable → **Hutang**
- Stock Adjustment → **Penyesuaian Stok**
- Journal Entry → **Catatan Keuangan**
- Shift Close → **Tutup Kas**
- Work Order → **Order Jasa**

### 4.3 Mode Sederhana vs Lanjutan
- **Mode Sederhana (default)**:
  - dashboard, kas masuk/keluar, hutang/piutang, omzet, laba ringkas
  - jurnal/neraca disembunyikan
- **Mode Lanjutan**:
  - COA, jurnal detail, neraca lengkap

---

## 5) Modul & Navigasi (Label Indonesia)
Menu utama (contoh):
1. **Kasir**
2. **Barang & Stok**
3. **Jasa/Service**
4. **Pembelian**
5. **Hutang & Piutang**
6. **Pengeluaran**
7. **Karyawan & Gaji**
8. **Laporan**
9. **Dashboard**
10. **Tanya AI**
11. **Pengaturan**

---

## 6) AI “Tanya AI” (Gemini + ai-sdk)
### 6.1 Tujuan
Memberikan jawaban cepat seputar bisnis (omzet, stok menipis, jatuh tempo hutang/piutang) **tanpa mengarang**.

### 6.2 Desain
- Quick chips: “Omzet hari ini”, “Stok menipis”, “Piutang jatuh tempo”, “Produk terlaris”
- Jawaban ringkas + tombol **Lihat Detail**

### 6.3 Non-hallucination
AI wajib menjawab berdasarkan data tool:
- Model → panggil tool → server query DB → model menjawab dari hasil

### 6.4 Tools minimal (MVP)
- `get_omzet_profit(range, branch_id?)`
- `get_top_produk(range, limit)`
- `get_stok_menipis(branch_id?, warehouse_id?)`
- `get_hutang_jatuh_tempo(as_of_date)`
- `get_piutang_jatuh_tempo(as_of_date)`

---

## 7) API Surface (Server Posting yang Atomic)
### 7.1 Endpoint utama
- `POST /api/pos/sync` — batch posting transaksi dari outbox
- `POST /api/sales/post` — posting penjualan (online mode)
- `POST /api/purchase/receipt/post` — penerimaan barang + hutang
- `POST /api/service/post` — posting service selesai + invoice
- `POST /api/stock/opname/post` — posting opname + penyesuaian
- `POST /api/ai/chat` — chat streaming ai-sdk + Gemini

### 7.2 Kenapa posting harus di server
Agar konsisten:
- stok ledger
- pembayaran (kas/bank)
- hutang/piutang
- jurnal
- audit log
Semua dilakukan dalam transaksi database (atomic).

---

## 8) Database Schema (Supabase Postgres)
### 8.1 Konvensi
- PK: `uuid` (default `gen_random_uuid()`)
- Timestamp: `timestamptz` (`now()`)
- Hampir semua tabel bisnis: `tenant_id`, `created_at`, `updated_at`
- Constraint: angka qty/amount >= 0
- Index: FK + query utama (by tenant, created_at)

---

# 9) Database Tables

## 9.1 Multi-tenant & User
### `tenants`
- `id uuid pk`
- `name text`
- `plan text`
- `currency_code text default 'IDR'`
- `created_at timestamptz`
- `updated_at timestamptz`

### `users`
- `id uuid pk`
- `clerk_user_id text unique not null`
- `email text`
- `full_name text`
- `created_at timestamptz`
- `updated_at timestamptz`

### `tenant_members`
- `id uuid pk`
- `tenant_id uuid fk tenants`
- `user_id uuid fk users`
- `role text` (OWNER/ADMIN/CASHIER/TECHNICIAN)
- `branch_id uuid null` (opsional pembatasan cabang)
- `created_at timestamptz`
- Unique: `(tenant_id, user_id)`

### `tenant_settings`
- `tenant_id uuid pk fk tenants`
- `ui_language text default 'id-ID'`
- `simple_mode bool default true`
- `default_branch_id uuid null`
- `default_warehouse_id uuid null`

---

## 9.2 Cabang, Gudang, Kas/Metode Bayar
### `branches`
- `id uuid pk`
- `tenant_id uuid`
- `name text`
- `address text`
- `phone text`
- `is_active bool default true`

### `warehouses`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid fk branches`
- `name text`
- `is_active bool default true`

### `cash_accounts`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid fk branches`
- `type text` (CASH, BANK)
- `name text`
- `bank_name text null`
- `account_no text null`
- `opening_balance numeric(18,2) default 0`
- `is_active bool default true`

### `payment_methods`
- `id uuid pk`
- `tenant_id uuid`
- `name text` (Tunai, Transfer, QRIS, GoPay, OVO, dll)
- `type text` (CASH, BANK_TRANSFER, QRIS, EWALLET, OTHER)
- `cash_account_id uuid null fk cash_accounts` (opsional mapping posting)
- `is_active bool default true`

---

## 9.3 Master Data Produk & Partner
### `product_categories`
- `id uuid pk`
- `tenant_id uuid`
- `name text`
- `parent_id uuid null fk product_categories`

### `units`
- `id uuid pk`
- `tenant_id uuid`
- `name text` (pcs, box, liter)
- `symbol text` (pcs, bx, L)

### `products`
- `id uuid pk`
- `tenant_id uuid`
- `category_id uuid null`
- `name text not null`
- `sku text null`
- `barcode text null`
- `base_unit_id uuid fk units`
- `track_stock bool default true`
- `track_batch_expiry bool default false`
- `track_serial bool default false`
- `min_stock numeric(18,3) default 0`
- `is_active bool default true`
- `created_at timestamptz`
- `updated_at timestamptz`
Indexes:
- unique `(tenant_id, barcode)` where barcode is not null

### `product_unit_conversions`
- `id uuid pk`
- `tenant_id uuid`
- `product_id uuid fk products`
- `from_unit_id uuid fk units`
- `to_unit_id uuid fk units`
- `multiplier numeric(18,6)`

### `product_prices`
- `id uuid pk`
- `tenant_id uuid`
- `product_id uuid fk products`
- `price_level text` (RETAIL, WHOLESALE, CUSTOM1)
- `price_sell numeric(18,2)`
- `created_at timestamptz`

### `suppliers`
- `id uuid pk`
- `tenant_id uuid`
- `name text`
- `phone text`
- `address text`
- `terms_days int default 0`
- `is_active bool default true`

### `customers`
- `id uuid pk`
- `tenant_id uuid`
- `name text`
- `phone text`
- `address text`
- `credit_limit numeric(18,2) default 0`
- `is_active bool default true`

### `employees`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid`
- `name text`
- `phone text`
- `role_title text`
- `is_active bool default true`

### `services`
- `id uuid pk`
- `tenant_id uuid`
- `name text`
- `category text null`
- `base_price numeric(18,2) default 0`
- `is_active bool default true`

---

## 9.4 Inventory (Ledger + Cache)
### `inventory_balances` (cache cepat)
- `id uuid pk`
- `tenant_id uuid`
- `warehouse_id uuid`
- `product_id uuid`
- `qty_on_hand numeric(18,3) default 0`
- Unique: `(tenant_id, warehouse_id, product_id)`

### `stock_ledger` (append-only)
- `id uuid pk`
- `tenant_id uuid`
- `warehouse_id uuid`
- `product_id uuid`
- `ref_type text` (SALE, PURCHASE, SERVICE_CONSUME, ADJUSTMENT, TRANSFER, RETURN_SALE, RETURN_PURCHASE)
- `ref_id uuid`
- `qty_in numeric(18,3) default 0`
- `qty_out numeric(18,3) default 0`
- `unit_cost numeric(18,2) null`
- `batch_id uuid null`
- `created_at timestamptz`

### `product_batches` (Phase 2)
- `id uuid pk`
- `tenant_id uuid`
- `product_id uuid`
- `batch_no text`
- `expiry_date date null`
- Unique: `(tenant_id, product_id, batch_no)`

### `product_serials` (Phase 2)
- `id uuid pk`
- `tenant_id uuid`
- `product_id uuid`
- `serial_no text`
- `status text` (IN_STOCK, SOLD, RETURNED, DEFECT)
- Unique: `(tenant_id, product_id, serial_no)`

### `stock_transfers`
- `id uuid pk`
- `tenant_id uuid`
- `from_warehouse_id uuid`
- `to_warehouse_id uuid`
- `status text` (DRAFT, POSTED, CANCELLED)
- `created_at timestamptz`
- `posted_at timestamptz null`

### `stock_transfer_items`
- `id uuid pk`
- `tenant_id uuid`
- `transfer_id uuid fk stock_transfers`
- `product_id uuid`
- `qty numeric(18,3)`

### `stock_opnames`
- `id uuid pk`
- `tenant_id uuid`
- `warehouse_id uuid`
- `mode text` (MANUAL, SCANNER)
- `status text` (DRAFT, POSTED, CANCELLED)
- `created_at timestamptz`
- `posted_at timestamptz null`

### `stock_opname_items`
- `id uuid pk`
- `tenant_id uuid`
- `opname_id uuid`
- `product_id uuid`
- `qty_system numeric(18,3)`
- `qty_counted numeric(18,3)`
- `diff_qty numeric(18,3)`

---

## 9.5 POS Sales + Payment + Shift
### `sales_invoices`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid`
- `warehouse_id uuid`
- `customer_id uuid null`
- `invoice_no text`
- `status text` (DRAFT, PAID, PARTIAL, UNPAID, VOID)
- `subtotal numeric(18,2)`
- `discount_total numeric(18,2) default 0`
- `tax_total numeric(18,2) default 0`
- `grand_total numeric(18,2)`
- `paid_total numeric(18,2) default 0`
- `due_total numeric(18,2) default 0`
- `created_by uuid fk users`
- `created_at timestamptz`
- `updated_at timestamptz`
Unique: `(tenant_id, invoice_no)`

### `sales_invoice_items`
- `id uuid pk`
- `tenant_id uuid`
- `invoice_id uuid fk sales_invoices`
- `product_id uuid`
- `qty numeric(18,3)`
- `unit_price numeric(18,2)`
- `discount numeric(18,2) default 0`
- `line_total numeric(18,2)`
- `batch_id uuid null`
- `serial_id uuid null`

### `payments`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid`
- `payment_no text`
- `direction text` (IN, OUT)
- `payment_method_id uuid fk payment_methods`
- `cash_account_id uuid null fk cash_accounts`
- `amount numeric(18,2)`
- `ref_type text` (SALE_INVOICE, AP_BILL, AR_INVOICE, EXPENSE, PAYROLL)
- `ref_id uuid`
- `paid_at timestamptz`
- `created_by uuid`

### `cash_shifts`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid`
- `cash_account_id uuid`
- `cashier_user_id uuid`
- `opened_at timestamptz`
- `closed_at timestamptz null`
- `opening_cash numeric(18,2)`
- `expected_cash numeric(18,2) default 0`
- `actual_cash numeric(18,2) null`
- `variance_cash numeric(18,2) null`
- `status text` (OPEN, CLOSED)

---

## 9.6 Service Management
### `service_orders`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid`
- `warehouse_id uuid`
- `customer_id uuid`
- `work_order_no text`
- `complaint text`
- `status text` (WAITING, PROGRESS, DONE, CANCELLED)
- `assigned_employee_id uuid null`
- `subtotal numeric(18,2)`
- `grand_total numeric(18,2)`
- `linked_invoice_id uuid null fk sales_invoices`
- `created_at timestamptz`
- `updated_at timestamptz`
Unique: `(tenant_id, work_order_no)`

### `service_order_services`
- `id uuid pk`
- `tenant_id uuid`
- `service_order_id uuid`
- `service_id uuid`
- `qty numeric(18,3) default 1`
- `unit_price numeric(18,2)`
- `line_total numeric(18,2)`

### `service_order_parts`
- `id uuid pk`
- `tenant_id uuid`
- `service_order_id uuid`
- `product_id uuid`
- `qty numeric(18,3)`
- `unit_price numeric(18,2)`
- `line_total numeric(18,2)`
- `batch_id uuid null`
- `serial_id uuid null`

---

## 9.7 Procurement + Hutang (AP)
### `purchase_orders`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid`
- `supplier_id uuid`
- `po_no text`
- `status text` (DRAFT, SENT, RECEIVED, CANCELLED)
- `created_at timestamptz`
- `updated_at timestamptz`

### `purchase_order_items`
- `id uuid pk`
- `tenant_id uuid`
- `purchase_order_id uuid`
- `product_id uuid`
- `qty numeric(18,3)`
- `unit_cost numeric(18,2)`
- `line_total numeric(18,2)`

### `purchase_receipts`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid`
- `warehouse_id uuid`
- `supplier_id uuid`
- `receipt_no text`
- `status text` (DRAFT, POSTED, CANCELLED)
- `received_at timestamptz`

### `purchase_receipt_items`
- `id uuid pk`
- `tenant_id uuid`
- `receipt_id uuid`
- `product_id uuid`
- `qty numeric(18,3)`
- `unit_cost numeric(18,2)`
- `batch_id uuid null`
- `serial_id uuid null`

### `ap_bills`
- `id uuid pk`
- `tenant_id uuid`
- `supplier_id uuid`
- `bill_no text`
- `status text` (UNPAID, PARTIAL, PAID, VOID)
- `bill_date date`
- `due_date date`
- `amount_total numeric(18,2)`
- `paid_total numeric(18,2) default 0`
- `remaining_total numeric(18,2) default 0`
- `ref_receipt_id uuid null`
- `created_at timestamptz`

---

## 9.8 Piutang (AR)
### `ar_invoices`
- `id uuid pk`
- `tenant_id uuid`
- `customer_id uuid`
- `invoice_id uuid fk sales_invoices`
- `invoice_date date`
- `due_date date`
- `amount_total numeric(18,2)`
- `paid_total numeric(18,2) default 0`
- `remaining_total numeric(18,2) default 0`
- `status text` (UNPAID, PARTIAL, PAID, VOID)

---

## 9.9 Pengeluaran + Payroll (Sederhana)
### `expenses`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid`
- `expense_no text`
- `category text` (OPERATIONS, RENT, ELECTRICITY, INVENTORY, OTHER)
- `description text`
- `amount numeric(18,2)`
- `expense_date date`
- `created_by uuid`

### `attendance`
- `id uuid pk`
- `tenant_id uuid`
- `employee_id uuid`
- `date date`
- `status text` (PRESENT, ABSENT, LEAVE)
- `check_in timestamptz null`
- `check_out timestamptz null`

### `payroll_runs`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid`
- `period_start date`
- `period_end date`
- `status text` (DRAFT, POSTED)
- `total_amount numeric(18,2)`

### `payroll_items`
- `id uuid pk`
- `tenant_id uuid`
- `payroll_run_id uuid`
- `employee_id uuid`
- `base_salary numeric(18,2)`
- `bonus numeric(18,2) default 0`
- `commission numeric(18,2) default 0`
- `deduction numeric(18,2) default 0`
- `net_pay numeric(18,2)`

---

## 9.10 Accounting (Internal, bisa disembunyikan di Mode Sederhana)
### `accounts` (COA)
- `id uuid pk`
- `tenant_id uuid`
- `code text`
- `name text`
- `type text` (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
- Unique: `(tenant_id, code)`

### `journal_entries`
- `id uuid pk`
- `tenant_id uuid`
- `entry_no text`
- `entry_date date`
- `ref_type text`
- `ref_id uuid`
- `memo text`
- `created_at timestamptz`

### `journal_lines`
- `id uuid pk`
- `tenant_id uuid`
- `journal_entry_id uuid`
- `account_id uuid`
- `debit numeric(18,2) default 0`
- `credit numeric(18,2) default 0`

---

## 9.11 Audit Log
### `audit_logs`
- `id uuid pk`
- `tenant_id uuid`
- `actor_user_id uuid`
- `action text` (CREATE/UPDATE/DELETE/POST/VOID)
- `entity text`
- `entity_id uuid`
- `before jsonb null`
- `after jsonb null`
- `created_at timestamptz`

---

## 9.12 AI Chat
### `ai_conversations`
- `id uuid pk`
- `tenant_id uuid`
- `user_id uuid`
- `title text`
- `created_at timestamptz`

### `ai_messages`
- `id uuid pk`
- `tenant_id uuid`
- `conversation_id uuid`
- `role text` (user, assistant, tool)
- `content text`
- `created_at timestamptz`

---

## 9.13 Terminal POS & Sync (Web device)
### `pos_terminals`
- `id uuid pk`
- `tenant_id uuid`
- `branch_id uuid`
- `name text` (contoh: “Kasir Depan”)
- `last_seen_at timestamptz`
- `created_at timestamptz`

### `sync_transactions`
- `id uuid pk`
- `tenant_id uuid`
- `terminal_id uuid fk pos_terminals`
- `client_txn_id text`
- `server_ref_type text`
- `server_ref_id uuid`
- `status text` (ACCEPTED, REJECTED)
- `error_message text null`
- `created_at timestamptz`
Unique: `(tenant_id, terminal_id, client_txn_id)`

---

## 10) RLS (Garis Besar)
Untuk semua tabel yang punya `tenant_id`:
- SELECT/INSERT/UPDATE/DELETE diizinkan jika user adalah anggota tenant (`tenant_members`)
- Jika `tenant_members.branch_id` terisi, batasi akses hanya data `branch_id` tersebut (untuk tabel yang punya branch)

---

## 11) Alur Aplikasi (User Flow)

### 11.1 Onboarding Toko (Owner)
1. **Daftar/Login** (Clerk)
2. **Buat Toko** (Nama Toko, HP, alamat opsional)
3. **Buat Cabang & Gudang Default**
   - Cabang: “Toko Utama”
   - Gudang: “Gudang Utama”
4. **Buat Kas/Rekening**
   - Kas Tunai (default)
   - Rekening Bank (opsional)
5. **Tambah Produk / Import Excel** (opsional)
6. **Siap Jualan** → masuk menu **Kasir**

**Output**
- Tenant siap transaksi dengan default cabang/gudang/kas/metode bayar.

---

### 11.2 Alur Kasir (Penjualan Barang) — Online/Offline
**Mulai Shift**
1. Buka menu **Kasir**
2. Jika belum ada shift → **Buka Kas** (pilih kas tunai, isi saldo awal opsional)

**Transaksi**
1. Scan barcode / cari produk
2. Atur qty/diskon
3. Pilih pelanggan (opsional) / “Umum”
4. Klik **Bayar** → pilih metode bayar
5. Klik **Proses**

**Posting**
- Online: langsung posting server (atomic)
- Offline: simpan ke outbox (PENDING_SYNC), akan dikirim saat online

**Output otomatis**
- Stok turun, pembayaran tercatat, piutang jika tempo, catatan keuangan & audit tercatat.

---

### 11.3 Alur Penjualan Tempo (Piutang)
1. Buat transaksi → pilih **Tempo / Belum Bayar**
2. Isi jatuh tempo
3. Sistem buat piutang (AR) + aging
4. Saat bayar: menu **Piutang** → **Terima Pembayaran** → update piutang & kas

---

### 11.4 Alur Pengeluaran (Biaya Operasional)
1. Menu **Pengeluaran** → **Tambah Pengeluaran**
2. Isi tanggal, kategori, nominal, sumber kas/rekening
3. **Simpan**
**Output**: kas turun, masuk laporan.

---

### 11.5 Alur Pembelian + Hutang
1. Menu **Pembelian** → **Terima Barang**
2. Input supplier, item, qty, harga beli
3. Pilih: **Bayar Sekarang** atau **Tempo**
   - Bayar sekarang → payment OUT
   - Tempo → hutang (AP) + due date
4. Bayar hutang: menu **Hutang** → pilih supplier → **Bayar**

---

### 11.6 Alur Stock Opname
1. Menu **Barang & Stok** → **Stock Opname**
2. Pilih gudang + mode (Manual/Scanner)
3. Input stok fisik → **Proses Opname**
**Output**: penyesuaian stok + catatan kerugian/penyesuaian.

---

### 11.7 Alur Transfer Stok
1. Menu **Barang & Stok** → **Transfer Stok**
2. Pilih gudang asal & tujuan, item, qty → **Proses**
**Output**: ledger keluar & masuk antar gudang.

---

### 11.8 Alur Jasa/Service (Work Order → Invoice)
1. Menu **Jasa/Service** → **Buat Order Jasa**
2. Isi keluhan, tambah jasa & sparepart
3. Update status: Menunggu → Proses → Selesai
4. Klik **Buat Tagihan**
**Output**: invoice gabungan + stok sparepart turun + pembayaran/piutang update.

---

### 11.9 Alur Karyawan & Gaji (Sederhana)
1. Menu **Karyawan & Gaji** → tambah karyawan
2. Buat periode gaji → input gaji/bonus/potongan
3. **Proses Gaji**
**Output**: pengeluaran gaji tercatat + kas turun saat dibayar.

---

### 11.10 Alur Dashboard Owner
Owner melihat ringkas:
- Omzet & profit hari ini
- Stok menipis
- Hutang jatuh tempo
- Piutang macet
- Tren bulanan
- Proyeksi cashflow 7 hari

---

### 11.11 Alur “Tanya AI”
1. Menu **Tanya AI**
2. Pilih pertanyaan cepat / ketik
3. AI memanggil tool query DB → jawab ringkas
4. Tombol **Lihat Detail** → buka laporan terkait

---

### 11.12 Skenario Integrasi Otomatis Antar Modul
1. Service pakai sparepart → stok turun → pendapatan naik → profit tercatat
2. Opname selisih minus → penyesuaian stok → beban kerugian
3. Pembelian tempo → stok naik → hutang naik
4. Bayar hutang → hutang turun → kas turun

---

## 12) MVP (Rilis Awal) vs Phase 2
### MVP (wajib cepat dipakai)
- Multi-tenant + RBAC (Clerk + RLS)
- Master produk/jasa/supplier/customer
- Kasir (scan, diskon, bayar, struk)
- Stok dasar (ledger + balance)
- Hutang/piutang dasar + jatuh tempo
- Pengeluaran
- Dashboard ringkas
- Tanya AI (tools ringkas)
- PWA offline outbox + sync

### Phase 2 (lanjutan)
- Batch/expiry, serial number
- Opname scanner
- Service module full detail
- Neraca/jurnal/COA editor (mode lanjutan)
- Payroll lebih lengkap + komisi

---