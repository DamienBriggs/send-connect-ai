# Llama Cloud Implementation - Simplified Architecture

## Overview

We've implemented **Option A: One Pipeline Per Topic** - each regulatory document gets its own dedicated Llama Cloud pipeline.

## Architecture

```
PDF Upload
  ↓
Save to S3 (raw bucket)
  ↓
Create Topic (PENDING)
  ↓
Lambda: uploadToLlamaCloud
  ├─ Create Llama Cloud pipeline for this topic
  ├─ Upload PDF to Llama Cloud
  ├─ Llama Cloud handles:
  │   ├─ PDF parsing (via LlamaParse internally)
  │   ├─ Semantic chunking
  │   ├─ Embedding generation
  │   └─ Vector indexing
  └─ Store pipeline_id in Topic
  ↓
Topic status: READY
  ↓
User queries → Retrieve from pipeline → LLM synthesis → Response with citations
```

## What Was Removed

### ❌ Deprecated/Removed

1. **`amplify/functions/parse-topic-document/`**
   - Old Lambda that called LlamaParse API directly
   - No longer needed - Llama Cloud handles parsing internally

2. **`amplify/storage/sendConnectParsedDocs`**
   - S3 bucket for storing intermediate JSON
   - No longer needed - we don't store parsed JSON anymore

3. **`parseTopicDocument` mutation**
   - Removed from schema
   - Replaced by `uploadToLlamaCloud`

4. **Topic field: `s3KeyParsed`**
   - No longer storing parsed JSON
   - Removed from schema

5. **Status: `PROCESSING_PARSE`**
   - No longer have separate parsing step
   - Simplified to: PENDING → INDEXING → READY

### ✅ What Remains

1. **`amplify/storage/sendConnectRawDocs`**
   - Keep for backup/audit trail of original PDFs

2. **`uploadToLlamaCloud` Lambda**
   - New simplified upload Lambda
   - Handles: PDF → Llama Cloud → indexed

3. **`testQueryLlamaCloud` mutation**
   - For testing retrieval

## Topic Schema (Final)

```typescript
TopicStatus: a.enum([
  'PENDING',    // Initial state after PDF upload
  'INDEXING',   // Uploading to Llama Cloud
  'READY',      // Indexed and ready to query
  'FAILED',     // Upload or indexing failed
])

Topic: a.model({
  title: a.string().required(),                // e.g., "JCQ Access Arrangements 2025"
  description: a.string().required(),          // What the document covers
  s3Key: a.string().required(),                // Raw PDF in S3
  topicStatus: a.ref('TopicStatus'),           // Current status
  llamaCloudPipelineId: a.string(),            // Pipeline ID for querying
  llamaCloudFileId: a.string(),                // File ID (for tracking)
  indexedAt: a.datetime(),                     // When indexing completed
})
```

## Usage Flow

### Admin: Upload Document

```typescript
// 1. Upload PDF to S3 (via UI)
const s3Key = await uploadToS3(pdfFile);

// 2. Create Topic
const topic = await client.models.Topic.create({
  title: "JCQ Access Arrangements 2025-2026",
  description: "Official JCQ guidance on access arrangements for students with SEND",
  s3Key: s3Key,
  topicStatus: "PENDING"
});

// 3. Trigger indexing
await client.mutations.uploadToLlamaCloud({
  topicId: topic.id,
  s3Key: s3Key,
  rawBucketName: "your-raw-bucket",
  topicTitle: topic.title
});

// 4. Topic status: PENDING → INDEXING → READY
// 5. Topic now has llamaCloudPipelineId for querying
```

### User: Query Document

```typescript
// 1. Get topic
const topic = await client.models.Topic.get({ id: topicId });

// 2. Query Llama Cloud
const results = await fetch(
  `https://api.cloud.llamaindex.ai/api/v1/pipelines/${topic.llamaCloudPipelineId}/retrieve`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLAMA_CLOUD_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: userQuestion,
      similarity_top_k: 10
    })
  }
);

const nodes = results.retrieval_nodes;

// 3. Format context
const context = nodes.map(node =>
  `[Page ${node.extra_info.page_label}]\n${node.text}`
).join('\n\n---\n\n');

// 4. Send to Claude for synthesis
const answer = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  messages: [{
    role: "user",
    content: `Based on these excerpts from ${topic.title}, answer: ${userQuestion}\n\nContext:\n${context}`
  }]
});

