import { defineFunction, secret } from '@aws-amplify/backend';

export const uploadToLlamaCloud = defineFunction({
  name: 'upload-to-llama-cloud',
  runtime: 20,
  entry: './handler.ts',
  environment: {
    LLAMA_CLOUD_API_KEY: secret('LLAMA_CLOUD_API_KEY'),
    LLAMA_CLOUD_ORGANIZATION_ID: secret('LLAMA_CLOUD_ORGANIZATION_ID'),
  },
  timeoutSeconds: 300, // 5 minutes for upload + indexing
  resourceGroupName: 'data',
});
