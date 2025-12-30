'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/../../amplify/data/resource';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Search, FileText, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const client = generateClient<Schema>();

interface Topic {
  id: string;
  title: string;
  description: string;
  topicStatus: string;
  llamaCloudPipelineId?: string;
}

interface Citation {
  excerptNumber: number;
  page: number | string;
  fileName: string;
  excerpt: string;
  relevanceScore: number;
}

interface QueryResponse {
  success: boolean;
  answer?: string;
  citations?: Citation[];
  metadata?: {
    topicTitle: string;
    queryDate: string;
    nodesRetrieved: number;
  };
  error?: string;
}

export default function QueryPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string>('');

  // Fetch topics on mount
  useEffect(() => {
    async function fetchTopics() {
      try {
        setIsLoadingTopics(true);
        const { data: topicsData } = await client.models.Topic.list();

        // Filter to only show READY topics
        const readyTopics = topicsData.filter(
          (topic) => topic.topicStatus === 'READY'
        );

        setTopics(readyTopics as Topic[]);

        // Auto-select first topic if available
        if (readyTopics.length > 0 && readyTopics[0].id) {
          setSelectedTopicId(readyTopics[0].id);
        }
      } catch (err) {
        console.error('Error fetching topics:', err);
        setError('Failed to load topics');
      } finally {
        setIsLoadingTopics(false);
      }
    }

    fetchTopics();
  }, []);

  const handleSubmitQuery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTopicId) {
      setError('Please select a topic');
      return;
    }

    if (!query.trim()) {
      setError('Please enter a question');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setResponse(null);

      const { data: result, errors } = await client.mutations.queryTopic({
        topicId: selectedTopicId,
        query: query.trim(),
      });

      if (errors) {
        throw new Error(errors.map((e) => e.message).join(', '));
      }

      if (result) {
        const parsed: QueryResponse = JSON.parse(result);
        setResponse(parsed);

        if (!parsed.success) {
          setError(parsed.error || 'Query failed');
        }
      }
    } catch (err) {
      console.error('Error querying topic:', err);
      setError(err instanceof Error ? err.message : 'Failed to query topic');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-background pt-20 px-6'>
      <div className='max-w-5xl mx-auto py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold mb-2'>Query Topics</h1>
          <p className='text-muted-foreground'>
            Select a topic and ask questions about the document
          </p>
        </div>

        {/* Topic Selection */}
        <Card className='p-6 mb-6'>
          <h2 className='text-xl font-semibold mb-4'>Select a Topic</h2>

          {isLoadingTopics ? (
            <div className='flex items-center gap-2 text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' />
              Loading topics...
            </div>
          ) : topics.length === 0 ? (
            <p className='text-muted-foreground'>
              No topics available for querying. Please contact an administrator to upload documents.
            </p>
          ) : (
            <div className='space-y-3'>
              {topics.map((topic) => (
                <label
                  key={topic.id}
                  className='flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors'
                >
                  <input
                    type='checkbox'
                    checked={selectedTopicId === topic.id}
                    onChange={() => setSelectedTopicId(topic.id)}
                    className='mt-1 h-4 w-4'
                  />
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-1'>
                      <FileText className='h-4 w-4 text-muted-foreground' />
                      <span className='font-medium'>{topic.title}</span>
                      {topic.topicStatus === 'READY' && (
                        <CheckCircle2 className='h-4 w-4 text-green-600' />
                      )}
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      {topic.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </Card>

        {/* Query Form */}
        {selectedTopicId && (
          <Card className='p-6 mb-6'>
            <h2 className='text-xl font-semibold mb-4'>Ask a Question</h2>
            <form onSubmit={handleSubmitQuery} className='space-y-4'>
              <div>
                <Input
                  type='text'
                  placeholder='e.g., What are the rules for extra time?'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={isLoading}
                  className='text-base'
                />
              </div>

              {error && (
                <div className='text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3'>
                  {error}
                </div>
              )}

              <Button type='submit' disabled={isLoading || !query.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className='mr-2 h-4 w-4' />
                    Search
                  </>
                )}
              </Button>
            </form>
          </Card>
        )}

        {/* Results */}
        {response && response.success && (
          <Card className='p-6'>
            <h2 className='text-xl font-semibold mb-4'>Answer</h2>

            {/* Answer */}
            <div className='prose prose-slate max-w-none mb-6 prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-table:border-collapse prose-td:border prose-td:border-gray-300 prose-td:p-2 prose-th:border prose-th:border-gray-300 prose-th:bg-gray-100 prose-th:p-2'>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {response.answer || ''}
              </ReactMarkdown>
            </div>

            {/* Metadata */}
            {response.metadata && (
              <div className='text-sm text-muted-foreground mb-6 pb-6 border-b'>
                <p>
                  <strong>Source:</strong> {response.metadata.topicTitle}
                </p>
                <p>
                  <strong>Retrieved:</strong> {response.metadata.nodesRetrieved}{' '}
                  relevant sections
                </p>
              </div>
            )}

            {/* Citations */}
            {response.citations && response.citations.length > 0 && (
              <div>
                <h3 className='text-lg font-semibold mb-3'>Citations</h3>
                <div className='space-y-3'>
                  {response.citations.map((citation) => (
                    <div
                      key={citation.excerptNumber}
                      className='border rounded-lg p-4 bg-accent/50'
                    >
                      <div className='flex items-center gap-2 mb-2'>
                        <span className='font-medium text-sm'>
                          Excerpt {citation.excerptNumber}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          Page {citation.page}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          • Relevance: {(citation.relevanceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        {citation.excerpt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
