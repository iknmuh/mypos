import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId } from "@/lib/api";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
    try {
        const storeId = await getStoreId();
        const { message, history } = await req.json();

        if (!message) {
            return new Response(JSON.stringify({ error: "Pesan kosong" }), {
                status: 422, headers: { "Content-Type": "application/json" },
            });
        }

        // Fetch store context for the AI
        const [produkRes, trxRes, stokRes] = await Promise.all([
            supabaseAdmin.from("produk").select("nama, harga_jual, stok, stok_minimum, kategori")
                .eq("store_id", storeId).eq("aktif", true).limit(50),
            supabaseAdmin.from("transaksi").select("nomor, pelanggan, grand_total, metode, status, created_at")
                .eq("store_id", storeId).order("created_at", { ascending: false }).limit(20),
            supabaseAdmin.from("produk").select("nama, stok, stok_minimum")
                .eq("store_id", storeId).eq("aktif", true),
        ]);

        const lowStock = (stokRes.data ?? []).filter(p => p.stok <= p.stok_minimum);
        const totalOmzet = (trxRes.data ?? []).filter(t => t.status === "selesai").reduce((s, t) => s + (t.grand_total ?? 0), 0);

        const systemPrompt = `Kamu adalah asisten AI untuk aplikasi MyPOS, sebuah aplikasi kasir dan manajemen bisnis.
Jawab dalam Bahasa Indonesia. Gunakan format markdown untuk respons (bold, list, emoji).
Berikut data toko saat ini:

**Produk (${produkRes.data?.length ?? 0} item):**
${(produkRes.data ?? []).slice(0, 20).map(p => `- ${p.nama}: Rp ${p.harga_jual?.toLocaleString()}, Stok: ${p.stok}`).join("\n")}

**Stok Menipis (${lowStock.length} item):**
${lowStock.map(p => `- ${p.nama}: Stok ${p.stok} (min. ${p.stok_minimum})`).join("\n") || "Tidak ada"}

**Transaksi Terbaru (${trxRes.data?.length ?? 0}):**
${(trxRes.data ?? []).slice(0, 10).map(t => `- ${t.nomor}: ${t.pelanggan ?? "Umum"} - Rp ${t.grand_total?.toLocaleString()} (${t.metode})`).join("\n")}

**Total Omzet (20 transaksi terakhir):** Rp ${totalOmzet.toLocaleString()}

Berikan analisis, saran, dan insight yang berguna berdasarkan data di atas.`;

        // Build chat history for context
        const chatHistory = (history ?? []).map((h: { role: string; content: string }) => ({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.content }],
        }));

        // Stream response using Gemini
        const response = await ai.models.generateContentStream({
            model: "gemini-2.0-flash",
            contents: [
                ...chatHistory,
                { role: "user", parts: [{ text: message }] },
            ],
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        });

        // Create a readable stream from the AsyncGenerator
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of response) {
                        const text = chunk.text ?? "";
                        if (text) {
                            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
                        }
                    }
                    controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (err) {
                    console.error("[AI Stream Error]", err);
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: "Gagal mendapat respons AI" })}\n\n`));
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (e) {
        console.error("[Tanya AI Error]", e);
        return new Response(JSON.stringify({ error: "Gagal memproses permintaan AI" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
