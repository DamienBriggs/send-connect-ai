#!/usr/bin/env node

/**
 * Quick CLI script to test Llama Cloud query
 * Usage: node scripts/test-llama-cloud.mjs [json|pdf]
 *
 * Compares two indexing approaches:
 * - json: LlamaParse JSON uploaded to Llama Cloud
 * - pdf: Original PDF uploaded to Llama Cloud
 */

const LLAMA_CLOUD_API_KEY = 'llx-ziMIFusg0zGaAgLrHP786hEO7o79CUifcOBLDT2HLHNpU8sK';

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

const pipelineType = process.argv[2] || 'pdf'; // Default to PDF
const pipeline = PIPELINES[pipelineType];

if (!pipeline) {
  console.error(`Invalid pipeline type: ${pipelineType}`);
  console.error('Usage: node scripts/test-llama-cloud.mjs [json|pdf]');
  process.exit(1);
}

const PIPELINE_ID = pipeline.id;
const QUERY = 'What are the rules for extra time?';

console.log('🔍 Testing Llama Cloud Query\n');
console.log(`Pipeline: ${pipeline.name}`);
console.log(`Type: ${pipeline.description}`);
console.log(`ID: ${PIPELINE_ID}`);
console.log(`Query: "${QUERY}"\n`);

try {
  const response = await fetch(
    `https://api.cloud.llamaindex.ai/api/v1/pipelines/${PIPELINE_ID}/retrieve`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: QUERY,
        similarity_top_k: 5,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Query failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  console.log('✅ Query successful!\n');
  console.log(`📊 Retrieved ${result.retrieval_nodes?.length || 0} nodes\n`);

  if (result.retrieval_nodes && result.retrieval_nodes.length > 0) {
    console.log('=== FIRST NODE (Sample) ===\n');
    const firstNode = result.retrieval_nodes[0];

    console.log(`Score: ${firstNode.score}`);
    console.log(`\nText (first 300 chars):`);
    console.log(firstNode.text?.substring(0, 300) + '...\n');

    console.log('Metadata:');
    console.log(JSON.stringify(firstNode.metadata, null, 2));

    if (firstNode.metadata?.page) {
      console.log(`\n✅ PAGE NUMBER FOUND: ${firstNode.metadata.page}`);
    } else {
      console.log('\n⚠️  NO PAGE NUMBER IN METADATA');
    }

    console.log('\n=== ALL NODES ===\n');
    result.retrieval_nodes.forEach((node, i) => {
      console.log(`Node ${i + 1}:`);
      console.log(`  Score: ${node.score}`);
      console.log(`  Page: ${node.metadata?.page || 'N/A'}`);
      console.log(`  Text preview: ${node.text?.substring(0, 100)}...`);
      console.log('');
    });
  }

  console.log('\n=== FULL RESPONSE ===\n');
  console.log(JSON.stringify(result, null, 2));

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
