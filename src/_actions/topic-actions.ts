'use server';

import { TopicUploadSchema } from '@/lib/form-schema';
import { ConsoleLogger } from 'aws-amplify/utils';
import { runWithAmplifyServerContext } from '@/lib/amplify-utils';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { cookies } from 'next/headers';
import amplifyOutputs from '../../amplify_outputs.json';

const logger = new ConsoleLogger('TopicOperations');

/**
 * Server action to upload a topic document to S3
 * This only handles the file upload - the Lambda will create the Topic database record
 *
 * NOTE: When implementing server actions that require Amplify operations,
 * always use the utilities from @/lib/amplify-utils (like runWithAmplifyServerContext,
 * cookieBasedClient) to ensure proper authentication context is maintained.
 */
export async function saveTopicDocument(formData: FormData) {
  try {
    // Extract form data
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const file = formData.get('file') as File;

    if (!file) {
      logger.error('❌ No file provided');
      return {
        success: false,
        error: 'No file provided',
      };
    }

    // Validate form data
    const validationResult = TopicUploadSchema.safeParse({
      title,
      description,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    if (!validationResult.success) {
      logger.error(
        '❌ Validation failed:',
        validationResult.error.issues
      );
      return {
        success: false,
        error: validationResult.error.issues.map((i) => i.message).join(', '),
      };
    }

    // Get bucket configuration
    const rawDocsBucket = amplifyOutputs.storage.buckets.find(
      (bucket) => bucket.name === 'SENDConnect-raw-docs'
    );

    if (!rawDocsBucket) {
      logger.error('❌ Raw docs bucket not found in amplify_outputs.json');
      return {
        success: false,
        error: 'Storage configuration error',
      };
    }

    // Generate S3 key with timestamp to ensure uniqueness
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Convert File to Buffer for upload
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileArrayBuffer);

    // Upload to S3 using S3Client with session credentials
    const fileKey = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        const session = await fetchAuthSession(contextSpec);

        if (!session.credentials) {
          throw new Error('Error fetching authentication session from cookies');
        }

        // Get the user ID (sub) from the session
        const userId = session.identityId || session.tokens?.accessToken.payload.sub;

        if (!userId) {
          throw new Error('Unable to determine user ID from session');
        }

        // Create file key with user ID subdirectory
        const fileKey = `send-connect-raw-docs/${userId}/${timestamp}-${sanitizedFileName}`;

        logger.info('📤 Uploading file to S3:', fileKey);

        const s3Client = new S3Client({
          region: amplifyOutputs.storage.aws_region,
          credentials: {
            accessKeyId: session.credentials.accessKeyId,
            secretAccessKey: session.credentials.secretAccessKey,
            sessionToken: session.credentials.sessionToken,
          },
        });

        const command = new PutObjectCommand({
          Bucket: amplifyOutputs.storage.bucket_name,
          Key: fileKey,
          Body: fileBuffer,
          ContentType: file.type,
          Metadata: {
            title: validationResult.data.title,
            description: validationResult.data.description,
            originalFileName: file.name,
          },
        });

        await s3Client.send(command);

        return fileKey;
      },
    });

    logger.info('✅ File uploaded successfully:', fileKey);

    // Step 2: Create Topic record with PENDING status
    logger.info('📝 Creating Topic record in database');
    const { cookieBasedClient } = await import('@/lib/amplify-utils');

    const { data: topic, errors: createErrors } =
      await cookieBasedClient.models.Topic.create({
        title: validationResult.data.title,
        description: validationResult.data.description,
        s3Key: fileKey,
        topicStatus: 'PENDING',
      });

    if (!topic || createErrors) {
      logger.error('❌ Failed to create Topic:', createErrors);
      return {
        success: false,
        error: createErrors?.map((e) => e.message).join(', ') || 'Failed to create Topic',
      };
    }

    logger.info('✅ Topic created with ID:', topic.id);

    // Step 3: Invoke uploadToLlamaCloud mutation to start indexing
    logger.info('🚀 Invoking uploadToLlamaCloud Lambda');

    const { data: uploadResult, errors: uploadErrors } =
      await cookieBasedClient.mutations.uploadToLlamaCloud({
        topicId: topic.id,
        s3Key: fileKey,
        rawBucketName: amplifyOutputs.storage.bucket_name,
        topicTitle: validationResult.data.title,
      });

    if (uploadErrors) {
      logger.error('❌ Failed to invoke uploadToLlamaCloud:', uploadErrors);
      // Topic is created but upload/indexing failed to start
      // User will see status as PENDING
    } else {
      logger.info('✅ Upload to Llama Cloud Lambda invoked successfully');
      logger.info('Upload result:', uploadResult);
    }

    return {
      success: true,
      data: {
        topicId: topic.id,
        s3Key: fileKey,
        title: validationResult.data.title,
        description: validationResult.data.description,
        status: 'PENDING',
        message: 'Topic created successfully. Processing will begin shortly.',
      },
    };
  } catch (error: unknown) {
    logger.error('❌ Exception in saveTopicDocument:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to upload document',
    };
  }
}
