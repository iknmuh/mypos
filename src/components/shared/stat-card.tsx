"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        label?: string;
        isUp?: boolean;
    };
    className?: string;
    iconClassName?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className, iconClassName }: StatCardProps) {
    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                        <p className="text-2xl font-bold tracking-tight">{value}</p>
                        {trend && (
                            <div className="flex items-center gap-1 text-xs">
                                {(trend.isUp ?? trend.value > 0) ? (
                                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                                ) : trend.value < 0 ? (
                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                ) : (
                                    <Minus className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span
                                    className={cn(
                                        "font-medium",
                                        (trend.isUp ?? trend.value > 0) && "text-emerald-600 dark:text-emerald-400",
                                        trend.value < 0 && "text-red-600 dark:text-red-400",
                                        trend.value === 0 && "text-muted-foreground"
                                    )}
                                >
                                    {(trend.isUp ?? trend.value > 0) && "+"}
                                    {trend.value}%
                                </span>
                                {trend.label && <span className="text-muted-foreground">{trend.label}</span>}
                            </div>
                        )}
                    </div>
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconClassName ?? "bg-primary/10 text-primary")}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
