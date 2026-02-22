-- ============================================================
-- MyPOS Database RPC Functions for Atomic Operations
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Create invoice number sequence
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

-- ============================================================
-- FUNCTION: process_sale
-- Description: Atomically process a sales transaction
-- Includes: invoice creation, items, stock updates, stock ledger
-- ============================================================
CREATE OR REPLACE FUNCTION process_sale(
    p_store_id text,
    p_items jsonb,
    p_total bigint,
    p_grand_total bigint,
    p_bayar bigint,
    p_pelanggan_id uuid DEFAULT NULL,
    p_pelanggan text DEFAULT NULL,
    p_diskon bigint DEFAULT 0,
    p_pajak bigint DEFAULT 0,
    p_kembalian bigint DEFAULT 0,
    p_metode text DEFAULT 'Tunai',
    p_catatan text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_invoice_id uuid;
    v_invoice_no text;
    v_item jsonb;
    v_produk_id uuid;
    v_nama text;
    v_harga bigint;
    v_jumlah integer;
    v_diskon_item bigint;
    v_subtotal bigint;
    v_current_stok integer;
    v_new_stok integer;
    v_total_items bigint := 0;
BEGIN
    -- Generate invoice number
    v_invoice_no := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || nextval('invoice_seq')::text;
    
    -- Insert invoice header
    INSERT INTO transaksi (
        store_id, nomor, pelanggan_id, pelanggan,
        total, diskon, pajak, grand_total,
        bayar, kembalian, metode, catatan, status
    ) VALUES (
        p_store_id, v_invoice_no, p_pelanggan_id, p_pelanggan,
        p_total, p_diskon, p_pajak, p_grand_total,
        p_bayar, p_kembalian, p_metode, p_catatan, 'selesai'
    ) RETURNING id INTO v_invoice_id;
    
    -- Process each item
    FOR i IN 0..jsonb_array_length(p_items) - 1 LOOP
        v_item := p_items->i;
        v_produk_id := (v_item->>'produk_id')::uuid;
        v_nama := v_item->>'nama';
        v_harga := (v_item->>'harga')::bigint;
        v_jumlah := (v_item->>'jumlah')::integer;
        v_diskon_item := COALESCE((v_item->>'diskon')::bigint, 0);
        v_subtotal := (v_item->>'subtotal')::bigint;
        
        -- Insert transaction item
        INSERT INTO transaksi_item (
            transaksi_id, produk_id, nama, harga, jumlah, diskon, subtotal
        ) VALUES (
            v_invoice_id, v_produk_id, v_nama, v_harga, v_jumlah, v_diskon_item, v_subtotal
        );
        
        -- Update stock if product exists
        IF v_produk_id IS NOT NULL THEN
            -- Lock and get current stock
            SELECT stok INTO v_current_stok 
            FROM produk 
            WHERE id = v_produk_id AND store_id = p_store_id
            FOR UPDATE;
            
            IF v_current_stok IS NULL THEN
                RAISE EXCEPTION 'Produk tidak ditemukan: %', v_produk_id;
            END IF;
            
            -- Validate stock
            IF v_current_stok < v_jumlah THEN
                RAISE EXCEPTION 'Stok tidak mencukupi untuk produk %. Stok saat ini: %, diminta: %', 
                    v_nama, v_current_stok, v_jumlah;
            END IF;
            
            -- Calculate new stock
            v_new_stok := v_current_stok - v_jumlah;
            
            -- Update product stock
            UPDATE produk 
            SET stok = v_new_stok, updated_at = now() 
            WHERE id = v_produk_id;
            
            -- Insert stock adjustment record
            INSERT INTO stok_adjustment (
                store_id, produk_id, tipe, jumlah, stok_akhir, catatan
            ) VALUES (
                p_store_id, v_produk_id, 'keluar', v_jumlah, v_new_stok, 
                'Penjualan - ' || v_invoice_no
            );
        END IF;
        
        v_total_items := v_total_items + v_jumlah;
    END LOOP;
    
    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'invoice_no', v_invoice_no,
        'total_items', v_total_items
    );
