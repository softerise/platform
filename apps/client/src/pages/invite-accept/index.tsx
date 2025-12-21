import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useIsAuthenticated } from "@refinedev/core";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  LoadingSkeleton,
  RoleBadge,
  toast,
} from "@project/ui";
import {
  Building,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

interface InviteDetails {
  companyName: string;
  assignedRole: string;
  invitedByName: string;
  personalMessage?: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
}

export function InviteAcceptPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { data: authData } = useIsAuthenticated();
  const isAuthenticated = authData?.authenticated;

  const [invite, setInvite] = React.useState<InviteDetails | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [accepting, setAccepting] = React.useState(false);

  React.useEffect(() => {
    if (!code) {
      setError("No invite code");
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/b2b/invite/${code}`)
      .then((r) => (r.ok ? r.json() : r.json().then((e) => Promise.reject(e.message))))
      .then(setInvite)
      .catch((e) => setError(e || "Invalid invite"))
      .finally(() => setLoading(false));
  }, [code]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("pending_invite_code", code!);
      navigate("/login");
      return;
    }
    setAccepting(true);
    try {
      const r = await fetch(`${API_URL}/b2b/invite/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ inviteCode: code }),
      });
      if (!r.ok) throw new Error((await r.json()).message);
      toast.success("Welcome to the team!");
      navigate("/company/members");
      window.location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setAccepting(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <LoadingSkeleton variant="card" />
          </CardContent>
        </Card>
      </div>
    );

  if (error || invite?.status === "EXPIRED" || invite?.status === "CANCELLED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <div
              className={`rounded-full p-4 mx-auto w-fit mb-4 ${
                invite?.status === "EXPIRED"
                  ? "bg-amber-100"
                  : "bg-destructive/10"
              }`}
            >
              {invite?.status === "EXPIRED" ? (
                <Clock className="h-8 w-8 text-amber-600" />
              ) : (
                <XCircle className="h-8 w-8 text-destructive" />
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {invite?.status === "EXPIRED"
                ? "Invite Expired"
                : invite?.status === "CANCELLED"
                  ? "Invite Cancelled"
                  : "Invalid Invite"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {error || "Please contact your administrator."}
            </p>
            <Button variant="outline" onClick={() => navigate("/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite?.status === "ACCEPTED") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <div className="rounded-full bg-green-100 p-4 mx-auto w-fit mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Already Joined</h2>
            <Button onClick={() => navigate("/company/members")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="rounded-full bg-primary/10 p-4 mx-auto w-fit mb-4">
            <Building className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            Join {invite?.companyName} as a team member
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Company</span>
              <span className="font-medium">{invite?.companyName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Role</span>
              <RoleBadge role={invite?.assignedRole || "EMPLOYEE"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Invited by
              </span>
              <span className="font-medium">{invite?.invitedByName}</span>
            </div>
          </div>
          {invite?.personalMessage && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm italic">"{invite.personalMessage}"</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleAccept} disabled={accepting}>
            {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isAuthenticated ? "Accept Invitation" : "Sign in to Accept"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default InviteAcceptPage;

