import { defineFunction, secret } from '@aws-amplify/backend';

export const testQueryLlamaCloud = defineFunction({
  name: 'test-query-llama-cloud',
  runtime: 20,
  entry: './handler.ts',
  environment: {
    LLAMA_CLOUD_API_KEY: secret('LLAMA_CLOUD_API_KEY'),
    LLAMA_CLOUD_ORGANIZATION_ID: secret('LLAMA_CLOUD_ORGANIZATION_ID'),
  },
  timeoutSeconds: 60,
  resourceGroupName: 'data',
});
