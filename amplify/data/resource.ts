import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { testQueryLlamaCloud } from '../functions/test-query-llama-cloud/resource';
import { uploadToLlamaCloud } from '../functions/upload-to-llama-cloud/resource';
import { queryTopic } from '../functions/query-topic/resource';
/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update",
and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  testQueryLlamaCloud: a
    .mutation()
    .arguments({
      query: a.string().required(),
      pipelineId: a.string().required(),
    })
    .returns(a.string())
    .authorization((allow) => [allow.group('ADMIN')])
    .handler(a.handler.function(testQueryLlamaCloud)),
  uploadToLlamaCloud: a
    .mutation()
    .arguments({
      topicId: a.string().required(),
      s3Key: a.string().required(),
      rawBucketName: a.string().required(),
      topicTitle: a.string().required(),
    })
    .returns(a.string())
    .authorization((allow) => [allow.group('ADMIN')])
    .handler(a.handler.function(uploadToLlamaCloud)),
  queryTopic: a
    .mutation()
    .arguments({
      topicId: a.string().required(),
      query: a.string().required(),
    })
    .returns(a.string())
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(queryTopic)),
  User: a
    .model({
      givenName: a.string().required(),
      familyName: a.string().required(),
      email: a.string().required(),
      phoneNumber: a.string(),
    })

    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create']),
    ])
    .secondaryIndexes((index) => [
      index('email').sortKeys(['familyName']).queryField('listByEmail'),
    ]),
  TopicStatus: a.enum([
    'PENDING',        // Initial state after PDF upload
    'INDEXING',       // Uploading to Llama Cloud
    'READY',          // Indexed and ready to query
    'FAILED',         // Upload or indexing failed
  ]),
  Topic: a
    .model({
      title: a.string().required(),
      description: a.string().required(),
      s3Key: a.string().required(),                // Raw PDF location in S3
      topicStatus: a.ref('TopicStatus'),           // Current processing status
      llamaCloudPipelineId: a.string(),            // Llama Cloud pipeline ID for querying
      llamaCloudFileId: a.string(),                // Llama Cloud file ID (optional, for tracking)
      indexedAt: a.datetime(),                     // When indexing completed
    })
    .authorization((allow) => [
      allow.groups(['ADMIN']).to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 365, // Maximum allowed duration
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
