"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Send, Bot, User, Sparkles, RotateCcw, Loader2, Lightbulb,
    BarChart3, TrendingUp, Package, Banknote
} from "lucide-react";

interface Message {
    id: number;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

const quickQuestions = [
    { icon: BarChart3, label: "Analisis penjualan hari ini", color: "text-blue-500" },
    { icon: TrendingUp, label: "Prediksi tren minggu depan", color: "text-emerald-500" },
    { icon: Package, label: "Produk mana yang perlu restock?", color: "text-amber-500" },
    { icon: Banknote, label: "Ringkasan keuangan bulan ini", color: "text-purple-500" },
];

export default function TanyaAIPage() {
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, role: "assistant", content: "Halo! Saya asisten AI MyPOS yang didukung **Gemini**. Saya bisa membantu Anda menganalisis data penjualan, prediksi stok, memberikan insight bisnis berdasarkan data toko Anda. Ada yang bisa saya bantu?", timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (text?: string) => {
        const question = text ?? inputValue.trim();
        if (!question || isStreaming) return;

        const userMsg: Message = {
            id: Date.now(),
            role: "user",
            content: question,
            timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsStreaming(true);

        const assistantId = Date.now() + 1;
        setMessages(prev => [...prev, {
            id: assistantId, role: "assistant", content: "",
            timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        }]);

        try {
            const res = await fetch("/api/tanya-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: question }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Gagal menghubungi AI" }));
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `❌ ${err.error ?? "Terjadi kesalahan"}` } : m));
                setIsStreaming(false);
                return;
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n");
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const data = line.slice(6);
                            if (data === "[DONE]") break;
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.text) {
                                    accumulated += parsed.text;
                                    setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m));
                                }
                            } catch {
                                // not JSON, might be raw text
                                accumulated += data;
                                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m));
                            }
                        }
                    }
                }
            }

            if (!accumulated) {
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Maaf, saya tidak bisa memproses permintaan Anda saat ini. Pastikan GEMINI_API_KEY sudah dikonfigurasi." } : m));
            }
        } catch (e) {
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `❌ Error: ${(e as Error).message}` } : m));
        }
        setIsStreaming(false);
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
                        <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Asisten AI MyPOS</h2>
                        <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs text-muted-foreground">Powered by Gemini</span>
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMessages([{
                    id: Date.now(), role: "assistant",
                    content: "Percakapan baru dimulai. Ada yang bisa saya bantu?",
                    timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
                }])}>
                    <RotateCcw className="h-4 w-4" />
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                <div className="max-w-3xl mx-auto space-y-4 py-6">
                    {messages.length <= 1 && !isStreaming ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                                <Sparkles className="h-10 w-10 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold">Tanyakan Apa Saja</h3>
                                <p className="text-sm text-muted-foreground mt-1">AI akan menjawab berdasarkan data toko Anda secara real-time</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                                {quickQuestions.map((q, i) => (
                                    <button key={i} className="flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent hover:shadow-sm"
                                        onClick={() => handleSend(q.label)}>
                                        <q.icon className={`h-4 w-4 ${q.color}`} />
                                        <span>{q.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                {msg.role === "assistant" && (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
                                        <Bot className="h-4 w-4 text-primary-foreground" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"}`}>
                                    <div className="whitespace-pre-wrap">{msg.content || (isStreaming ? "..." : "")}</div>
                                    <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{msg.timestamp}</p>
                                </div>
                                {msg.role === "user" && (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                        <User className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {isStreaming && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> AI sedang berpikir...
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Quick suggestions */}
            {messages.length > 1 && !isStreaming && (
                <div className="flex gap-2 px-4 py-2 overflow-x-auto">
                    {["Buat draft PO", "Analisis profit", "Produk terlaris", "Prediksi minggu depan"].map(q => (
                        <Button key={q} variant="outline" size="sm" className="text-xs shrink-0 gap-1" onClick={() => handleSend(q)}>
                            <Lightbulb className="h-3 w-3" /> {q}
                        </Button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="border-t p-4">
                <div className="flex gap-2 max-w-3xl mx-auto">
                    <Input placeholder="Ketik pertanyaan Anda..." value={inputValue} onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} className="flex-1" disabled={isStreaming} />
                    <Button onClick={() => handleSend()} disabled={!inputValue.trim() || isStreaming} className="gap-2">
                        {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
