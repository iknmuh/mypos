-- ============================================================
-- MyPOS Database Schema for Supabase (PostgreSQL)
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- ── PRODUK & STOK ───────────────────────────────────────────────
create table if not exists kategori_produk (
    id         uuid primary key default gen_random_uuid(),
    store_id   text not null,
    nama       text not null,
    created_at timestamptz default now()
);

create table if not exists produk (
    id           uuid primary key default gen_random_uuid(),
    store_id     text not null,
    kode         text,
    nama         text not null,
    kategori_id  uuid references kategori_produk(id) on delete set null,
    kategori     text,
    satuan       text default 'pcs',
    harga_beli   bigint default 0,
    harga_jual   bigint not null default 0,
    stok         integer default 0,
    stok_minimum integer default 0,
    gambar_url   text,
    aktif        boolean default true,
    created_at   timestamptz default now(),
    updated_at   timestamptz default now()
);

create table if not exists stok_adjustment (
    id         uuid primary key default gen_random_uuid(),
    store_id   text not null,
    produk_id  uuid references produk(id) on delete cascade,
    tipe       text check (tipe in ('masuk','keluar','koreksi')) not null,
    jumlah     integer not null,
    stok_akhir integer not null,
    catatan    text,
    created_at timestamptz default now()
);

-- ── PELANGGAN & SUPPLIER ────────────────────────────────────────
create table if not exists pelanggan (
    id         uuid primary key default gen_random_uuid(),
    store_id   text not null,
    nama       text not null,
    hp         text,
    email      text,
    alamat     text,
    poin       integer default 0,
    created_at timestamptz default now()
);

create table if not exists supplier (
    id         uuid primary key default gen_random_uuid(),
    store_id   text not null,
    nama       text not null,
    hp         text,
    email      text,
    alamat     text,
    created_at timestamptz default now()
);

-- ── TRANSAKSI (KASIR) ───────────────────────────────────────────
create table if not exists transaksi (
    id           uuid primary key default gen_random_uuid(),
    store_id     text not null,
    nomor        text,
    pelanggan_id uuid references pelanggan(id) on delete set null,
    pelanggan    text,
    total        bigint not null default 0,
    diskon       bigint default 0,
    pajak        bigint default 0,
    grand_total  bigint not null default 0,
    bayar        bigint not null default 0,
    kembalian    bigint default 0,
    metode       text default 'Tunai',
    catatan      text,
    status       text default 'selesai',
    created_at   timestamptz default now()
);

create table if not exists transaksi_item (
    id           uuid primary key default gen_random_uuid(),
    transaksi_id uuid references transaksi(id) on delete cascade not null,
    produk_id    uuid references produk(id) on delete set null,
    nama         text not null,
    harga        bigint not null,
    jumlah       integer not null,
    diskon       bigint default 0,
    subtotal     bigint not null
);

-- ── JASA / SERVICE ──────────────────────────────────────────────
create table if not exists jasa (
    id          uuid primary key default gen_random_uuid(),
    store_id    text not null,
    kode        text,
    nama        text not null,
    pelanggan   text,
    hp          text,
    deskripsi   text,
    estimasi    text,
    harga       bigint default 0,
    status      text default 'antrian' check (status in ('antrian','dikerjakan','selesai','diambil','dibatalkan')),
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);

-- ── PEMBELIAN (PURCHASE ORDER) ──────────────────────────────────
create table if not exists pembelian (
    id             uuid primary key default gen_random_uuid(),
    store_id       text not null,
    nomor          text,
    supplier_id    uuid references supplier(id) on delete set null,
    supplier       text,
    total          bigint not null default 0,
    status         text default 'draft' check (status in ('draft','dipesan','diterima','dibatalkan')),
    catatan        text,
    tanggal_po     date default current_date,
    tanggal_terima date,
    created_at     timestamptz default now()
);

create table if not exists pembelian_item (
    id           uuid primary key default gen_random_uuid(),
    pembelian_id uuid references pembelian(id) on delete cascade not null,
    produk_id    uuid references produk(id) on delete set null,
    nama         text not null,
    harga        bigint not null,
    jumlah       integer not null,
    subtotal     bigint not null
);

-- ── HUTANG & PIUTANG ────────────────────────────────────────────
create table if not exists hutang_piutang (
    id          uuid primary key default gen_random_uuid(),
    store_id    text not null,
    tipe        text check (tipe in ('hutang','piutang')) not null,
    nama        text not null,
    deskripsi   text,
    jumlah      bigint not null,
    sisa        bigint not null,
    jatuh_tempo date,
    status      text default 'belum_lunas' check (status in ('belum_lunas','lunas')),
    created_at  timestamptz default now()
);

