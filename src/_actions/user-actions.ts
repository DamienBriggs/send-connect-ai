'use server';

import { cookieBasedClient } from '@/lib/amplify-utils';
import { UserSchema, type UserFormData } from '@/lib/form-schema';
import { ConsoleLogger } from 'aws-amplify/utils';

const logger = new ConsoleLogger('UserOperations');

/**
 * Creates a User record in the database from authenticated Cognito user
 * Called on first login to sync Cognito user with database
 * Idempotent - safe to call multiple times (checks if user exists first)
 */
export async function ensureUserRecordExists() {
  try {
    const { fetchUserAttributesServer } = await import('@/lib/amplify-utils');

    // Get current authenticated user's attributes from Cognito
    const userAttributes = await fetchUserAttributesServer();

    const email = userAttributes.email;
    const givenName = userAttributes.given_name;
    const familyName = userAttributes.family_name;
    const phoneNumber = userAttributes.phone_number;

    if (!email || !givenName || !familyName) {
      logger.error('❌ Missing required user attributes from Cognito');
      return {
        success: false,
        error: 'Missing required user data',
      };
    }

    // Create user record with Cognito data
    return await createUserFromCognito({
      email,
      givenName,
      familyName,
      phoneNumber,
    });
  } catch (error: unknown) {
    logger.error('❌ Exception in ensureUserRecordExists:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to ensure user record',
    };
  }
}

/**
 * Creates a User record in the database from Cognito signup data
 * Called after email confirmation to ensure only verified users get database records
 */
export async function createUserFromCognito(userData: UserFormData) {
  try {
    // Validate data from Cognito (should already be valid, but double-check)
    const validationResult = UserSchema.safeParse(userData);

    if (!validationResult.success) {
      logger.error(
        '❌ User data validation failed:',
        validationResult.error.issues
      );
      return {
        success: false,
        error: 'Invalid user data from Cognito',
      };
    }

    const { email, givenName, familyName, phoneNumber } = validationResult.data;

    // Check if user already exists in database
    const { data: existingUsers } =
      await cookieBasedClient.models.User.listByEmail({
        email,
      });

    if (existingUsers && existingUsers.length > 0) {
      logger.info('ℹ️ User record already exists for:', email);
      return {
        success: true,
        error: null,
        message: 'User record already exists',
      };
    }

    // Create new user record
    const { data, errors } = await cookieBasedClient.models.User.create({
      givenName,
      familyName,
      email,
      phoneNumber: phoneNumber || null,
    });

    if (!data || errors?.length) {
      logger.error('❌ Error creating user record:', errors);
      return {
        success: false,
        error: errors?.map((e) => e.message).join('; ') || 'Unknown error',
      };
    }

    logger.info('✅ User record created successfully:', email);
    return {
      success: true,
      error: null,
      data,
    };
  } catch (error: unknown) {
    logger.error('❌ Exception in createUserFromCognito:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create user record',
    };
  }
}
