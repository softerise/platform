import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCan, useTable } from "@refinedev/core";
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingSkeleton,
  toast,
} from "@project/ui";
import {
  Mail,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import { InviteStatusTabs } from "./components/invite-status-tabs";
import { InviteTable, type Invite } from "./components/invite-table";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

export function InviteListPage() {
  const navigate = useNavigate();

  const { data: canCreate } = useCan({
    resource: "invites",
    action: "create",
  });
  const { data: canCancel } = useCan({
    resource: "invites",
    action: "cancel",
  });

  const [activeTab, setActiveTab] = React.useState("all");
  const [search, setSearch] = React.useState("");

  const {
    tableQueryResult,
    current,
    setCurrent,
    pageSize,
    filters,
    setFilters,
  } = useTable<Invite>({
    resource: "invites",
    pagination: { current: 1, pageSize: 25 },
    syncWithLocation: true,
  });

  const { data, isLoading, isError, refetch, isFetching } = tableQueryResult;
  const invites = data?.data ?? [];
  const total = data?.total ?? 0;

  React.useEffect(() => {
    const nextFilters = [];
    if (activeTab !== "all") {
      nextFilters.push({
        field: "status",
        operator: "eq" as const,
        value: activeTab,
      });
    }
    if (search) {
      nextFilters.push({
        field: "search",
        operator: "contains" as const,
        value: search,
      });
    }
    setFilters(nextFilters);
  }, [activeTab, search, setFilters]);

  const statusCounts = React.useMemo(
    () => ({
      all: total,
      pending: invites.filter((i) => i.status === "PENDING").length,
      accepted: invites.filter((i) => i.status === "ACCEPTED").length,
      expired: invites.filter((i) => i.status === "EXPIRED").length,
      cancelled: invites.filter((i) => i.status === "CANCELLED").length,
    }),
    [invites, total],
  );

  const tabs = [
    { label: "All", value: "all", count: statusCounts.all },
    { label: "Pending", value: "PENDING", count: statusCounts.pending },
    { label: "Accepted", value: "ACCEPTED", count: statusCounts.accepted },
    { label: "Expired", value: "EXPIRED", count: statusCounts.expired },
    { label: "Cancelled", value: "CANCELLED", count: statusCounts.cancelled },
  ];

  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [selectedInvite, setSelectedInvite] = React.useState<Invite | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleCancel = async () => {
    if (!selectedInvite) return;
    setActionLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/b2b/invites/${selectedInvite.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to cancel invite");

      toast.success("Invite cancelled");
      setCancelDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to cancel invite");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResend = async (invite: Invite) => {
    try {
      const response = await fetch(
        `${API_URL}/b2b/invites/${invite.id}/resend`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to resend invite");

      toast.success(`Invite resent to ${invite.email}`);
    } catch (error) {
      toast.error("Failed to resend invite");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Invitations</h1>
        <LoadingSkeleton variant="page" rows={10} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Invitations</h1>
        <div className="rounded-lg border border-destructive p-4">
          <p className="text-destructive">Failed to load invitations</p>
          <Button variant="outline" onClick={() => refetch()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invitations</h1>
        {canCreate?.can && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/company/invites/bulk")}
            >
              <Upload className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
            <Button onClick={() => navigate("/company/invites/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </div>
        )}
      </div>

      <InviteStatusTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {invites.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No invitations found"
          description={
            activeTab !== "all"
              ? `No ${activeTab.toLowerCase()} invitations`
              : search
                ? "Try adjusting your search"
                : "Start by inviting team members"
          }
          action={
            search
              ? { label: "Clear Search", onClick: () => setSearch("") }
              : canCreate?.can
                ? {
                    label: "Invite Member",
                    onClick: () => navigate("/company/invites/create"),
                  }
                : undefined
          }
        />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <InviteTable
                invites={invites}
                canCancel={Boolean(canCancel?.can)}
                onResend={handleResend}
                onCancel={(invite) => {
                  setSelectedInvite(invite);
                  setCancelDialogOpen(true);
                }}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(current - 1) * pageSize + 1} to{" "}
              {Math.min(current * pageSize, total)} of {total} invitations
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

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Invitation"
        description={`Are you sure you want to cancel the invitation for ${selectedInvite?.email}? They will no longer be able to join.`}
        confirmLabel="Cancel Invite"
        variant="destructive"
        onConfirm={handleCancel}
        loading={actionLoading}
      />
    </div>
  );
}

export default InviteListPage;