create table if not exists pembayaran_hp (
    id         uuid primary key default gen_random_uuid(),
    hutang_id  uuid references hutang_piutang(id) on delete cascade not null,
    jumlah     bigint not null,
    catatan    text,
    created_at timestamptz default now()
);

-- ── PENGELUARAN ─────────────────────────────────────────────────
create table if not exists pengeluaran (
    id         uuid primary key default gen_random_uuid(),
    store_id   text not null,
    kategori   text not null,
    deskripsi  text,
    jumlah     bigint not null,
    tanggal    date default current_date,
    created_at timestamptz default now()
);

-- ── KARYAWAN & PENGGAJIAN ───────────────────────────────────────
create table if not exists karyawan (
    id            uuid primary key default gen_random_uuid(),
    store_id      text not null,
    nama          text not null,
    jabatan       text,
    hp            text,
    alamat        text,
    tanggal_masuk date,
    gaji_pokok    bigint default 0,
    status        text default 'aktif' check (status in ('aktif','nonaktif')),
    created_at    timestamptz default now()
);

create table if not exists penggajian (
    id          uuid primary key default gen_random_uuid(),
    store_id    text not null,
    karyawan_id uuid references karyawan(id) on delete cascade not null,
    periode     text not null,
    gaji_pokok  bigint not null,
    tunjangan   bigint default 0,
    potongan    bigint default 0,
    total       bigint not null,
    status      text default 'belum_dibayar' check (status in ('belum_dibayar','dibayar')),
    created_at  timestamptz default now()
);

-- ── INVENTARIS ──────────────────────────────────────────────────
create table if not exists inventaris (
    id           uuid primary key default gen_random_uuid(),
    store_id     text not null,
    kode         text,
    nama         text not null,
    kategori     text,
    lokasi       text,
    kondisi      text default 'baik' check (kondisi in ('baik','rusak_ringan','rusak_berat')),
    nilai        bigint default 0,
    tanggal_beli date,
    deskripsi    text,
    created_at   timestamptz default now()
);

-- ── PENGATURAN ──────────────────────────────────────────────────
create table if not exists pengaturan_toko (
    id         uuid primary key default gen_random_uuid(),
    store_id   text not null unique,
    nama       text not null default 'MyPOS Store',
    alamat     text,
    hp         text,
    email      text,
    tagline    text,
    logo_url   text,
    mata_uang  text default 'IDR',
    timezone   text default 'Asia/Jakarta',
    updated_at timestamptz default now()
);

create table if not exists printer_config (
    id         uuid primary key default gen_random_uuid(),
    store_id   text not null,
    nama       text not null,
    tipe       text default 'thermal',
    ip_address text,
    is_default boolean default false,
    created_at timestamptz default now()
);

create table if not exists pengguna_toko (
    id            uuid primary key default gen_random_uuid(),
    store_id      text not null,
    clerk_user_id text not null,
    nama          text,
    email         text,
    role          text default 'kasir' check (role in ('owner','manajer','kasir','gudang')),
    status        text default 'aktif' check (status in ('aktif','nonaktif')),
    created_at    timestamptz default now(),
    unique (store_id, clerk_user_id)
);

-- ── INDEXES ─────────────────────────────────────────────────────
create index if not exists idx_produk_store      on produk(store_id);
create index if not exists idx_transaksi_store   on transaksi(store_id);
create index if not exists idx_transaksi_date    on transaksi(created_at);
create index if not exists idx_jasa_store        on jasa(store_id);
create index if not exists idx_pembelian_store   on pembelian(store_id);
create index if not exists idx_pengeluaran_store on pengeluaran(store_id);
create index if not exists idx_karyawan_store    on karyawan(store_id);
create index if not exists idx_inventaris_store  on inventaris(store_id);
create index if not exists idx_hutang_store      on hutang_piutang(store_id);

-- ── AUDIT LOG ────────────────────────────────────────────────────
create table if not exists audit_log (
    id          uuid primary key default gen_random_uuid(),
    store_id    text not null,
    user_id     text not null,
    action      text not null check (action in ('CREATE','UPDATE','DELETE','VOID','LOGIN','LOGOUT','VIEW','EXPORT','IMPORT')),
    table_name  text not null,
    record_id   uuid not null,
    old_values  jsonb,
    new_values  jsonb,
    ip_address  text,
    user_agent  text,
    created_at  timestamptz default now()
);

create index if not exists idx_audit_store_date on audit_log(store_id, created_at desc);
create index if not exists idx_audit_record     on audit_log(table_name, record_id);
create index if not exists idx_audit_user       on audit_log(user_id);
