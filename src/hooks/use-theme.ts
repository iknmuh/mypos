"use client";

import { useState, useEffect, useCallback } from "react";

export function useTheme() {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        const stored = localStorage.getItem("mypos-theme") as "light" | "dark" | null;
        const preferred = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        setTheme(preferred);
        document.documentElement.classList.toggle("dark", preferred === "dark");
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next = prev === "dark" ? "light" : "dark";
            localStorage.setItem("mypos-theme", next);
            document.documentElement.classList.toggle("dark", next === "dark");
            return next;
        });
    }, []);

    return { theme, toggleTheme };
}
