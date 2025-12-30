import type { Schema } from '../../data/resource';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import Anthropic from '@anthropic-ai/sdk';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const LLAMA_CLOUD_API_BASE = 'https://api.cloud.llamaindex.ai/api/v1';

// TypeScript interfaces for Llama Cloud response
interface NodeExtraInfo {
  page_label?: number | string;
  file_name?: string;
  start_char_idx?: number;
  end_char_idx?: number;
}

interface NodeRelationship {
  node_id: string;
  node_type: string;
}

interface RetrievalNode {
  id_: string;
  text: string;
  extra_info?: NodeExtraInfo;
  relationships?: Record<string, NodeRelationship>;
  metadata?: Record<string, unknown>;
}

interface RetrievalResult {
  node: RetrievalNode;
  score: number;
}

interface LlamaCloudRetrievalResponse {
  retrieval_nodes: RetrievalResult[];
}

/**
 * Lambda handler to query a topic's indexed document
 *
 * Flow:
 * 1. Get Topic from DynamoDB to retrieve pipeline ID
 * 2. Retrieve relevant nodes from Llama Cloud
 * 3. Format nodes as context with page numbers
 * 4. Send to Claude for synthesis
 * 5. Return answer with citations
 */
export const handler: Schema['queryTopic']['functionHandler'] = async (
  event
) => {
  const { topicId, query } = event.arguments;

  console.log('🔍 Starting query');
  console.log(`Topic ID: ${topicId}`);
  console.log(`Query: ${query}`);

  // Verify environment variables
  const tableName = process.env.TOPIC_TABLE_NAME;
  const llamaCloudApiKey = process.env.LLAMA_CLOUD_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!tableName || !llamaCloudApiKey || !anthropicApiKey) {
    const error = 'Missing required environment variables';
    console.error('❌', error);
    return JSON.stringify({
      success: false,
      error,
    });
  }

  try {
    // Step 1: Get Topic from DynamoDB
    console.log('📝 Fetching Topic from DynamoDB');
    const getResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { id: topicId },
      })
    );

    if (!getResult.Item) {
      throw new Error(`Topic not found: ${topicId}`);
    }

    const topic = getResult.Item;
    console.log(`✅ Found topic: ${topic.title}`);
    console.log(`Status: ${topic.topicStatus}`);
    console.log(`Pipeline ID: ${topic.llamaCloudPipelineId}`);

    // Validate topic is ready
    if (topic.topicStatus !== 'READY') {
      throw new Error(
        `Topic is not ready for querying. Current status: ${topic.topicStatus}`
      );
    }

    if (!topic.llamaCloudPipelineId) {
      throw new Error('Topic does not have a Llama Cloud pipeline ID');
    }

    // Step 2: Retrieve relevant nodes from Llama Cloud
    console.log('🔎 Retrieving nodes from Llama Cloud');
    const retrievalResponse = await fetch(
      `${LLAMA_CLOUD_API_BASE}/pipelines/${topic.llamaCloudPipelineId}/retrieve`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llamaCloudApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          similarity_top_k: 10, // Retrieve top 10 most relevant nodes
        }),
      }
    );

    if (!retrievalResponse.ok) {
      const errorText = await retrievalResponse.text();
      throw new Error(
        `Failed to retrieve from Llama Cloud: ${retrievalResponse.status} - ${errorText}`
      );
    }

    const retrievalData =
      (await retrievalResponse.json()) as LlamaCloudRetrievalResponse;
    const retrievalNodes = retrievalData.retrieval_nodes || [];

    console.log(`✅ Retrieved ${retrievalNodes.length} nodes`);

    if (retrievalNodes.length === 0) {
      return JSON.stringify({
        success: true,
        answer:
          "I couldn't find relevant information in the document to answer this question.",
        citations: [],
        metadata: {
          topicTitle: topic.title,
          nodesRetrieved: 0,
        },
      });
    }

    // Step 3: Format nodes as context
    console.log('📄 Formatting context');
    const context = retrievalNodes
      .map((item: RetrievalResult, index: number) => {
        const node = item.node;
        const pageNum = node.extra_info?.page_label || 'Unknown';
        const text = node.text || '';

        return `[Excerpt ${index + 1} - Page ${pageNum}]\n${text.trim()}`;
      })
      .join('\n\n---\n\n');

    // Step 4: Send to Claude for synthesis
    console.log('🤖 Sending to Claude for synthesis');
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });

    const systemPrompt = `You are an expert assistant helping SEND specialists understand JCQ regulations and guidance documents.

Your role is to:
- Provide accurate, authoritative information from the source material
- Always cite specific page numbers when making claims
- Use clear, professional language appropriate for education professionals
- If information is ambiguous or incomplete, acknowledge this
- Quote directly from the source when it strengthens your answer

Format citations as: (Page X) immediately after the relevant information.`;

    const userPrompt = `Based on the following excerpts from "${topic.title}", please answer this question:

**Question**: ${query}

**Source Excerpts**:

${context}

Please provide a clear, well-structured answer with specific page citations.`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const answer = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('✅ Claude synthesis complete');

    // Step 5: Return structured response
    const citations = retrievalNodes.map((item: RetrievalResult, index: number) => {
      const node = item.node;
      return {
        excerptNumber: index + 1,
        page: node.extra_info?.page_label || 'Unknown',
        fileName: node.extra_info?.file_name || 'Unknown',
        excerpt: node.text ? node.text.substring(0, 250) + '...' : '',
        relevanceScore: item.score || 0,
      };
    });

    console.log('🎉 Query completed successfully');
    return JSON.stringify({
      success: true,
      answer,
      metadata: {
        topicTitle: topic.title,
        queryDate: new Date().toISOString(),
        nodesRetrieved: retrievalNodes.length,
      },
      citations,
    });
  } catch (error) {
    console.error('❌ Error querying topic:', error);

    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};