END;
$$;

-- ============================================================
-- FUNCTION: process_purchase_receipt
-- Description: Atomically process purchase order receipt
-- Includes: update purchase status, stock updates, stock ledger
-- ============================================================
CREATE OR REPLACE FUNCTION process_purchase_receipt(
    p_purchase_id uuid,
    p_store_id text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_purchase record;
    v_item record;
    v_current_stok integer;
    v_new_stok integer;
    v_total_items integer := 0;
BEGIN
    -- Get purchase order
    SELECT * INTO v_purchase 
    FROM pembelian 
    WHERE id = p_purchase_id AND store_id = p_store_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pembelian tidak ditemukan';
    END IF;
    
    IF v_purchase.status = 'diterima' THEN
        RAISE EXCEPTION 'Pembelian sudah diterima sebelumnya';
    END IF;
    
    IF v_purchase.status = 'dibatalkan' THEN
        RAISE EXCEPTION 'Pembelian sudah dibatalkan';
    END IF;
    
    -- Process each item
    FOR v_item IN 
        SELECT * FROM pembelian_item WHERE pembelian_id = p_purchase_id
    LOOP
        IF v_item.produk_id IS NOT NULL THEN
            -- Lock and get current stock
            SELECT stok INTO v_current_stok 
            FROM produk 
            WHERE id = v_item.produk_id
            FOR UPDATE;
            
            IF v_current_stok IS NULL THEN
                RAISE EXCEPTION 'Produk tidak ditemukan: %', v_item.produk_id;
            END IF;
            
            -- Calculate new stock
            v_new_stok := v_current_stok + v_item.jumlah;
            
            -- Update product stock
            UPDATE produk 
            SET stok = v_new_stok, updated_at = now() 
            WHERE id = v_item.produk_id;
            
            -- Insert stock adjustment record
            INSERT INTO stok_adjustment (
                store_id, produk_id, tipe, jumlah, stok_akhir, catatan
            ) VALUES (
                p_store_id, v_item.produk_id, 'masuk', v_item.jumlah, v_new_stok,
                'Pembelian - ' || v_purchase.nomor
            );
        END IF;
        
        v_total_items := v_total_items + v_item.jumlah;
    END LOOP;
    
    -- Update purchase status
    UPDATE pembelian 
    SET status = 'diterima', tanggal_terima = current_date 
    WHERE id = p_purchase_id;
    
    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', p_purchase_id,
        'total_items', v_total_items
    );
END;
$$;

-- ============================================================
-- FUNCTION: process_stock_adjustment
-- Description: Atomically process stock adjustment
-- ============================================================
CREATE OR REPLACE FUNCTION process_stock_adjustment(
    p_store_id text,
    p_produk_id uuid,
    p_tipe text,
    p_jumlah integer,
    p_catatan text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_stok integer;
    v_new_stok integer;
    v_produk_nama text;
    v_adjustment_id uuid;
BEGIN
    -- Validate tipe
    IF p_tipe NOT IN ('masuk', 'keluar', 'koreksi') THEN
        RAISE EXCEPTION 'Tipe penyesuaian tidak valid: %', p_tipe;
    END IF;
    
    -- Lock and get current stock
    SELECT stok, nama INTO v_current_stok, v_produk_nama
    FROM produk 
    WHERE id = p_produk_id AND store_id = p_store_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produk tidak ditemukan';
    END IF;
    
    -- Calculate new stock based on type
    CASE p_tipe
        WHEN 'masuk' THEN
            v_new_stok := v_current_stok + p_jumlah;
        WHEN 'keluar' THEN
            IF v_current_stok < p_jumlah THEN
                RAISE EXCEPTION 'Stok tidak mencukupi. Stok saat ini: %, diminta: %', 
                    v_current_stok, p_jumlah;
            END IF;
            v_new_stok := v_current_stok - p_jumlah;
        WHEN 'koreksi' THEN
            v_new_stok := p_jumlah;
    END CASE;
    
    -- Validate new stock
    IF v_new_stok < 0 THEN
        RAISE EXCEPTION 'Stok tidak boleh negatif';
    END IF;
    
    -- Update product stock
    UPDATE produk 
    SET stok = v_new_stok, updated_at = now() 
    WHERE id = p_produk_id;
    
    -- Insert stock adjustment record
    INSERT INTO stok_adjustment (
        store_id, produk_id, tipe, jumlah, stok_akhir, catatan
    ) VALUES (
        p_store_id, p_produk_id, p_tipe, p_jumlah, v_new_stok, p_catatan
    ) RETURNING id INTO v_adjustment_id;
    
    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'produk_id', p_produk_id,
        'produk_nama', v_produk_nama,
        'previous_stok', v_current_stok,
        'new_stok', v_new_stok,
        'adjustment_id', v_adjustment_id
    );
