import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useShow, useUpdate } from '@refinedev/core';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  LoadingSkeleton,
  Label,
  Input,
  Textarea,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@project/ui';
import { ArrowLeft, BookOpen } from 'lucide-react';

const bookSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  author: z.string().optional(),
  language: z.string(),
});

type BookFormValues = z.infer<typeof bookSchema>;

interface Book {
  id: string;
  title: string;
  description: string;
  author?: string;
  language: string;
}

const languageOptions = [
  { label: 'Turkish', value: 'tr' },
  { label: 'English', value: 'en' },
  { label: 'German', value: 'de' },
  { label: 'French', value: 'fr' },
  { label: 'Spanish', value: 'es' },
];

export function BookEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const bookId = id ?? '';

  const { queryResult } = useShow<Book>({
    resource: 'books',
    id: bookId,
    queryOptions: { enabled: !!bookId, queryKey: ['books', bookId] },
  });

  const { data, isLoading: loadingBook, isError } = queryResult;
  const book = data?.data;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: '',
      description: '',
      author: '',
      language: 'tr',
    },
  });

  const { mutate: updateBook, isLoading: updating } = useUpdate();

  const languageValue = watch('language');

  // Populate form when book data loads
  React.useEffect(() => {
    if (book) {
      reset({
        title: book.title,
        description: book.description,
        author: book.author ?? '',
        language: book.language,
      });
    }
  }, [book, reset]);

  const onSubmit = (values: BookFormValues) => {
    updateBook(
      {
        resource: 'books',
        id: bookId,
        values: {
          ...values,
          author: values.author || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Book updated successfully');
          navigate(`/admin/books/${bookId}`);
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to update book');
        },
      },
    );
  };

  if (loadingBook) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="max-w-2xl mx-auto">
          <LoadingSkeleton variant="card" />
        </div>
      </div>
    );
  }

  if (isError || !book) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load book</p>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/books')}
              className="mt-4"
            >
              Back to Books
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/admin/books/${bookId}`)}
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Book
      </Button>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Edit Book
            </CardTitle>
            <CardDescription>
              Update the book details. Note: Changing content may affect S1
              evaluation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Enter book title"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Enter book description (minimum 20 characters)"
                  rows={4}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Author (Optional)</Label>
                <Input
                  id="author"
                  placeholder="Author name"
                  {...register('author')}
                />
                {errors.author && (
                  <p className="text-sm text-destructive">
                    {errors.author.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={languageValue}
                  onValueChange={(value) => setValue('language', value, { shouldDirty: true })}
                >
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={updating || !isDirty}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/admin/books/${bookId}`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default BookEditPage;

