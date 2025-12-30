import { defineStorage } from '@aws-amplify/backend';

// This is the bucket used to store the raw documents
export const sendConnectRawDocs = defineStorage({
  name: 'SENDConnect-raw-docs',

  isDefault: true,
  access: (allow) => ({
    'send-connect-raw-docs/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read', 'write']),
      allow.groups(['ADMIN']).to(['read', 'write', 'delete']),
    ],
  }),
});

// This is the bucket used to store the raw documents
export const sendConnectParsedDocs = defineStorage({
  name: 'SENDConnect-parsed-docs',
  isDefault: false,
  access: (allow) => ({
    'send-connect-parsed-docs/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read', 'write']),
      allow.groups(['ADMIN']).to(['read', 'write', 'delete']),
    ],
  }),
});
