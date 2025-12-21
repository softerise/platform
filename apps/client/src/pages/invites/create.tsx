import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@project/ui";
import { ArrowLeft, Loader2, Send } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  assignedRole: z.enum(["EMPLOYEE", "TEAM_LEAD", "HR_MANAGER"], {
    required_error: "Please select a role",
  }),
  personalMessage: z.string().max(500, "Message too long").optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

const roleOptions = [
  {
    label: "Employee",
    value: "EMPLOYEE",
    description: "Standard team member access",
  },
  {
    label: "Team Lead",
    value: "TEAM_LEAD",
    description: "Can view team members",
  },
  {
    label: "HR Manager",
    value: "HR_MANAGER",
    description: "Can manage invitations",
  },
];

export function CreateInvitePage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      assignedRole: "EMPLOYEE",
    },
  });

  const selectedRole = watch("assignedRole");

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/b2b/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send invite");
      }

      toast.success(`Invitation sent to ${data.email}`);
      navigate("/company/invites");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send invite",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/company/invites")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Invitations
      </Button>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Invite Team Member</CardTitle>
          <CardDescription>
            Send an invitation to join your company. They'll receive an email
            with a link to accept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  setValue("assignedRole", value as InviteFormData["assignedRole"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <span className="font-medium">{role.label}</span>
                        <span className="text-muted-foreground ml-2">
                          — {role.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assignedRole && (
                <p className="text-sm text-destructive">
                  {errors.assignedRole.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="personalMessage">Personal Message (Optional)</Label>
              <Textarea
                id="personalMessage"
                placeholder="Add a personal note to the invitation..."
                rows={3}
                {...register("personalMessage")}
              />
              {errors.personalMessage && (
                <p className="text-sm text-destructive">
                  {errors.personalMessage.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                This message will be included in the invitation email.
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Invitation
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/company/invites")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateInvitePage;

