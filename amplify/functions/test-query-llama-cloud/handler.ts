import type { Schema } from '../../data/resource';

/**
 * Test Lambda to explore Llama Cloud retrieval responses
 *
 * This function queries your existing Llama Cloud pipeline to understand:
 * 1. What data structure is returned
 * 2. Whether page numbers are preserved
 * 3. What metadata is available for citations
 * 4. How to format responses for users
 */
export const handler: Schema['testQueryLlamaCloud']['functionHandler'] = async (
  event
) => {
  const { query, pipelineId } = event.arguments;

  console.log('🔍 Testing Llama Cloud Query');
  console.log(`Query: ${query}`);
  console.log(`Pipeline ID: ${pipelineId}`);

  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  const organizationId = process.env.LLAMA_CLOUD_ORGANIZATION_ID;

  if (!apiKey || !organizationId) {
    const error = 'Missing LLAMA_CLOUD_API_KEY or LLAMA_CLOUD_ORGANIZATION_ID';
    console.error('❌', error);
    return JSON.stringify({
      success: false,
      error,
    });
  }

  try {
    // Use the REST API to retrieve documents
    // This matches the endpoint you shared: /api/v1/pipelines/{id}/retrieve
    const retrieveUrl = `https://api.cloud.llamaindex.ai/api/v1/pipelines/${pipelineId}/retrieve`;

    console.log(`📡 Calling: ${retrieveUrl}`);

    const response = await fetch(retrieveUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        similarity_top_k: 5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Llama Cloud query failed: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();

    console.log('✅ Query successful');
    console.log('📊 Response structure:', JSON.stringify(result, null, 2));

    // Log specific fields we care about for citations
    if (result.retrieval_nodes) {
      console.log(`📚 Retrieved ${result.retrieval_nodes.length} nodes`);

      result.retrieval_nodes.forEach((node: any, index: number) => {
        console.log(`\n--- Node ${index + 1} ---`);
        console.log('Score:', node.score);
        console.log('Text preview:', node.text?.substring(0, 100));
        console.log('Metadata:', JSON.stringify(node.metadata, null, 2));
      });
    }

    return JSON.stringify({
      success: true,
      query,
      pipelineId,
      responseStructure: {
        hasRetrievalNodes: !!result.retrieval_nodes,
        nodeCount: result.retrieval_nodes?.length || 0,
        sampleNode: result.retrieval_nodes?.[0] || null,
      },
      fullResponse: result,
    }, null, 2);

  } catch (error) {
    console.error('❌ Error querying Llama Cloud:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};