END;
$$;

-- ============================================================
-- FUNCTION: process_debt_payment
-- Description: Atomically process debt/receivable payment
-- ============================================================
CREATE OR REPLACE FUNCTION process_debt_payment(
    p_hutang_id uuid,
    p_jumlah bigint,
    p_catatan text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_sisa bigint;
    v_new_sisa bigint;
    v_status text;
    v_hutang record;
BEGIN
    -- Get debt record
    SELECT * INTO v_hutang FROM hutang_piutang WHERE id = p_hutang_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Hutang/Piutang tidak ditemukan';
    END IF;
    
    v_current_sisa := v_hutang.sisa;
    
    -- Validate payment amount
    IF p_jumlah > v_current_sisa THEN
        RAISE EXCEPTION 'Jumlah pembayaran melebihi sisa. Sisa: %, dibayar: %', 
            v_current_sisa, p_jumlah;
    END IF;
    
    -- Calculate new sisa
    v_new_sisa := v_current_sisa - p_jumlah;
    
    -- Determine new status
    IF v_new_sisa = 0 THEN
        v_status := 'lunas';
    ELSE
        v_status := 'belum_lunas';
    END IF;
    
    -- Insert payment record
    INSERT INTO pembayaran_hp (hutang_id, jumlah, catatan)
    VALUES (p_hutang_id, p_jumlah, p_catatan);
    
    -- Update debt record
    UPDATE hutang_piutang 
    SET sisa = v_new_sisa, status = v_status
    WHERE id = p_hutang_id;
    
    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'hutang_id', p_hutang_id,
        'previous_sisa', v_current_sisa,
        'payment_amount', p_jumlah,
        'new_sisa', v_new_sisa,
        'status', v_status
    );
END;
$$;

-- ============================================================
-- FUNCTION: void_transaction
-- Description: Void a completed transaction and restore stock
-- ============================================================
CREATE OR REPLACE FUNCTION void_transaction(
    p_transaksi_id uuid,
    p_store_id text,
    p_alasan text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaksi record;
    v_item record;
    v_current_stok integer;
    v_new_stok integer;
BEGIN
    -- Get transaction
    SELECT * INTO v_transaksi 
    FROM transaksi 
    WHERE id = p_transaksi_id AND store_id = p_store_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaksi tidak ditemukan';
    END IF;
    
    IF v_transaksi.status = 'dibatalkan' THEN
        RAISE EXCEPTION 'Transaksi sudah dibatalkan sebelumnya';
    END IF;
    
    -- Restore stock for each item
    FOR v_item IN 
        SELECT * FROM transaksi_item WHERE transaksi_id = p_transaksi_id
    LOOP
        IF v_item.produk_id IS NOT NULL THEN
            -- Lock and get current stock
            SELECT stok INTO v_current_stok 
            FROM produk 
            WHERE id = v_item.produk_id
            FOR UPDATE;
            
            IF v_current_stok IS NOT NULL THEN
                v_new_stok := v_current_stok + v_item.jumlah;
                
                -- Update product stock
                UPDATE produk 
                SET stok = v_new_stok, updated_at = now() 
                WHERE id = v_item.produk_id;
                
                -- Insert stock adjustment record
                INSERT INTO stok_adjustment (
                    store_id, produk_id, tipe, jumlah, stok_akhir, catatan
                ) VALUES (
                    p_store_id, v_item.produk_id, 'masuk', v_item.jumlah, v_new_stok,
                    'Pembatalan - ' || v_transaksi.nomor || COALESCE(' - ' || p_alasan, '')
                );
            END IF;
        END IF;
    END LOOP;
    
    -- Update transaction status
    UPDATE transaksi 
    SET status = 'dibatalkan', catatan = COALESCE(catatan || ' | ', '') || 'Dibatalkan: ' || COALESCE(p_alasan, 'Tidak ada alasan')
    WHERE id = p_transaksi_id;
    
    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'transaksi_id', p_transaksi_id,
        'invoice_no', v_transaksi.nomor
    );
