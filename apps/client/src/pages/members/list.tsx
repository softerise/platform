import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCan, useGetIdentity, useTable } from "@refinedev/core";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  DataTableToolbar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  LoadingSkeleton,
  RoleBadge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@project/ui";
import {
  Info,
  Loader2,
  MoreHorizontal,
  Plus,
  UserCog,
  UserMinus,
  Users,
} from "lucide-react";
import { WelcomeBanner } from "../../components/welcome-banner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const roleOptions = [
  { label: "Employee", value: "EMPLOYEE" },
  { label: "Team Lead", value: "TEAM_LEAD" },
  { label: "HR Manager", value: "HR_MANAGER" },
  { label: "Admin", value: "COMPANY_ADMIN" },
];

interface Member {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  b2bRole: string;
  status: string;
  lastLoginAt: string | null;
}

export function MemberListPage() {
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<{ role: string }>();
  const { data: canChangeRole } = useCan({
    resource: "members",
    action: "changeRole",
  });
  const { data: canRemove } = useCan({
    resource: "members",
    action: "remove",
  });
  const { data: canInvite } = useCan({
    resource: "invites",
    action: "create",
  });

  const [showWelcome, setShowWelcome] = React.useState(
    () => localStorage.getItem("dismissed_welcome") !== "true",
  );
  const [companyInfo, setCompanyInfo] = React.useState<{
    seatLimit: number;
    currentSeatCount: number;
  } | null>(null);
  const [companyId, setCompanyId] = React.useState<string | null>(null);

  const {
    tableQueryResult,
    current,
    setCurrent,
    pageSize,
    filters,
    setFilters,
  } = useTable<Member>({
    resource: "members",
    pagination: { current: 1, pageSize: 25 },
    syncWithLocation: true,
  });
  const { data, isLoading, isError, refetch } = tableQueryResult;
  const members = data?.data ?? [];
  const total = data?.total ?? 0;
  const safeFilters = filters ?? [];

  React.useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    try {
      const user = JSON.parse(userStr);
      const cid = user.companyId || user.company?.id;
      if (cid) {
        setCompanyId(cid);
        fetch(`${API_URL}/auth/company/${cid}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d && setCompanyInfo(d))
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  const [search, setSearch] = React.useState("");
  const filterValues = React.useMemo(() => {
    const v: Record<string, string> = {};
    safeFilters.forEach((f) => {
      if ("field" in f) v[f.field] = String(f.value || "");
    });
    return v;
  }, [safeFilters]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const withoutSearch = safeFilters.filter(
        (f) => "field" in f && f.field !== "search",
      );
      setFilters([
        ...withoutSearch,
        ...(search
          ? [
              {
                field: "search",
                operator: "contains" as const,
                value: search,
              },
            ]
          : []),
      ]);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleFilterChange = (key: string, value: string) =>
    setFilters([
      ...safeFilters.filter((f) => "field" in f && f.field !== key),
      ...(value
        ? [{ field: key, operator: "eq" as const, value }]
        : []),
    ]);

  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = React.useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<Member | null>(null);
  const [newRole, setNewRole] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleChangeRole = async () => {
    if (!selectedMember || !newRole) return;
    setActionLoading(true);
    if (!companyId) return;
    try {
      const r = await fetch(
        `${API_URL}/auth/company/${companyId}/members/${selectedMember.id}/role`,
        {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ role: newRole }),
        },
      );
      if (!r.ok) throw new Error();
      toast.success("Role updated");
      setChangeRoleDialogOpen(false);
      refetch();
    } catch {
      toast.error("Failed to change role");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedMember) return;
    setActionLoading(true);
    if (!companyId) return;
    try {
      const r = await fetch(
        `${API_URL}/auth/company/${companyId}/members/${selectedMember.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        },
      );
      if (!r.ok) throw new Error();
      toast.success("Member removed");
      setRemoveDialogOpen(false);
      refetch();
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Team Members</h1>
        <LoadingSkeleton variant="page" rows={10} />
      </div>
    );
  if (isError)
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Team Members</h1>
        <div className="rounded-lg border border-destructive p-4">
          <p className="text-destructive">Failed to load</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );

  const seatUsagePercent = companyInfo
    ? Math.round((companyInfo.currentSeatCount / companyInfo.seatLimit) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {showWelcome &&
        identity?.role === "COMPANY_ADMIN" &&
        members.length <= 1 && (
          <WelcomeBanner
            onDismiss={() => {
              setShowWelcome(false);
              localStorage.setItem("dismissed_welcome", "true");
            }}
          />
        )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Team Members</h1>
        {canInvite?.can && (
          <Button onClick={() => navigate("/company/invites/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Invite Members
          </Button>
        )}
      </div>

      {companyInfo && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Team Size: <strong>{companyInfo.currentSeatCount}</strong> /{" "}
                  {companyInfo.seatLimit} seats
                </span>
              </div>
              {seatUsagePercent >= 80 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <Info className="h-4 w-4" />
                  <span className="text-sm">Near limit</span>
                </div>
              )}
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full ${seatUsagePercent >= 80 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${seatUsagePercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <DataTableToolbar
        searchPlaceholder="Search members..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[{ key: "role", label: "Role", options: roleOptions }]}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
      />

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members found"
          description={
            search ? "Try adjusting your search" : "Start by inviting team members"
          }
          action={
            search
              ? {
                  label: "Clear filters",
                  onClick: () => {
                    setSearch("");
                    setFilters([]);
                  },
                }
              : canInvite?.can
                ? {
                    label: "Invite Members",
                    onClick: () => navigate("/company/invites/create"),
                  }
                : undefined
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={m.avatarUrl || undefined} />
                          <AvatarFallback>
                            {(m.displayName || m.email)[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{m.displayName || "No name"}</p>
                          <p className="text-sm text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={m.b2bRole} size="sm" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {m.lastLoginAt
                          ? new Date(m.lastLoginAt).toLocaleDateString()
                          : "Never"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canChangeRole?.can && m.b2bRole !== "COMPANY_ADMIN" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMember(m);
                                setNewRole(m.b2bRole);
                                setChangeRoleDialogOpen(true);
                              }}
                            >
                              <UserCog className="mr-2 h-4 w-4" />
                              Change Role
                            </DropdownMenuItem>
                          )}
                          {canRemove?.can && m.b2bRole !== "COMPANY_ADMIN" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMember(m);
                                  setRemoveDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(current - 1) * pageSize + 1} to{" "}
              {Math.min(current * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrent(current - 1)}
                disabled={current === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrent(current + 1)}
                disabled={current * pageSize >= total}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Change role for {selectedMember?.displayName || selectedMember?.email}
            </DialogDescription>
          </DialogHeader>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions
                .filter((r) => r.value !== "COMPANY_ADMIN")
                .map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeRoleDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleChangeRole} disabled={actionLoading || !newRole}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Remove Team Member"
        description={`${selectedMember?.displayName || selectedMember?.email}? They will lose access immediately.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemove}
        loading={actionLoading}
      />
    </div>
  );
}

export default MemberListPage;

