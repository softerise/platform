import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  ScrollArea,
} from '@project/ui';
import {
  AlertTriangle,
  Clock,
  XCircle,
  Rocket,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActionRequiredProps {
  pendingS2Reviews: { id: string; bookTitle: string; createdAt: string }[];
  pendingS7Reviews: { id: string; bookTitle: string; createdAt: string }[];
  failedPipelines: { id: string; bookTitle: string; error: string }[];
  readyToDeploy: { id: string; title: string; qualityScore: number }[];
}

export function ActionRequired({
  pendingS2Reviews,
  pendingS7Reviews,
  failedPipelines,
  readyToDeploy,
}: ActionRequiredProps) {
  const navigate = useNavigate();

  const totalActions =
    pendingS2Reviews.length +
    pendingS7Reviews.length +
    failedPipelines.length +
    readyToDeploy.length;

  if (totalActions === 0) {
    return (
      <Card className="border border-border">
        <CardContent className="py-8 text-center">
          <p className="text-emerald-600 font-medium">✓ No actions required</p>
          <p className="text-sm text-muted-foreground mt-1">
            All caught up! Check back later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Action Required
          </CardTitle>
          <Badge
            variant="outline"
            className="bg-amber-500/10 text-amber-700 border-amber-500/30"
          >
            {totalActions} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {/* Pending S2 Reviews */}
            {pendingS2Reviews.map((item) => (
              <div
                key={`s2-${item.id}`}
                className="flex items-center justify-between p-3 bg-amber-500/10 rounded-md border border-amber-500/20"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium">S2 Review Needed</p>
                    <p className="text-xs text-muted-foreground">
                      {item.bookTitle} •{' '}
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/admin/pipelines/${item.id}`)}
                >
                  Review
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ))}

            {/* Pending S7 Reviews */}
            {pendingS7Reviews.map((item) => (
              <div
                key={`s7-${item.id}`}
                className="flex items-center justify-between p-3 bg-amber-500/10 rounded-md border border-amber-500/20"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium">Final Approval Needed</p>
                    <p className="text-xs text-muted-foreground">
                      {item.bookTitle} •{' '}
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/admin/pipelines/${item.id}`)}
                >
                  Review
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ))}

            {/* Failed Pipelines */}
            {failedPipelines.map((item) => (
              <div
                key={`failed-${item.id}`}
                className="flex items-center justify-between p-3 bg-red-500/10 rounded-md border border-red-500/20"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Pipeline Failed</p>
                    <p className="text-xs text-muted-foreground">{item.bookTitle}</p>
                    <p className="text-xs text-red-600">{item.error}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/admin/pipelines/${item.id}`)}
                >
                  View
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ))}

            {/* Ready to Deploy */}
            {readyToDeploy.map((item) => (
              <div
                key={`deploy-${item.id}`}
                className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-md border border-emerald-500/20"
              >
                <div className="flex items-center gap-3">
                  <Rocket className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium">Ready to Deploy</p>
                    <p className="text-xs text-muted-foreground">
                      {item.title} • Score: {item.qualityScore}/100
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/admin/courses/${item.id}`)}
                >
                  Deploy
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

