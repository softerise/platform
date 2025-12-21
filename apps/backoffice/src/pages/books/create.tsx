import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreate } from '@refinedev/core';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Label,
  Input,
  Textarea,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  toast,
} from '@project/ui';
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react';

const bookSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  author: z.string().optional(),
  language: z.string().default('tr'),
});

type BookFormValues = z.infer<typeof bookSchema>;

const languageOptions = [
  { label: 'Turkish', value: 'tr' },
  { label: 'English', value: 'en' },
  { label: 'German', value: 'de' },
  { label: 'French', value: 'fr' },
  { label: 'Spanish', value: 'es' },
];

export function BookCreatePage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: '',
      description: '',
      author: '',
      language: 'tr',
    },
  });

  const { mutate: createBook, isLoading } = useCreate();

  const languageValue = watch('language');

  const onSubmit = (values: BookFormValues) => {
    createBook(
      {
        resource: 'books',
        values: {
          ...values,
          author: values.author || undefined,
        },
      },
      {
        onSuccess: (data) => {
          toast.success('Book created successfully. S1 evaluation will run automatically.');
          navigate(`/admin/books/${data.data.id}`);
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to create book');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/books')}
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Books
      </Button>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Create New Book
            </CardTitle>
            <CardDescription>
              Add a new book to the platform. S1 evaluation will run
              automatically after creation.
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
                  onValueChange={(value) => setValue('language', value)}
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

              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  After creating the book, the S1 AI evaluation will run
                  automatically to assess the book's quality and determine
                  pipeline eligibility.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Book'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/books')}
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

export default BookCreatePage;