// 5. Return answer with citations
```

## Benefits of This Approach

### ✅ Simplicity
- One Lambda instead of two
- No intermediate JSON storage
- Automatic PDF parsing via Llama Cloud

### ✅ Quality
- High-quality PDF parsing (LlamaParse)
- Clean markdown text (not JSON artifacts)
- Page numbers + character indices preserved

### ✅ Performance
- Fully managed infrastructure
- No polling for parsing completion
- Immediate indexing after upload

### ✅ Cost-Effective
- Pay only for what you use
- ~5-10 documents total
- Low re-indexing frequency

### ✅ Scalability
- Handles thousands of concurrent queries
- Independent pipelines per topic
- Easy to add new documents

## Next Steps

1. ✅ Deploy the new Lambda
2. ✅ Test with JCQ document
3. Build query/answer function (next phase)
4. Build frontend UI for querying

## Manual Cleanup (Optional)

You can manually delete:

```bash
# Delete old parse Lambda directory
rm -rf amplify/functions/parse-topic-document/

# Delete parsed docs storage (after removing from storage/resource.ts)
# Update amplify/storage/resource.ts first to remove sendConnectParsedDocs export
```

But it's safe to leave them for now - they're not being used.

---

## Troubleshooting Guide

This section documents issues encountered during implementation and their solutions.

### Environment Variables Setup

**Critical Distinction: Organization ID vs Project ID**

Llama Cloud has two levels of hierarchy:
- **Organization**: Top-level account (UUID format)
- **Project**: Sub-entity within organization (UUID format)

**Required Environment Variables:**

```bash
# Add these via: npx ampx sandbox secret set <KEY_NAME>

LLAMA_CLOUD_API_KEY=llx-YOUR_API_KEY_HERE
LLAMA_CLOUD_ORGANIZATION_ID=YOUR_ORG_ID_HERE     # Optional, for reference
LLAMA_CLOUD_PROJECT_ID=YOUR_PROJECT_ID_HERE      # Required for file upload
```

**How to find your Project ID:**
1. Go to https://cloud.llamaindex.ai/
2. Navigate to Settings → Organization
3. Under "Projects" section, copy the ID column (not the Name)

### Common API Errors and Solutions

#### Error 1: Embedding Authentication Failure (400)

**Error:**
```
Failed to create pipeline: 400 -
{
    "detail": "We encountered an authentication error while validating the embedding connection.
    Please check the credentials and try again."
}
```

**Cause:** Tried to use `OPENAI_EMBEDDING` without configuring OpenAI API key in Llama Cloud.

**Solution:** Remove `embedding_config` entirely from pipeline creation - Llama Cloud will use defaults:

```typescript
// ❌ WRONG - requires OpenAI API key
body: JSON.stringify({
  name: pipelineName,
  embedding_config: {
    type: 'OPENAI_EMBEDDING',
    component: { model_name: 'text-embedding-3-small' }
  }
})

// ✅ CORRECT - uses Llama Cloud defaults
body: JSON.stringify({
  name: pipelineName,
  transform_config: {
    mode: 'auto',
    config_name: 'auto',
  }
})
```

#### Error 2: Project ID Mismatch (401)

**Error:**
```
Failed to upload file: 401 -
{
    "detail": "Project ID specified in the URL does not match the project ID associated with the API key"
}
```

**Cause:** Using Organization ID instead of Project ID in the file upload request.

**Solution:** Use `LLAMA_CLOUD_PROJECT_ID` (not `LLAMA_CLOUD_ORGANIZATION_ID`):

```typescript
// ❌ WRONG
const uploadResponse = await fetch(
  `${LLAMA_CLOUD_API_BASE}/files?project_id=${organizationId}`,
  ...
);

// ✅ CORRECT
const uploadResponse = await fetch(
  `${LLAMA_CLOUD_API_BASE}/files?project_id=${projectId}`,
  ...
);
```

#### Error 3: Missing Form Field (422)

**Error:**
```
Failed to upload file: 422 -
{
    "detail": [
        {
            "type": "missing",
            "loc": ["body", "upload_file"],
            "msg": "Field required",
            "input": null
        }
    ]
}
```

**Cause:** Wrong form field name - used `file` instead of `upload_file`.

**Solution:** Use correct field name:

```typescript
// ❌ WRONG
formData.append('file', blob, fileName);

// ✅ CORRECT
formData.append('upload_file', blob, fileName);
```

#### Error 4: Method Not Allowed (405) - File Upload

**Error:**
```
Failed to upload file: 405 -
{
    "detail": "Method Not Allowed"
}
```

**Cause:** Wrong endpoint - tried `/files/upload` or `/pipelines/{id}/files/upload`.

**Solution:** Use correct endpoint `/files` with POST:

```typescript
// ❌ WRONG
const uploadResponse = await fetch(
  `${LLAMA_CLOUD_API_BASE}/files/upload?project_id=${projectId}`,
  { method: 'POST', ... }
);

