import { UserCog, X } from 'lucide-react';
import { cn } from '../utils';
import { Button } from './ui/button';

export interface ImpersonationBannerProps {
  targetUser: {
    email: string;
    displayName?: string;
  };
  onEndImpersonation: () => void;
  className?: string;
}

export function ImpersonationBanner({ 
  targetUser, 
  onEndImpersonation, 
  className 
}: ImpersonationBannerProps) {
  const displayText = targetUser.displayName
    ? `${targetUser.displayName} (${targetUser.email})`
    : targetUser.email;

  return (
    <div
      className={cn(
        'sticky top-0 z-50 flex items-center justify-between gap-4 bg-warning px-4 py-2 text-warning-foreground',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <UserCog className="h-4 w-4" aria-hidden />
        <span className="text-sm font-medium">
          You are viewing as <strong>{displayText}</strong>
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onEndImpersonation}
        className="border-warning bg-background text-foreground hover:bg-muted"
      >
        <X className="mr-1 h-3 w-3" aria-hidden />
        End Impersonation
      </Button>
    </div>
  );
}
