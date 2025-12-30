import { defineBackend, secret } from '@aws-amplify/backend';
import { testQueryLlamaCloud } from './functions/test-query-llama-cloud/resource';
import { uploadToLlamaCloud } from './functions/upload-to-llama-cloud/resource';
import { queryTopic } from './functions/query-topic/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sendConnectRawDocs } from './storage/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  sendConnectRawDocs,
  testQueryLlamaCloud,
  uploadToLlamaCloud,
  queryTopic,
});

// extract L1 CfnUserPool resources
const { cfnUserPool } = backend.auth.resources.cfnResources;
// modify cfnUserPool policies directly
cfnUserPool.policies = {
  passwordPolicy: {
    minimumLength: 12,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    requireUppercase: true,
    temporaryPasswordValidityDays: 10,
  },
};

// Get S3 bucket and DynamoDB table resources
const s3RawDocsBucket = backend.sendConnectRawDocs.resources.bucket;
const topicTable = backend.data.resources.tables['Topic'];

// Configure test query Lambda
backend.testQueryLlamaCloud.addEnvironment(
  'LLAMA_CLOUD_API_KEY',
  secret('LLAMA_CLOUD_API_KEY')
);
backend.testQueryLlamaCloud.addEnvironment(
  'LLAMA_CLOUD_ORGANIZATION_ID',
  secret('LLAMA_CLOUD_ORGANIZATION_ID')
);

const testQueryFunction = backend.testQueryLlamaCloud.resources.lambda;
testQueryFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['ssm:GetParameter', 'ssm:GetParameters'],
    resources: [`arn:aws:ssm:*:*:parameter/amplify/*`],
  })
);

// Configure uploadToLlamaCloud Lambda
const uploadFunction = backend.uploadToLlamaCloud.resources.lambda;

// Add S3 read permissions for raw docs bucket
uploadFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['s3:GetObject', 's3:ListBucket'],
    resources: [
      s3RawDocsBucket.bucketArn,
      `${s3RawDocsBucket.bucketArn}/*`,
    ],
  })
);

// Add secrets
backend.uploadToLlamaCloud.addEnvironment(
  'LLAMA_CLOUD_API_KEY',
  secret('LLAMA_CLOUD_API_KEY')
);
backend.uploadToLlamaCloud.addEnvironment(
  'LLAMA_CLOUD_ORGANIZATION_ID',
  secret('LLAMA_CLOUD_ORGANIZATION_ID')
);
backend.uploadToLlamaCloud.addEnvironment(
  'LLAMA_CLOUD_PROJECT_ID',
  secret('LLAMA_CLOUD_PROJECT_ID')
);

// Add bucket name
backend.uploadToLlamaCloud.addEnvironment(
  'RAW_DOCS_BUCKET_NAME',
  s3RawDocsBucket.bucketName
);

// Add Topic table name
backend.uploadToLlamaCloud.addEnvironment(
  'TOPIC_TABLE_NAME',
  topicTable.tableName
);

// Grant SSM permissions to read secrets
uploadFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['ssm:GetParameter', 'ssm:GetParameters'],
    resources: [`arn:aws:ssm:*:*:parameter/amplify/*`],
  })
);

// Grant DynamoDB permissions to update Topics
uploadFunction.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:Query',
    ],
    resources: [topicTable.tableArn, `${topicTable.tableArn}/index/*`],
  })
);

// Configure queryTopic Lambda
const queryFunction = backend.queryTopic.resources.lambda;

// Add secrets
backend.queryTopic.addEnvironment(
  'LLAMA_CLOUD_API_KEY',
  secret('LLAMA_CLOUD_API_KEY')
);
backend.queryTopic.addEnvironment(
  'ANTHROPIC_API_KEY',
  secret('ANTHROPIC_API_KEY')
);

// Add Topic table name
backend.queryTopic.addEnvironment('TOPIC_TABLE_NAME', topicTable.tableName);

// Grant SSM permissions to read secrets
queryFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['ssm:GetParameter', 'ssm:GetParameters'],
    resources: [`arn:aws:ssm:*:*:parameter/amplify/*`],
  })
);

// Grant DynamoDB permissions to read Topics
queryFunction.addToRolePolicy(
  new PolicyStatement({
    actions: ['dynamodb:GetItem', 'dynamodb:Query'],
    resources: [topicTable.tableArn, `${topicTable.tableArn}/index/*`],
  })
);
