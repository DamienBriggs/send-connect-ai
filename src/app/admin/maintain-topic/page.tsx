import { checkIsAdmin, cookieBasedClient } from '@/lib/amplify-utils';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, FileText } from 'lucide-react';
import { TopicUploadForm } from '@/components/ui/admin/topic-upload-form';

/**
 * Admin-only page for maintaining Topic records
 * Allows admins to upload topic documents and view existing topics
 */
export default async function MaintainTopicPage() {
  // Server-side authorization check
  const isAdmin = await checkIsAdmin();

  if (!isAdmin) {
    redirect('/auth/home');
  }

  // Fetch existing topics
  const { data: topics } = await cookieBasedClient.models.Topic.list({
    sortDirection: 'DESC',
  });

  return (
    <div className='container mx-auto py-8 px-4 max-w-7xl'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold tracking-tight'>Maintain Topics</h1>
        <p className='text-muted-foreground mt-2'>
          Upload new topic documents and manage existing topics
        </p>
      </div>

      {/* Upload Form */}
      <div className='mb-8'>
        <TopicUploadForm />
      </div>

      {/* Topics List */}
      <div>
        <h2 className='text-2xl font-bold tracking-tight mb-4'>
          Existing Topics
        </h2>
        {topics && topics.length > 0 ? (
          <div className='grid gap-4'>
            {topics.map((topic) => {
              const statusColors = {
                PENDING:
                  'bg-yellow-50 text-yellow-700 ring-yellow-700/10 dark:bg-yellow-900/20 dark:text-yellow-300 dark:ring-yellow-700/20',
                INDEXING:
                  'bg-blue-50 text-blue-700 ring-blue-700/10 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700/20',
                READY:
                  'bg-green-50 text-green-700 ring-green-700/10 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-700/20',
                FAILED:
                  'bg-red-50 text-red-700 ring-red-700/10 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-700/20',
              } as const;
              const statusColor = topic.topicStatus
                ? statusColors[topic.topicStatus]
                : statusColors.PENDING;

              return (
                <Card key={topic.id}>
                  <CardHeader>
                    <div className='flex items-start justify-between'>
                      <div className='space-y-1 flex-1'>
                        <CardTitle>{topic.title}</CardTitle>
                        <CardDescription>
                          Created:{' '}
                          {new Date(topic.createdAt || '').toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className='flex gap-2'>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColor}`}
                        >
                          {topic.topicStatus || 'PENDING'}
                        </span>
                        <Button variant='outline' size='sm'>
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button variant='outline' size='sm'>
                          <FileText className='h-4 w-4' />
                        </Button>
                        <Button
                          variant='outline'
                          size='sm'
                          className='text-destructive'
                        >
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className='text-sm text-muted-foreground'>
                      {topic.description}
                    </p>
                    <div className='flex gap-2 mt-4 text-xs text-muted-foreground'>
                      <span>S3 Key: {topic.s3Key}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <FileText className='h-12 w-12 text-muted-foreground mb-4' />
              <h3 className='text-lg font-semibold mb-2'>No topics yet</h3>
              <p className='text-sm text-muted-foreground'>
                Upload your first topic document using the form above
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
