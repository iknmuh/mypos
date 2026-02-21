import { cn } from "@/lib/utils";
import { LucideIcon, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick?: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon: Icon = PackageOpen,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center animate-fade-in",
                className
            )}
        >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
            {action && (
                <Button onClick={action.onClick} className="mt-4" variant="outline">
                    {action.label}
                </Button>
            )}
        </div>
    );
}
