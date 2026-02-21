"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopHeader } from "@/components/layout/top-header";
import { MobileSidebarContent } from "@/components/layout/mobile-sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop sidebar */}
            <div className="hidden lg:block">
                <SidebarNav
                    isCollapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed((prev) => !prev)}
                />
            </div>

            {/* Mobile sidebar (Sheet) */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-[280px] p-4 flex flex-col">
                    <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
                    <MobileSidebarContent onClose={() => setMobileOpen(false)} />
                </SheetContent>
            </Sheet>

            {/* Main content area */}
            <div
                className={cn(
                    "flex flex-col transition-all duration-300 ease-in-out",
                    sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[260px]"
                )}
            >
                <TopHeader onMobileMenuToggle={() => setMobileOpen(true)} />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
