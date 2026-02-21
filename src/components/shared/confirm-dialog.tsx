"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "default";
    onConfirm: () => void;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Ya, Lanjutkan",
    cancelLabel = "Batal",
    variant = "danger",
    onConfirm,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${variant === "danger"
                                    ? "bg-red-100 dark:bg-red-900/30"
                                    : variant === "warning"
                                        ? "bg-amber-100 dark:bg-amber-900/30"
                                        : "bg-blue-100 dark:bg-blue-900/30"
                                }`}
                        >
                            <AlertTriangle
                                className={`h-5 w-5 ${variant === "danger"
                                        ? "text-red-600 dark:text-red-400"
                                        : variant === "warning"
                                            ? "text-amber-600 dark:text-amber-400"
                                            : "text-blue-600 dark:text-blue-400"
                                    }`}
                            />
                        </div>
                        <div>
                            <DialogTitle>{title}</DialogTitle>
                            <DialogDescription className="mt-1">{description}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === "danger" ? "destructive" : "default"}
                        onClick={() => {
                            onConfirm();
                            onOpenChange(false);
                        }}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
