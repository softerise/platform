import { Progress, cn } from '@project/ui';

interface PipelineProgressProps {
  progress: number;
  currentStep?: string | null;
  status: string;
  showLabel?: boolean;
}

const stepLabels: Record<string, string> = {
  S2_IDEA_INSPIRATION: 'Idea Inspiration',
  S3_COURSE_OUTLINE: 'Course Outline',
  S4_EPISODE_DRAFT: 'Episode Drafts',
  S5_EPISODE_CONTENT: 'Episode Content',
  S6_PRACTICE_CONTENT: 'Practice Content',
  S7_FINAL_EVALUATION: 'Final Evaluation',
};

export function PipelineProgress({
  progress,
  currentStep,
  status,
  showLabel = true,
}: PipelineProgressProps) {
  const progressValue = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {currentStep
              ? stepLabels[currentStep] ?? currentStep
              : 'Pipeline Progress'}
          </span>
          <span className="font-medium tabular-nums">{progressValue}%</span>
        </div>
      )}
      <Progress
        value={progressValue}
        className={cn(
          'h-2',
          status === 'FAILED' && '[&>div]:bg-red-500',
          status === 'APPROVED' && '[&>div]:bg-emerald-500',
          status === 'CANCELLED' && '[&>div]:bg-slate-400',
        )}
      />
    </div>
  );
}

