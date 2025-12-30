'use server';

import { redirect } from 'next/navigation';
import { Amplify } from 'aws-amplify';
import {
  signUp,
  confirmSignUp,
  signIn,
  signOut,
  resendSignUpCode,
  confirmSignIn,
  updateUserAttribute,
  type UpdateUserAttributeOutput,
  confirmUserAttribute,
  updatePassword,
  resetPassword,
  confirmResetPassword,
} from 'aws-amplify/auth';
import { getErrorMessage } from '@/lib/utils';
import config from '@/../amplify_outputs.json';

// Configure Amplify for server-side operations
Amplify.configure(config, { ssr: true });

export async function handleSignUp(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    const { isSignUpComplete, userId, nextStep } = await signUp({
      username: String(formData.get('email')),
      password: String(formData.get('password')),
      options: {
        userAttributes: {
          email: String(formData.get('email')),
          family_name: String(formData.get('familyName')),
          given_name: String(formData.get('givenName')),
        },
        // optional
        autoSignIn: true,
      },
    });
  } catch (error) {
    return getErrorMessage(error);
  }
  redirect('/confirm-signup');
}

export async function handleSendEmailVerificationCode(
  prevState: { message: string; errorMessage: string },
  formData: FormData
) {
  let currentState;
  try {
    await resendSignUpCode({
      username: String(formData.get('email')),
    });
    currentState = {
      ...prevState,
      message: 'Code sent successfully',
    };
  } catch (error) {
    currentState = {
      ...prevState,
      errorMessage: getErrorMessage(error),
    };
  }

  return currentState;
}

export async function handleConfirmSignUp(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    const { isSignUpComplete, nextStep } = await confirmSignUp({
      username: String(formData.get('email')),
      confirmationCode: String(formData.get('code')),
    });
    // Note: autoSignIn() doesn't work across page navigations
    // User will need to sign in manually after email confirmation
  } catch (error) {
    return getErrorMessage(error);
  }
  redirect('/login?verified=true');
}

export async function handleSignIn(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    const { nextStep } = await signIn({
      username: String(formData.get('email')),
      password: String(formData.get('password')),
    });

    // Debug logging to see what step Cognito returns
    console.log('Sign-in nextStep:', nextStep.signInStep);
    console.log('Full nextStep object:', JSON.stringify(nextStep, null, 2));

    // Handle sign-in steps based on simplified Option C flow
    switch (nextStep.signInStep) {
      case 'CONFIRM_SIGN_UP':
        // User hasn't confirmed their email yet
        await resendSignUpCode({
          username: String(formData.get('email')),
        });
        redirect('/confirm-signup');

      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
        // User has TOTP enrolled - needs to enter code
        // Redirect to TOTP verification page
        redirect('/mfa/verify');

      case 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP':
        // User is being prompted to set up TOTP
        // For Option C: We skip this and let them set up later in profile
        // With OPTIONAL MFA, the sign-in is complete - user just hasn't enrolled in TOTP
        // The session should be valid, redirect to dashboard
        console.log('Skipping TOTP setup - user can enable in profile later');
        redirect('/dashboard');

      case 'RESET_PASSWORD':
        // User needs to reset their password
        redirect('/reset-password');

      case 'DONE':
        // Sign-in complete - user is authenticated
        redirect('/dashboard');

      default:
        // Unexpected step - log it and show error
        console.error('Unexpected sign-in step:', nextStep.signInStep);
        return `Unexpected sign-in step: ${nextStep.signInStep}. Please contact support.`;
    }
  } catch (error) {
    return getErrorMessage(error);
  }
}

export async function handleVerifyTOTP(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    const totpCode = String(formData.get('code'));

    // Confirm sign-in with TOTP code
    const { nextStep } = await confirmSignIn({
      challengeResponse: totpCode,
    });

    // After TOTP verification, should be DONE
    if (nextStep.signInStep === 'DONE') {
      redirect('/auth/home');
    } else {
      // Unexpected step after TOTP
      console.error('Unexpected step after TOTP:', nextStep.signInStep);
      return `Unexpected authentication step. Please contact support.`;
    }
  } catch (error) {
    return getErrorMessage(error);
  }
}

export async function handleSignOut() {
  try {
    await signOut();
  } catch (error) {
    console.log(getErrorMessage(error));
  }
  redirect('/login');
}

export async function handleUpdateUserAttribute(
  prevState: string,
  formData: FormData
) {
  let attributeKey = 'name';
  let attributeValue;
  let currentAttributeValue;

  if (formData.get('email')) {
    attributeKey = 'email';
    attributeValue = formData.get('email');
    currentAttributeValue = formData.get('current_email');
  } else {
    attributeValue = formData.get('name');
    currentAttributeValue = formData.get('current_name');
  }

  if (attributeValue === currentAttributeValue) {
    return '';
  }

  try {
    const output = await updateUserAttribute({
      userAttribute: {
        attributeKey: String(attributeKey),
        value: String(attributeValue),
      },
    });
    return handleUpdateUserAttributeNextSteps(output);
  } catch (error) {
    console.log(error);
    return 'error';
  }
}

function handleUpdateUserAttributeNextSteps(output: UpdateUserAttributeOutput) {
  const { nextStep } = output;

  switch (nextStep.updateAttributeStep) {
    case 'CONFIRM_ATTRIBUTE_WITH_CODE':
      const codeDeliveryDetails = nextStep.codeDeliveryDetails;
      return `Confirmation code was sent to ${codeDeliveryDetails?.deliveryMedium}.`;
    case 'DONE':
      return 'success';
  }
}

export async function handleUpdatePassword(
  prevState: 'success' | 'error' | undefined,
  formData: FormData
) {
  const currentPassword = formData.get('current_password');
  const newPassword = formData.get('new_password');

  if (currentPassword === newPassword) {
    return;
  }

  try {
    await updatePassword({
      oldPassword: String(currentPassword),
      newPassword: String(newPassword),
    });
  } catch (error) {
    console.log(error);
    return 'error';
  }

  return 'success';
}

export async function handleConfirmUserAttribute(
  prevState: 'success' | 'error' | undefined,
  formData: FormData
) {
  const code = formData.get('code');

  if (!code) {
    return;
  }

  try {
    await confirmUserAttribute({
      userAttributeKey: 'email',
      confirmationCode: String(code),
    });
  } catch (error) {
    console.log(error);
    return 'error';
  }

  return 'success';
}

export async function handleResetPassword(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await resetPassword({ username: String(formData.get('email')) });
  } catch (error) {
    return getErrorMessage(error);
  }
  redirect('/reset-password/confirm');
}

export async function handleConfirmResetPassword(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await confirmResetPassword({
      username: String(formData.get('email')),
      confirmationCode: String(formData.get('code')),
      newPassword: String(formData.get('password')),
    });
  } catch (error) {
    return getErrorMessage(error);
  }
  redirect('/');
}
