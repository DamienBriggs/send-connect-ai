import { createServerRunner } from '@aws-amplify/adapter-nextjs';
import outputs from '@/../amplify_outputs.json';
import { cookies } from 'next/headers';
import {
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
} from 'aws-amplify/auth/server';
import { FetchUserAttributesOutput } from 'aws-amplify/auth';
import { type Schema } from '@/../amplify/data/resource';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';

export const { runWithAmplifyServerContext } = createServerRunner({
  config: outputs,
});

export const cookieBasedClient = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies,
  authMode: 'userPool',
});

export const iamBasedClient = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies,
  authMode: 'iam',
});

export const getCurrentUserServer = async () => {
  return await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    async operation(contextSpec) {
      return await getCurrentUser(contextSpec);
    },
  });
};

export const checkIsAuthenticated = async (): Promise<boolean> => {
  return await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    async operation(contextSpec) {
      try {
        const user = await getCurrentUser(contextSpec);
        return !!user;
      } catch {
        return false;
      }
    },
  });
};

export const getUserGroups = async (): Promise<string[]> => {
  return await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    async operation(contextSpec) {
      try {
        const session = await fetchAuthSession(contextSpec);
        const tokens = session.tokens;
        if (tokens && Object.keys(tokens).length > 0) {
          const groups = tokens.accessToken.payload['cognito:groups'];
          return Array.isArray(groups)
            ? groups.filter(
                (group): group is string => typeof group === 'string'
              )
            : [];
        }
        return [];
      } catch {
        return [];
      }
    },
  });
};

export const checkIsAdmin = async (): Promise<boolean> => {
  const groups = await getUserGroups();
  return groups.includes('ADMIN');
};

export const checkCanAccessAuthRoutes = async (): Promise<boolean> => {
  const groups = await getUserGroups();
  return groups.some((group) => ['ADMIN'].includes(group));
};

export const checkCanAccessAdminRoutes = async (): Promise<boolean> => {
  const groups = await getUserGroups();
  return groups.includes('ADMIN');
};

export const fetchUserAttributesServer =
  async (): Promise<FetchUserAttributesOutput> => {
    return await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      async operation(contextSpec) {
        return await fetchUserAttributes(contextSpec);
      },
    });
  };

export const getCurrentUserEmailServer = async (): Promise<string | null> => {
  try {
    const userAttributes = await fetchUserAttributesServer();
    return userAttributes['email'] || null;
  } catch (error) {
    console.error('Error fetching user email:', error);
    return null;
  }
};

export const getCurrentUserByEmail = async () => {
  try {
    const userAttributes = await fetchUserAttributesServer();
    const email = userAttributes.email;

    if (!email) {
      return null;
    }

    // Use the secondary index to find the User record by email
    const { data: users } = await cookieBasedClient.models.User.list({
      filter: {
        email: { eq: email },
      },
    });

    if (users && users.length > 0) {
      return users[0];
    }

    return null;
  } catch (error) {
    console.error('Error fetching user record:', error);
    return null;
  }
};

export const isUserInGroup = async (groupName: string) => {
  return runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec);
        const groups =
          session.tokens?.accessToken?.payload['cognito:groups'] || [];
        return Array.isArray(groups) && groups.includes(groupName);
      } catch (error) {
        console.error(error);
        return false;
      }
    },
  });
};
