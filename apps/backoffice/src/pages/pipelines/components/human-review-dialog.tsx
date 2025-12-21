import * as React from 'react';
import { useCustomMutation } from '@refinedev/core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
  Label,
  RadioGroup,
  RadioGroupItem,
  Alert,
  AlertDescription,
  toast,
  cn,
} from '@project/ui';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface HumanReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  stepType: 'S2_IDEA_INSPIRATION' | 'S7_FINAL_EVALUATION';
  stepOutput?: {
    summary?: {
      topIdeaTitle?: string;
      topIdeaScore?: number;
      topIdeaVerdict?: string;
      totalIdeas?: number;
      qualityScore?: number;
      verdict?: string;
    };
  };
  onSuccess: () => void;
}

export function HumanReviewDialog({
  open,
  onOpenChange,
  pipelineId,
  stepType,
  stepOutput,
  onSuccess,
}: HumanReviewDialogProps) {
  const [decision, setDecision] = React.useState<'APPROVED' | 'REJECTED' | ''>('');
  const [notes, setNotes] = React.useState('');

  const { mutate, isLoading } = useCustomMutation();

  const handleSubmit = () => {
    if (!decision) return;

    mutate(
      {
        url: `/pipelines/${pipelineId}/review`,
        method: 'post',
        values: {
          stepType,
          decision,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Review submitted successfully');
          onSuccess();
          onOpenChange(false);
          setDecision('');
          setNotes('');
        },
        onError: () => {
          toast.error('Failed to submit review');
        },
      },
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDecision('');
      setNotes('');
    }
    onOpenChange(newOpen);
  };

  const isS2 = stepType === 'S2_IDEA_INSPIRATION';
  const isS7 = stepType === 'S7_FINAL_EVALUATION';
  const summary = stepOutput?.summary;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isS2 ? 'Review Idea Selection' : 'Final Course Approval'}
          </DialogTitle>
          <DialogDescription>
            {isS2
              ? 'Review the generated ideas and approve to proceed with course creation.'
              : 'Review the complete course and approve for deployment.'}
          </DialogDescription>
        </DialogHeader>

        {/* S2 Specific: Show top ideas */}
        {isS2 && summary && (
          <div className="space-y-3">
            <Label>Top Idea</Label>
            <div className="p-4 border border-border rounded-md bg-muted/50">
              <p className="font-medium">{summary.topIdeaTitle ?? 'N/A'}</p>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span>Score: {summary.topIdeaScore ?? 0}/100</span>
                <span>Verdict: {summary.topIdeaVerdict ?? 'N/A'}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Total ideas generated: {summary.totalIdeas ?? 0}
            </p>
          </div>
        )}

        {/* S7 Specific: Show quality score */}
        {isS7 && summary && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-border rounded-md">
                <p className="text-sm text-muted-foreground">Quality Score</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {summary.qualityScore ?? 0}/100
                </p>
              </div>
              <div className="p-4 border border-border rounded-md">
                <p className="text-sm text-muted-foreground">Verdict</p>
                <p className="text-lg font-medium">
                  {summary.verdict ?? 'N/A'}
                </p>
              </div>
            </div>
            {summary.verdict === 'REVISION_REQUIRED' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This course requires revisions before approval.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Decision */}
        <div className="space-y-3">
          <Label>Decision</Label>
          <RadioGroup
            value={decision}
            onValueChange={(v) => setDecision(v as 'APPROVED' | 'REJECTED')}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="APPROVED" id="approved" />
              <Label
                htmlFor="approved"
                className="flex items-center gap-2 cursor-pointer font-normal"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Approve
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="REJECTED" id="rejected" />
              <Label
                htmlFor="rejected"
                className="flex items-center gap-2 cursor-pointer font-normal"
              >
                <XCircle className="h-4 w-4 text-red-500" />
                Reject
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes (Optional)</Label>
          <Textarea
            placeholder="Add any notes about your decision..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!decision || isLoading}
            variant={decision === 'REJECTED' ? 'destructive' : 'default'}
          >
            {isLoading ? 'Submitting...' : `Submit ${decision || 'Review'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

