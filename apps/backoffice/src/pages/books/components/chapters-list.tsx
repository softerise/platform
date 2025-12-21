import * as React from 'react';
import { useList, useDelete } from '@refinedev/core';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ConfirmDialog,
  EmptyState,
  LoadingSkeleton,
  toast,
} from '@project/ui';
import { Plus, Pencil, Trash2, Lock, FileText } from 'lucide-react';
import { ChapterForm } from './chapter-form';

interface Chapter {
  id: string;
  chapterTitle: string;
  content: string;
  wordCount?: number;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChaptersListProps {
  bookId: string;
}

export function ChaptersList({ bookId }: ChaptersListProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingChapter, setEditingChapter] = React.useState<Chapter | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingChapter, setDeletingChapter] = React.useState<Chapter | null>(
    null,
  );

  const { data, isLoading, isError, refetch } = useList<Chapter>({
    resource: `books/${bookId}/chapters`,
  });

  const { mutate: deleteChapter, isLoading: deleting } = useDelete();

  const chapters = data?.data ?? [];

  const handleOpenCreate = () => {
    setEditingChapter(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingChapter(null);
  };

  const handleSuccess = () => {
    toast.success(
      editingChapter ? 'Chapter updated successfully' : 'Chapter created successfully',
    );
    handleDialogClose();
    refetch();
  };

  const handleDeleteClick = (chapter: Chapter) => {
    setDeletingChapter(chapter);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deletingChapter) return;

    deleteChapter(
      {
        resource: `books/${bookId}/chapters`,
        id: deletingChapter.id,
      },
      {
        onSuccess: () => {
          toast.success('Chapter deleted successfully');
          setDeleteDialogOpen(false);
          setDeletingChapter(null);
          refetch();
        },
        onError: () => {
          toast.error('Failed to delete chapter');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chapters</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton variant="table" rows={5} />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chapters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive">Failed to load chapters</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Chapters ({chapters.length})
          </CardTitle>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Add Chapter
          </Button>
        </CardHeader>
        <CardContent>
          {chapters.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No chapters yet"
              description="Add your first chapter to get started with this book."
              action={{
                label: 'Add First Chapter',
                onClick: handleOpenCreate,
              }}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[120px]">Word Count</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chapters.map((chapter, index) => (
                    <TableRow key={chapter.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {chapter.chapterTitle}
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums">
                          {chapter.wordCount?.toLocaleString() ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {chapter.isLocked ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/15 text-amber-700 border-amber-500/30"
                          >
                            <Lock className="mr-1 h-3 w-3" />
                            Locked
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                          >
                            Available
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={chapter.isLocked}
                            onClick={() => handleOpenEdit(chapter)}
                            title={
                              chapter.isLocked
                                ? 'Cannot edit locked chapter'
                                : 'Edit chapter'
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={chapter.isLocked}
                            onClick={() => handleDeleteClick(chapter)}
                            title={
                              chapter.isLocked
                                ? 'Cannot delete locked chapter'
                                : 'Delete chapter'
                            }
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChapter ? 'Edit Chapter' : 'Add New Chapter'}
            </DialogTitle>
          </DialogHeader>
          <ChapterForm
            bookId={bookId}
            chapter={editingChapter}
            onSuccess={handleSuccess}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Chapter"
        description={`Are you sure you want to delete "${deletingChapter?.chapterTitle}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </>
  );
}

