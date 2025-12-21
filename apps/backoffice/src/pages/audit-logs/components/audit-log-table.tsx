import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@project/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { EventTypeBadge } from './event-type-badge';
import { format } from 'date-fns';

export interface AuditLog {
  id: string;
  eventType: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  targetId: string | null;
  targetEmail: string | null;
  targetName: string | null;
  targetType: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogTableProps {
  auditLogs: AuditLog[];
  expandedRows: Set<string>;
  onToggle: (id: string) => void;
}

export function AuditLogTable({ auditLogs, expandedRows, onToggle }: AuditLogTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px]" />
            <TableHead className="w-[180px]">Timestamp</TableHead>
            <TableHead className="w-[200px]">Event</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Target</TableHead>
            <TableHead className="w-[120px]">IP Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auditLogs.map((log) => (
            <React.Fragment key={log.id}>
              <TableRow
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onToggle(log.id)}
              >
                <TableCell>
                  {expandedRows.has(log.id) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{format(new Date(log.createdAt), 'MMM d, yyyy')}</p>
                    <p className="text-muted-foreground">
                      {format(new Date(log.createdAt), 'HH:mm:ss')}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <EventTypeBadge eventType={log.eventType} size="sm" />
                </TableCell>
                <TableCell>
                  {log.actorEmail ? (
                    <div>
                      <p className="text-sm font-medium">{log.actorName || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{log.actorEmail}</p>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">System</span>
                  )}
                </TableCell>
                <TableCell>
                  {log.targetEmail ? (
                    <div>
                      <p className="text-sm font-medium">{log.targetName || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{log.targetEmail}</p>
                    </div>
                  ) : log.targetType ? (
                    <span className="text-sm text-muted-foreground">
                      {log.targetType}: {log.targetId}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm text-muted-foreground">
                    {log.ipAddress || '—'}
                  </span>
                </TableCell>
              </TableRow>

              {expandedRows.has(log.id) && (
                <TableRow>
                  <TableCell colSpan={6} className="bg-muted/30 p-0">
                    <div className="space-y-3 p-4">
                      {log.userAgent && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            User Agent
                          </p>
                          <p className="break-all font-mono text-sm">{log.userAgent}</p>
                        </div>
                      )}

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            Details
                          </p>
                          <pre className="overflow-x-auto rounded bg-muted p-3 text-sm">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}

                      <div className="flex gap-6 text-xs text-muted-foreground">
                        <span>Log ID: {log.id}</span>
                        {log.actorId && <span>Actor ID: {log.actorId}</span>}
                        {log.targetId && <span>Target ID: {log.targetId}</span>}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

