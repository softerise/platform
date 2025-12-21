import * as React from 'react';
import { useCustom } from '@refinedev/core';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  ScrollArea,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@project/ui';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { StepStatusBadge } from './step-status-badge';

interface StepExecution {
  id: string;
  stepType: string;
  status: string;
  episodeNumber: number | null;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  retryCount: number;
}

interface StepOutputResponse {
  stepExecution?: {
    status: string;
    durationSeconds: number;
    retryCount: number;
  };
  output?: {
    summary?: Record<string, unknown>;
    parsed?: Record<string, unknown>;
  };
}

const STEP_TYPES = [
  { value: 'S2_IDEA_INSPIRATION', label: 'S2 - Idea Inspiration' },
  { value: 'S3_COURSE_OUTLINE', label: 'S3 - Course Outline' },
  { value: 'S4_EPISODE_DRAFT', label: 'S4 - Episode Draft' },
  { value: 'S5_EPISODE_CONTENT', label: 'S5 - Episode Content' },
  { value: 'S6_PRACTICE_CONTENT', label: 'S6 - Practice Content' },
  { value: 'S7_FINAL_EVALUATION', label: 'S7 - Final Evaluation' },
];

interface StepOutputViewerProps {
  pipelineId: string;
  steps: StepExecution[];
}

export function StepOutputViewer({ pipelineId, steps }: StepOutputViewerProps) {
  const [selectedStep, setSelectedStep] = React.useState<string>('');
  const [selectedEpisode, setSelectedEpisode] = React.useState<string>('');
  const [copied, setCopied] = React.useState(false);
  const [summaryOpen, setSummaryOpen] = React.useState(true);
  const [fullOutputOpen, setFullOutputOpen] = React.useState(false);

  // Get unique step types from completed steps
  const completedSteps = steps.filter((s) => s.status === 'SUCCESS');
  const availableStepTypes = [...new Set(completedSteps.map((s) => s.stepType))];

  // Get episodes for selected step (S4, S5, S6)
  const episodeSteps = completedSteps.filter((s) => s.stepType === selectedStep);
  const hasEpisodes = episodeSteps.some((s) => s.episodeNumber !== null);

  // Build query params
  const queryParams = new URLSearchParams();
  if (selectedEpisode) {
    queryParams.append('episodeNumber', selectedEpisode);
  }

  const { data, isLoading } = useCustom<StepOutputResponse>({
    url: `/pipelines/${pipelineId}/steps/${selectedStep}/output${
      queryParams.toString() ? `?${queryParams}` : ''
    }`,
    method: 'get',
    queryOptions: {
      enabled: !!selectedStep,
    },
  });

  const output = data?.data;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      JSON.stringify(output?.output?.parsed, null, 2),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Reset episode selection when step changes
  React.useEffect(() => {
    setSelectedEpisode('');
  }, [selectedStep]);

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Step Output Viewer
          </CardTitle>
          {output?.output?.parsed && (
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step Selection */}
        <div className="flex gap-4">
          <Select value={selectedStep} onValueChange={setSelectedStep}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select step..." />
            </SelectTrigger>
            <SelectContent>
              {STEP_TYPES.filter((t) =>
                availableStepTypes.includes(t.value),
              ).map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Episode Selection (for S4, S5, S6) */}
          {hasEpisodes && (
            <Select value={selectedEpisode} onValueChange={setSelectedEpisode}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Episode..." />
              </SelectTrigger>
              <SelectContent>
                {episodeSteps.map((step) => (
                  <SelectItem
                    key={step.id}
                    value={String(step.episodeNumber)}
                  >
                    Episode {step.episodeNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Output Display */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Loading output...
          </div>
        ) : !selectedStep ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Select a step to view its output
          </div>
        ) : output ? (
          <div className="space-y-4">
            {/* Step Info */}
            {output.stepExecution && (
              <div className="flex items-center gap-4 text-sm">
                <StepStatusBadge status={output.stepExecution.status} />
                <span className="text-muted-foreground">
                  Duration: {output.stepExecution.durationSeconds}s
                </span>
                {output.stepExecution.retryCount > 0 && (
                  <span className="text-amber-600">
                    Retries: {output.stepExecution.retryCount}
                  </span>
                )}
              </div>
            )}

            {/* Summary */}
            {output.output?.summary && (
              <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors">
                  {summaryOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Summary
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-3 bg-muted rounded-md border border-border">
                    <pre className="text-xs overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(output.output.summary, null, 2)}
                    </pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Full Output */}
            {output.output?.parsed && (
              <Collapsible open={fullOutputOpen} onOpenChange={setFullOutputOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors">
                  {fullOutputOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Full Output (JSON)
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="h-[400px] mt-2">
                    <pre className="p-3 bg-muted rounded-md border border-border text-xs overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(output.output.parsed, null, 2)}
                    </pre>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            No output available for this step
          </div>
        )}
      </CardContent>
    </Card>
  );
}

