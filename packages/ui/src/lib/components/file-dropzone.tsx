import * as React from 'react';
import { AlertCircle, File as FileIcon, Upload, X } from 'lucide-react';

import { cn } from '../utils';
import { Button } from './ui/button';

export interface FileDropzoneProps {
  accept?: string;
  maxSize?: number;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export function FileDropzone({
  accept = '.csv',
  maxSize = 1048576,
  onFileSelect,
  disabled = false,
  className,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (accept && !file.name.toLowerCase().endsWith(accept.replace('*', ''))) {
      return `Only ${accept} files are allowed`;
    }
    if (maxSize && file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => (!disabled ? inputRef.current?.click() : undefined)}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
          isDragOver && 'border-primary bg-primary/5',
          error && 'border-destructive bg-destructive/5',
          !isDragOver && !error && 'border-muted-foreground/25 hover:border-primary/50',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex items-center gap-3">
            <FileIcon className="h-8 w-8 text-muted-foreground" aria-hidden />
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(event) => {
                event.stopPropagation();
                clearFile();
              }}
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">Drop {accept} file here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Max size: {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </>
        )}
      </div>

      {error ? (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          {error}
        </div>
      ) : null}
    </div>
  );
}


