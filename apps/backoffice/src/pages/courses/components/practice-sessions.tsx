import * as React from 'react';
import { useCustom } from '@refinedev/core';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  ScrollArea,
  Badge,
  cn,
} from '@project/ui';
import { Eye, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { PracticeLevelBadge } from './practice-level-badge';

interface Scenario {
  situation: string;
  context: string;
  stakes: string;
}

interface PracticeSession {
  id: string;
  sessionNumber: number;
  level: string;
  skillsTested: string[];
  scenario?: Scenario;
  questionCount: number;
}

interface Answer {
  id: string;
  answerLabel: string;
  answerText: string;
  answerQuality: 'BEST' | 'ACCEPTABLE' | 'POOR';
  isCorrect: boolean;
  feedback: string;
}

interface Question {
  id: string;
  questionNumber: number;
  questionFormat: string;
  questionText: string;
  skillFocus: string;
  answers: Answer[];
}

interface SessionDetail extends PracticeSession {
  questions: Question[];
}

interface PracticeSessionsProps {
  courseId: string;
}

export function PracticeSessions({ courseId }: PracticeSessionsProps) {
  const [selectedSession, setSelectedSession] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [levelFilter, setLevelFilter] = React.useState<string>('all');

  const { data: sessionsData, isLoading } = useCustom<PracticeSession[]>({
    url: `/courses/${courseId}/practice`,
    method: 'get',
  });

  const sessions = (sessionsData?.data as PracticeSession[]) ?? [];

  const { data: sessionDetailData, isLoading: loadingDetail } = useCustom<SessionDetail>({
    url: `/courses/${courseId}/practice/${selectedSession}`,
    method: 'get',
    queryOptions: {
      enabled: selectedSession !== null,
    },
  });

  const sessionDetail = sessionDetailData?.data as SessionDetail | undefined;

  const handleViewSession = (sessionId: string) => {
    setSelectedSession(sessionId);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedSession(null);
    }
  };

  // Group sessions by level
  const groupedSessions = {
    BASIC: sessions.filter((s) => s.level === 'BASIC'),
    INTERMEDIATE: sessions.filter((s) => s.level === 'INTERMEDIATE'),
    ADVANCED: sessions.filter((s) => s.level === 'ADVANCED'),
  };

  const filteredSessions =
    levelFilter === 'all' ? sessions : sessions.filter((s) => s.level === levelFilter);

  const answerQualityIcon = (quality: string) => {
    switch (quality) {
      case 'BEST':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'ACCEPTABLE':
        return <MinusCircle className="h-4 w-4 text-amber-600" />;
      case 'POOR':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const answerQualityClass = (quality: string) => {
    switch (quality) {
      case 'BEST':
        return 'border-emerald-500/50 bg-emerald-500/10';
      case 'ACCEPTABLE':
        return 'border-amber-500/50 bg-amber-500/10';
      case 'POOR':
        return 'border-red-500/50 bg-red-500/10';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading practice sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="border border-border">
        <CardContent className="py-8 text-center text-muted-foreground">
          No practice sessions found
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Level Tabs */}
      <Tabs value={levelFilter} onValueChange={setLevelFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({sessions.length})</TabsTrigger>
          <TabsTrigger value="BASIC">Basic ({groupedSessions.BASIC.length})</TabsTrigger>
          <TabsTrigger value="INTERMEDIATE">
            Intermediate ({groupedSessions.INTERMEDIATE.length})
          </TabsTrigger>
          <TabsTrigger value="ADVANCED">
            Advanced ({groupedSessions.ADVANCED.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="border border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Session {session.sessionNumber}
                </CardTitle>
                <PracticeLevelBadge level={session.level} size="sm" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {session.scenario?.situation}
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {session.skillsTested?.slice(0, 2).map((skill, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {(session.skillsTested?.length ?? 0) > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{(session.skillsTested?.length ?? 0) - 2}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {session.questionCount} questions
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewSession(session.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Session {sessionDetail?.sessionNumber}
              {sessionDetail && <PracticeLevelBadge level={sessionDetail.level} />}
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : sessionDetail ? (
            <ScrollArea className="h-[calc(90vh-150px)]">
              <div className="space-y-6 pr-4">
                {/* Scenario */}
                {sessionDetail.scenario && (
                  <div className="p-4 bg-muted rounded-md border border-border">
                    <p className="text-sm font-medium mb-2">Scenario</p>
                    <p className="text-sm">{sessionDetail.scenario.situation}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Context: {sessionDetail.scenario.context}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stakes: {sessionDetail.scenario.stakes}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {sessionDetail.skillsTested && sessionDetail.skillsTested.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Skills Tested</p>
                    <div className="flex flex-wrap gap-2">
                      {sessionDetail.skillsTested.map((skill, i) => (
                        <Badge key={i} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questions */}
                <div className="space-y-4">
                  <p className="text-sm font-medium">Questions</p>
                  {sessionDetail.questions?.map((question) => (
                    <Card key={question.id} className="border border-border">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Q{question.questionNumber}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {question.questionFormat}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-4">{question.questionText}</p>
                        <div className="space-y-3">
                          {question.answers?.map((answer) => (
                            <div
                              key={answer.id}
                              className={cn(
                                'p-3 rounded-md border',
                                answerQualityClass(answer.answerQuality),
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-sm">
                                  {answer.answerLabel}.
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm">{answer.answerText}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    {answerQualityIcon(answer.answerQuality)}
                                    <span className="text-xs font-medium">
                                      {answer.answerQuality}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    {answer.feedback}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

