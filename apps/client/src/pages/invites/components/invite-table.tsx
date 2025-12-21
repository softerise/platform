import * as React from "react";
import { format } from "date-fns";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  RoleBadge,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@project/ui";
import { MoreHorizontal, Send, X } from "lucide-react";

export interface Invite {
  id: string;
  email: string;
  assignedRole: string;
  status: string;
  personalMessage?: string;
  invitedByName: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

interface InviteTableProps {
  invites: Invite[];
  canCancel: boolean;
  onResend: (invite: Invite) => void;
  onCancel: (invite: Invite) => void;
}

export function InviteTable({
  invites,
  canCancel,
  onResend,
  onCancel,
}: InviteTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Invited By</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map((invite) => (
            <TableRow key={invite.id}>
              <TableCell>
                <span className="font-medium">{invite.email}</span>
              </TableCell>
              <TableCell>
                <RoleBadge role={invite.assignedRole} size="sm" />
              </TableCell>
              <TableCell>
                <StatusBadge status={invite.status} size="sm" />
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {invite.invitedByName}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(invite.createdAt), "MMM d, yyyy")}
                </span>
              </TableCell>
              <TableCell>
                {invite.status === "PENDING" ? (
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(invite.expiresAt), "MMM d, yyyy")}
                  </span>
                ) : invite.status === "ACCEPTED" ? (
                  <span className="text-sm text-green-600">
                    Accepted {invite.acceptedAt ? format(new Date(invite.acceptedAt), "MMM d") : ""}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {invite.status === "PENDING" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onResend(invite)}>
                        <Send className="mr-2 h-4 w-4" />
                        Resend
                      </DropdownMenuItem>
                      {canCancel && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onCancel(invite)}
                            className="text-destructive"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

