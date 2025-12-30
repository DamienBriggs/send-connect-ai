'use client';

import { useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/../amplify/data/resource';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const client = generateClient<Schema>();

interface SampleNode {
  score: number;
  text?: string;
  metadata?: {
    page?: number;
    page_label?: number;
    [key: string]: unknown;
  };
  extra_info?: {
    page_label?: number;
    [key: string]: unknown;
  };
}

interface TestQueryResult {
  success: boolean;
  query: string;
  pipelineId: string;
  responseStructure?: {
    hasRetrievalNodes: boolean;
    nodeCount: number;
    sampleNode: SampleNode | null;
  };
  fullResponse?: unknown;
}

const PIPELINES = {
  json: {
    id: '737861a7-2a27-4f08-92ff-c3fbea1239bd',
    name: 'JSON-based (muddy-carp)',
    description: 'LlamaParse JSON uploaded to Llama Cloud'
  },
  pdf: {
    id: '6e7fbcc5-9f54-41a4-bb16-48ef177adfa0',
    name: 'PDF-based (involved-prawn)',
    description: 'Original PDF uploaded directly to Llama Cloud'
  }
};

export default function TestLlamaCloudPage() {
  const [query, setQuery] = useState('What are the rules for extra time?');
  const [pipelineType, setPipelineType] = useState<'json' | 'pdf'>('pdf');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pipelineId = PIPELINES[pipelineType].id;

  const handleQuery = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Calling testQueryLlamaCloud with:', { query, pipelineId });

      const response = await client.mutations.testQueryLlamaCloud({
        query,
        pipelineId,
      });

      console.log('Raw response:', response);

      if (response.data) {
        const parsedResult = JSON.parse(response.data);
        setResult(parsedResult);
        console.log('Parsed result:', parsedResult);
      } else if (response.errors) {
        setError(JSON.stringify(response.errors, null, 2));
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Test Llama Cloud Query</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Query Configuration</CardTitle>
          <CardDescription>
            Test the Llama Cloud retrieval to understand response structure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="query">Query</Label>
            <Input
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your question..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="pipelineType">Pipeline Type</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pipelineType"
                  value="pdf"
                  checked={pipelineType === 'pdf'}
                  onChange={(e) => setPipelineType(e.target.value as 'pdf')}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  PDF-based
                  <span className="text-gray-500 ml-1">(Original PDF)</span>
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pipelineType"
                  value="json"
                  checked={pipelineType === 'json'}
                  onChange={(e) => setPipelineType(e.target.value as 'json')}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  JSON-based
                  <span className="text-gray-500 ml-1">(LlamaParse JSON)</span>
                </span>
              </label>
            </div>
            <p className="text-sm text-gray-600 mt-2 p-2 bg-blue-50 rounded">
              {PIPELINES[pipelineType].description}
            </p>
          </div>

          <div>
            <Label htmlFor="pipelineId">Pipeline ID</Label>
            <Input
              id="pipelineId"
              value={pipelineId}
              disabled
              className="mt-1 bg-gray-100 font-mono text-xs"
            />
          </div>

          <Button
            onClick={handleQuery}
            disabled={loading || !query}
            className="w-full"
          >
            {loading ? 'Querying...' : 'Test Query'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto">{error}</pre>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quick Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Success:</strong> {result.success ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Nodes Retrieved:</strong> {result.responseStructure?.nodeCount || 0}</p>
                <p><strong>Has Retrieval Nodes:</strong> {result.responseStructure?.hasRetrievalNodes ? '✅ Yes' : '❌ No'}</p>
              </div>
            </CardContent>
          </Card>

          {result.responseStructure?.sampleNode && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>First Retrieved Node (Sample)</CardTitle>
                <CardDescription>
                  This shows what Llama Cloud returns for each match
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Score</Label>
                  <p className="text-sm">{result.responseStructure.sampleNode.score}</p>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Text Content</Label>
                  <p className="text-sm bg-gray-50 p-3 rounded border">
                    {result.responseStructure.sampleNode.text?.substring(0, 500)}
                    {(result.responseStructure.sampleNode.text?.length ?? 0) > 500 && '...'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Metadata (CRITICAL for Citations)</Label>
                  <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto">
                    {JSON.stringify(result.responseStructure.sampleNode.metadata, null, 2)}
                  </pre>
                  {(result.responseStructure.sampleNode.metadata?.page ||
                    result.responseStructure.sampleNode.metadata?.page_label ||
                    result.responseStructure.sampleNode.extra_info?.page_label) && (
                    <p className="text-sm text-green-600 mt-2">
                      ✅ Page number found: {
                        result.responseStructure.sampleNode.metadata?.page ||
                        result.responseStructure.sampleNode.metadata?.page_label ||
                        result.responseStructure.sampleNode.extra_info?.page_label
                      }
                    </p>
                  )}
                  {!(result.responseStructure.sampleNode.metadata?.page ||
                      result.responseStructure.sampleNode.metadata?.page_label ||
                      result.responseStructure.sampleNode.extra_info?.page_label) && (
                    <p className="text-sm text-orange-600 mt-2">
                      ⚠️ No page number in metadata - may need to re-index
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Full Response (Raw JSON)</CardTitle>
              <CardDescription>
                Complete response from Llama Cloud API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 p-4 rounded border overflow-auto max-h-96">
                {JSON.stringify(result.fullResponse, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
