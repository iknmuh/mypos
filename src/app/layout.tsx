import type { Metadata } from "next";
import "@/app/globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
    title: "MyPOS — Kelola Bisnis Mudah",
    description:
        "Aplikasi kasir & manajemen bisnis untuk UMKM Indonesia. Penjualan, stok, hutang/piutang, laporan, dan AI assistant dalam satu platform.",
    keywords: ["POS", "kasir", "UMKM", "stok", "penjualan", "Indonesia"],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider appearance={{ cssLayerName: "clerk" }}>
            <html lang="id" suppressHydrationWarning>
                <head>
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                    <link
                        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
                        rel="stylesheet"
                    />
                </head>
                <body className="min-h-screen font-sans">
                    <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
