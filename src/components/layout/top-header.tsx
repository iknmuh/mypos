"use client";

import { Menu, Sun, Moon, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";

interface TopHeaderProps {
    onMobileMenuToggle: () => void;
}

export function TopHeader({ onMobileMenuToggle }: TopHeaderProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 sm:px-6">
            {/* Mobile menu button */}
            <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={onMobileMenuToggle}
            >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Store info (desktop) */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-soft" />
                <span className="text-muted-foreground">Toko Utama</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                        3
                    </span>
                </Button>

                {/* Theme toggle */}
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                {/* User menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                            <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                    AD
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">Admin</p>
                                <p className="text-xs leading-none text-muted-foreground">admin@mypos.id</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Profil Saya</DropdownMenuItem>
                        <DropdownMenuItem>Pengaturan</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Keluar</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
