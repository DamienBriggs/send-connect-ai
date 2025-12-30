import { defineAuth } from '@aws-amplify/backend';

// import { addUserToGroup } from '../data/add-user-to-group/resource';
/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */

type MfaMode = 'REQUIRED' | 'OPTIONAL';
const mfaMode = 'OPTIONAL' as MfaMode;

export const auth = defineAuth({
  loginWith: {
    email: true,
  },

  multifactor: {
    mode: mfaMode, // Options: 'REQUIRED', 'OPTIONAL'
    totp: true, // Enable TOTP (Time-based One-Time Password) apps like Google Authenticator
  },

  userAttributes: {
    familyName: {
      mutable: true,
      required: true,
    },
    givenName: {
      mutable: true,
      required: true,
    },
    phoneNumber: {
      mutable: true,
      required: false,
    },
  },
  accountRecovery: 'EMAIL_ONLY', // Use email for account recovery
  groups: ['ADMIN'],
});
