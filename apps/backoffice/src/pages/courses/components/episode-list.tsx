import * as React from 'react';
import { useCustom } from '@refinedev/core';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  ScrollArea,
  Badge,
} from '@project/ui';
import { Eye, Clock, FileText } from 'lucide-react';
import { EpisodeTypeBadge } from './episode-type-badge';

interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  episodeType: string;
  learningObjective: string;
  wordCount: number;
  estimatedDuration: number;
}

interface KeyPoint {
  point: string;
  purpose: string;
  confirmed: boolean;
}

interface EpisodeDetail extends Episode {
  audioScript: string;
  keyPoints?: KeyPoint[];
}

interface EpisodeListProps {
  courseId: string;
}

export function EpisodeList({ courseId }: EpisodeListProps) {
  const [selectedEpisode, setSelectedEpisode] = React.useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const { data: episodesData, isLoading } = useCustom<Episode[]>({
    url: `/courses/${courseId}/episodes`,
    method: 'get',
  });

  const episodes = (episodesData?.data as Episode[]) ?? [];

  const { data: episodeDetailData, isLoading: loadingDetail } = useCustom<EpisodeDetail>({
    url: `/courses/${courseId}/episodes/${selectedEpisode}`,
    method: 'get',
    queryOptions: {
      enabled: selectedEpisode !== null,
    },
  });

  const episodeDetail = episodeDetailData?.data as EpisodeDetail | undefined;

  const handleViewEpisode = (episodeNumber: number) => {
    setSelectedEpisode(episodeNumber);
    setSheetOpen(true);
  };

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setSelectedEpisode(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading episodes...</div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">No episodes found</div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">
              #
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Title
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Type
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Duration
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Words
            </TableHead>
            <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {episodes.map((episode) => (
            <TableRow key={episode.id} className="border-b border-border">
              <TableCell className="font-medium tabular-nums">
                {episode.episodeNumber}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{episode.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {episode.learningObjective}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <EpisodeTypeBadge type={episode.episodeType} size="sm" />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {episode.estimatedDuration?.toFixed(1)} min
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  {episode.wordCount?.toLocaleString()}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewEpisode(episode.episodeNumber)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Episode Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
        <SheetContent className="w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>
              Episode {selectedEpisode}: {episodeDetail?.title}
            </SheetTitle>
            <SheetDescription>{episodeDetail?.learningObjective}</SheetDescription>
          </SheetHeader>

          {loadingDetail ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : episodeDetail ? (
            <ScrollArea className="h-[calc(100vh-200px)] mt-4">
              <div className="space-y-6 pr-4">
                {/* Meta */}
                <div className="flex items-center gap-4">
                  <EpisodeTypeBadge type={episodeDetail.episodeType} />
                  <span className="text-sm text-muted-foreground">
                    {episodeDetail.wordCount?.toLocaleString()} words
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ~{episodeDetail.estimatedDuration?.toFixed(1)} min
                  </span>
                </div>

                {/* Key Points */}
                {episodeDetail.keyPoints && episodeDetail.keyPoints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Points</h4>
                    <ul className="space-y-2">
                      {episodeDetail.keyPoints.map((kp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {kp.purpose}
                          </Badge>
                          <span>{kp.point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Audio Script */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Audio Script</h4>
                  <div className="p-4 bg-muted rounded-md border border-border">
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                      {episodeDetail.audioScript}
                    </pre>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

