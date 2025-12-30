import { defineFunction } from '@aws-amplify/backend';

export const queryTopic = defineFunction({
  name: 'query-topic',
  entry: './handler.ts',
  timeoutSeconds: 60, // Allow up to 60 seconds for retrieval + LLM synthesis
  resourceGroupName: 'data', // Assign to data stack to avoid circular dependency
});
