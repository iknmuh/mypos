import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export interface Column<T> {
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    searchPlaceholder?: string;
}

export function DataTable<T extends Record<string, unknown>>({
    columns,
    data,
    searchPlaceholder = "Cari...",
}: DataTableProps<T>) {
    return (
        <div className="space-y-4">
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder={searchPlaceholder} className="pl-9" />
            </div>
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead key={col.key} className={col.className}>
                                    {col.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                    Tidak ada data.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item, idx) => (
                                <TableRow key={idx}>
                                    {columns.map((col) => (
                                        <TableCell key={col.key} className={col.className}>
                                            {col.render ? col.render(item) : String(item[col.key] ?? "")}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Menampilkan {data.length} data</span>
            </div>
        </div>
    );
}