END;
$$;

-- ============================================================
-- FUNCTION: get_dashboard_stats
-- Description: Get dashboard statistics in a single query
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_store_id text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_today date := current_date;
    v_month_start timestamptz := date_trunc('month', now());
    v_omzet_today bigint;
    v_transaksi_today integer;
    v_new_customers integer;
    v_low_stock jsonb;
    v_recent_transaksi jsonb;
    v_upcoming_hutang jsonb;
BEGIN
    -- Today's sales
    SELECT COALESCE(SUM(grand_total), 0), COUNT(*)
    INTO v_omzet_today, v_transaksi_today
    FROM transaksi
    WHERE store_id = p_store_id 
      AND status = 'selesai'
      AND created_at >= v_today;
    
    -- New customers this month
    SELECT COUNT(*)
    INTO v_new_customers
    FROM pelanggan
    WHERE store_id = p_store_id
      AND created_at >= v_month_start;
    
    -- Low stock products
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'nama', nama,
        'stok', stok,
        'stok_minimum', stok_minimum
    ))
    INTO v_low_stock
    FROM produk
    WHERE store_id = p_store_id
      AND aktif = true
      AND stok <= stok_minimum
    LIMIT 10;
    
    -- Recent transactions
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'nomor', nomor,
        'pelanggan', pelanggan,
        'grand_total', grand_total,
        'metode', metode,
        'created_at', created_at
    ))
    INTO v_recent_transaksi
    FROM transaksi
    WHERE store_id = p_store_id
      AND status = 'selesai'
    ORDER BY created_at DESC
    LIMIT 5;
    
    -- Upcoming debts
    SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'nama', nama,
        'jumlah', jumlah,
        'sisa', sisa,
        'jatuh_tempo', jatuh_tempo
    ))
    INTO v_upcoming_hutang
    FROM hutang_piutang
    WHERE store_id = p_store_id
      AND tipe = 'hutang'
      AND status = 'belum_lunas'
    ORDER BY jatuh_tempo
    LIMIT 5;
    
    -- Return all stats
    RETURN jsonb_build_object(
        'omzet_today', v_omzet_today,
        'transaksi_today', v_transaksi_today,
        'new_customers', v_new_customers,
        'low_stock', COALESCE(v_low_stock, '[]'::jsonb),
        'recent_transaksi', COALESCE(v_recent_transaksi, '[]'::jsonb),
        'upcoming_hutang', COALESCE(v_upcoming_hutang, '[]'::jsonb)
    );
END;
$$;

-- ============================================================
-- Grant execute permissions to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION process_sale TO authenticated;
GRANT EXECUTE ON FUNCTION process_purchase_receipt TO authenticated;
GRANT EXECUTE ON FUNCTION process_stock_adjustment TO authenticated;
GRANT EXECUTE ON FUNCTION process_debt_payment TO authenticated;
GRANT EXECUTE ON FUNCTION void_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
