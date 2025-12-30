import type { Schema } from '../../data/resource';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const LLAMA_CLOUD_API_BASE = 'https://api.cloud.llamaindex.ai/api/v1';

/**
 * Lambda handler to upload PDF to Llama Cloud and create a dedicated pipeline
 *
 * Flow:
 * 1. Update Topic status to INDEXING
 * 2. Download PDF from S3
 * 3. Create a new Llama Cloud pipeline for this topic
 * 4. Upload PDF to Llama Cloud
 * 5. Add PDF to the pipeline (triggers indexing)
 * 6. Update Topic with pipeline_id and status READY
 */
export const handler: Schema['uploadToLlamaCloud']['functionHandler'] = async (
  event
) => {
  const { topicId, s3Key, rawBucketName, topicTitle } = event.arguments;

  console.log('🚀 Starting Llama Cloud upload');
  console.log(`Topic ID: ${topicId}`);
  console.log(`S3 Key: ${s3Key}`);
  console.log(`Bucket: ${rawBucketName}`);
  console.log(`Title: ${topicTitle}`);

  // Verify environment variables
  const tableName = process.env.TOPIC_TABLE_NAME;
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  const projectId = process.env.LLAMA_CLOUD_PROJECT_ID;

  if (!tableName || !apiKey || !projectId) {
    const error = 'Missing required environment variables';
    console.error('❌', error);
    return JSON.stringify({
      success: false,
      error,
    });
  }

  let pipelineId: string | undefined;

  try {
    // Step 1: Update Topic status to INDEXING
    console.log('📝 Updating Topic status to INDEXING');
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: topicId },
        UpdateExpression: 'SET topicStatus = :status, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':status': 'INDEXING',
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    // Step 2: Download PDF from S3
    console.log('📥 Downloading PDF from S3');
    const getObjectResponse = await s3Client.send(
      new GetObjectCommand({
        Bucket: rawBucketName,
        Key: s3Key,
      })
    );

    if (!getObjectResponse.Body) {
      throw new Error('Failed to download PDF from S3');
    }

    const pdfBytes = await getObjectResponse.Body.transformToByteArray();
    const pdfBuffer = Buffer.from(pdfBytes);
    console.log(`✅ Downloaded PDF (${pdfBuffer.length} bytes)`);

    // Step 3: Create Llama Cloud pipeline for this topic
    console.log('🔧 Creating Llama Cloud pipeline');
    const pipelineName = `${topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    const createPipelineResponse = await fetch(
      `${LLAMA_CLOUD_API_BASE}/pipelines`,
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

    if (!createPipelineResponse.ok) {
      const errorText = await createPipelineResponse.text();
      throw new Error(
        `Failed to create pipeline: ${createPipelineResponse.status} - ${errorText}`
      );
    }

    const pipelineData = await createPipelineResponse.json();
    pipelineId = pipelineData.id;
    console.log(`✅ Created pipeline: ${pipelineId}`);

    // Step 4: Upload PDF to Llama Cloud
    console.log('📤 Uploading PDF to Llama Cloud');
    const fileName = s3Key.split('/').pop() || 'document.pdf';

    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('upload_file', blob, fileName);

    const uploadResponse = await fetch(
      `${LLAMA_CLOUD_API_BASE}/files?project_id=${projectId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'accept': 'application/json',
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(
        `Failed to upload file: ${uploadResponse.status} - ${errorText}`
      );
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;
    console.log(`✅ Uploaded file: ${fileId}`);

    // Step 5: Add file to pipeline (triggers indexing)
    console.log('🔗 Adding file to pipeline');
    const addFileResponse = await fetch(
      `${LLAMA_CLOUD_API_BASE}/pipelines/${pipelineId}/files`,
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

    if (!addFileResponse.ok) {
      const errorText = await addFileResponse.text();
      throw new Error(
        `Failed to add file to pipeline: ${addFileResponse.status} - ${errorText}`
      );
    }

    console.log('✅ File added to pipeline - indexing started');

    // Step 6: Update Topic with pipeline_id and status READY
    console.log('📝 Updating Topic with pipeline info');
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: topicId },
        UpdateExpression:
          'SET llamaCloudPipelineId = :pipelineId, llamaCloudFileId = :fileId, topicStatus = :status, indexedAt = :indexedAt, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':pipelineId': pipelineId,
          ':fileId': fileId,
          ':status': 'READY',
          ':indexedAt': new Date().toISOString(),
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    console.log('🎉 PDF successfully uploaded and indexed!');
    return JSON.stringify({
      success: true,
      message: 'PDF uploaded and indexed successfully',
      pipelineId,
      fileId,
      pipelineName,
    });
  } catch (error) {
    console.error('❌ Error uploading to Llama Cloud:', error);

    // Update Topic status to FAILED
    // If pipeline was created, save its ID so we can track/clean up orphaned pipelines
    try {
      const updateExpression = pipelineId
        ? 'SET topicStatus = :status, llamaCloudPipelineId = :pipelineId, updatedAt = :updatedAt'
        : 'SET topicStatus = :status, updatedAt = :updatedAt';

      const expressionValues: Record<string, string> = {
        ':status': 'FAILED',
        ':updatedAt': new Date().toISOString(),
      };

      if (pipelineId) {
        expressionValues[':pipelineId'] = pipelineId;
      }

      await docClient.send(
        new UpdateCommand({
          TableName: tableName!,
          Key: { id: topicId },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionValues,
        })
      );
    } catch (updateError) {
      console.error('❌ Failed to update Topic status to FAILED:', updateError);
    }

    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
};