// ✅ CORRECT
const uploadResponse = await fetch(
  `${LLAMA_CLOUD_API_BASE}/files?project_id=${projectId}`,
  { method: 'POST', ... }
);
```

#### Error 5: Method Not Allowed (405) - Add File to Pipeline

**Error:**
```
Failed to add file to pipeline: 405 -
{
    "detail": "Method Not Allowed"
}
```

**Cause:** Used POST instead of PUT to add file to pipeline.

**Solution:** Use PUT method with correct body format:

```typescript
// ❌ WRONG - POST method, wrong body format
const response = await fetch(
  `${LLAMA_CLOUD_API_BASE}/pipelines/${pipelineId}/files`,
  {
    method: 'POST',
    body: JSON.stringify({ file_ids: [fileId] })
  }
);

// ✅ CORRECT - PUT method, correct body format
const response = await fetch(
  `${LLAMA_CLOUD_API_BASE}/pipelines/${pipelineId}/files`,
  {
    method: 'PUT',
    body: JSON.stringify([{ file_id: fileId }])
  }
);
```

### Final Working API Configuration

#### Step 1: Create Pipeline

```typescript
const createPipelineResponse = await fetch(
  `https://api.cloud.llamaindex.ai/api/v1/pipelines`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: pipelineName,
      transform_config: {
        mode: 'auto',
        config_name: 'auto',
      },
    }),
  }
);

const pipelineData = await createPipelineResponse.json();
const pipelineId = pipelineData.id;
```

#### Step 2: Upload File to Llama Cloud

```typescript
const formData = new FormData();
const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
formData.append('upload_file', blob, fileName);

const uploadResponse = await fetch(
  `https://api.cloud.llamaindex.ai/api/v1/files?project_id=${projectId}`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'accept': 'application/json',
    },
    body: formData,
  }
);

const uploadData = await uploadResponse.json();
const fileId = uploadData.id;
```

#### Step 3: Add File to Pipeline

```typescript
const addFileResponse = await fetch(
  `https://api.cloud.llamaindex.ai/api/v1/pipelines/${pipelineId}/files`,
  {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify([{ file_id: fileId }]),
  }
);
```

### Key Learnings

1. **Embedding Configuration**: Omitting `embedding_config` lets Llama Cloud use sensible defaults. Only specify if you need a particular embedding model and have configured API credentials.

2. **Organization vs Project**: The file upload API requires `project_id`, not `organization_id`. Find your project ID in the Llama Cloud console under Settings → Organization → Projects.

3. **Form Field Names**: The API is strict about field names - use `upload_file` for file uploads.

4. **HTTP Methods Matter**:
   - `POST` for creating pipelines and uploading files
   - `PUT` for adding files to existing pipelines

5. **Error Handling**: Save the `pipelineId` even when upload fails, so you can track and clean up orphaned pipelines.

6. **Two-Step Upload**: Files must be uploaded to `/files` first, then associated with a pipeline using `/pipelines/{id}/files`. There's no single-step upload-to-pipeline endpoint.

### Monitoring and Debugging

**Check Pipeline Status:**
```bash
# View pipelines in Llama Cloud Console
https://cloud.llamaindex.ai/

# Or use the API
curl -X GET "https://api.cloud.llamaindex.ai/api/v1/pipelines" \
  -H "Authorization: Bearer ${LLAMA_CLOUD_API_KEY}"
```

**Check CloudWatch Logs:**
```bash
# View Lambda logs
npx ampx sandbox

# Then check the console output for log stream URLs
```

**Verify DynamoDB Record:**
```bash
# Check that llamaCloudPipelineId was saved
# View Topic table in AWS Console → DynamoDB
```

### Testing the Complete Flow

```typescript
// Test file upload and indexing
const topic = await client.models.Topic.create({
  title: "Test Document",
  description: "Testing Llama Cloud integration",
  s3Key: "send-connect-raw-docs/user-id/test.pdf",
  topicStatus: "PENDING"
});

const result = await client.mutations.uploadToLlamaCloud({
  topicId: topic.id,
  s3Key: topic.s3Key,
  rawBucketName: "your-bucket-name",
  topicTitle: topic.title
});

// Check result
console.log('Upload result:', JSON.parse(result));

// Verify topic was updated
const updatedTopic = await client.models.Topic.get({ id: topic.id });
console.log('Pipeline ID:', updatedTopic.llamaCloudPipelineId);
console.log('Status:', updatedTopic.topicStatus); // Should be 'READY'
```
