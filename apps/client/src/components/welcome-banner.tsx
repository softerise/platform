import { useNavigate } from "react-router-dom";
import { X, Users, ArrowRight } from "lucide-react";
import { Button, Card, CardContent } from "@project/ui";

export function WelcomeBanner({ onDismiss }: { onDismiss: () => void }) {
  const navigate = useNavigate();
  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                Welcome to your Company Portal!
              </h3>
              <p className="text-muted-foreground mt-1">
                Start building your team by inviting members.
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate("/company/invites/create")}
              >
                Invite Your First Team Member
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

