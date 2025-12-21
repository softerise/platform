import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  RoleBadge,
} from "@project/ui";
import { CheckCircle, XCircle } from "lucide-react";

interface ParsedInvite {
  email: string;
  role: string;
  message?: string;
  valid: boolean;
  error?: string;
}

interface CSVPreviewTableProps {
  data: ParsedInvite[];
  onRemove: (index: number) => void;
}

export function CSVPreviewTable({ data, onRemove }: CSVPreviewTableProps) {
  const validCount = data.filter((d) => d.valid).length;
  const invalidCount = data.filter((d) => !d.valid).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>{validCount} valid</span>
        </div>
        {invalidCount > 0 && (
          <div className="flex items-center gap-1.5 text-destructive">
            <XCircle className="h-4 w-4" />
            <span>{invalidCount} invalid</span>
          </div>
        )}
        <span className="text-muted-foreground">Total: {data.length} rows</span>
      </div>

      <div className="rounded-md border max-h-[400px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-[40px]">Status</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={index}
                className={!row.valid ? "bg-destructive/5" : undefined}
              >
                <TableCell>
                  {row.valid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <span className="font-mono text-sm">{row.email}</span>
                    {row.error && (
                      <p className="text-xs text-destructive mt-0.5">
                        {row.error}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {row.role ? (
                    <RoleBadge role={row.role} size="sm" />
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                    {row.message || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => onRemove(index)}
                    className="text-sm text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

