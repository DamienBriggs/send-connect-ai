'use client';

import { useFormStatus } from 'react-dom';
import { useState, useCallback, useActionState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { saveTopicDocument } from '@/_actions/topic-actions';
import { Upload, FileText, X, CheckCircle2 } from 'lucide-react';

function SubmitButton({ hasFile }: { hasFile: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type='submit' disabled={pending || !hasFile}>
      {pending ? 'Uploading...' : 'Create Topic'}
    </Button>
  );
}

interface TopicUploadFormProps {
  onSuccess?: () => void;
}

export function TopicUploadForm({ onSuccess }: TopicUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFormAction = async (
    prevState: string | undefined,
    formData: FormData
  ) => {
    if (!selectedFile) {
      return 'Please select a PDF file to upload';
    }

    formData.append('file', selectedFile);
    const result = await saveTopicDocument(formData);

    if (result.success) {
      setUploadSuccess(true);
      setSelectedFile(null);
      // Reset form
      const form = document.getElementById(
        'topic-upload-form'
      ) as HTMLFormElement;
      form?.reset();
      // Hide success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
      onSuccess?.();
      return undefined;
    } else {
      return result.error || 'Failed to upload document';
    }
  };

  const [errorMessage, formAction] = useActionState(handleFormAction, undefined);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      // Validate file size (10 MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10 MB');
        return;
      }
      // Validate file type
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        return;
      }
      setSelectedFile(file);
      setUploadSuccess(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Topic</CardTitle>
        <CardDescription>
          Upload a PDF document to create a new topic
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id='topic-upload-form' action={formAction}>
          <FieldGroup className='gap-4'>
            {uploadSuccess && (
              <div className='rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-300'>
                <div className='flex items-start gap-2'>
                  <CheckCircle2 className='h-4 w-4 mt-0.5 flex-shrink-0' />
                  <div>
                    <p className='font-medium'>Topic created successfully!</p>
                    <p className='text-xs mt-1 opacity-90'>
                      Your PDF is being parsed in the background. The topic will appear below with status &quot;PENDING&quot; and will update to &quot;READY&quot; when processing is complete.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                {errorMessage}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor='title'>Title</FieldLabel>
              <Input
                id='title'
                name='title'
                type='text'
                placeholder='Enter topic title'
                required
                maxLength={200}
              />
              <FieldDescription>
                A clear, descriptive title for this topic (max 200 characters)
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor='description'>Description</FieldLabel>
              <textarea
                id='description'
                name='description'
                placeholder='Enter topic description'
                required
                maxLength={1000}
                rows={4}
                className='flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              />
              <FieldDescription>
                Describe the content and purpose of this topic (max 1000
                characters)
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>PDF Document</FieldLabel>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
              >
                <input {...getInputProps()} />
                {!selectedFile ? (
                  <div className='flex flex-col items-center gap-2'>
                    <Upload className='h-8 w-8 text-muted-foreground' />
                    <p className='text-sm font-medium'>
                      {isDragActive
                        ? 'Drop the PDF here'
                        : 'Drag & drop a PDF here, or click to select'}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Maximum file size: 10 MB
                    </p>
                  </div>
                ) : (
                  <div className='flex items-center justify-between gap-4 bg-muted/50 rounded-md p-3'>
                    <div className='flex items-center gap-3'>
                      <FileText className='h-8 w-8 text-primary' />
                      <div className='text-left'>
                        <p className='text-sm font-medium'>{selectedFile.name}</p>
                        <p className='text-xs text-muted-foreground'>
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile();
                      }}
                    >
                      <X className='h-4 w-4' />
                    </Button>
                  </div>
                )}
              </div>
              <FieldDescription>
                Upload a PDF document (required, max 10 MB)
              </FieldDescription>
            </Field>

            <div className='flex justify-end'>
              <SubmitButton hasFile={!!selectedFile} />
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
