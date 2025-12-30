# Profile MFA Setup - Future Implementation

## Overview

This document outlines how to implement TOTP (Time-based One-Time Password) setup in the user profile page, as part of **Option C** implementation strategy.

## Current State

✅ **Implemented:**
- Sign-up flow (email + password)
- Email verification flow
- Sign-in flow with MFA skip
- TOTP verification for enrolled users (`/mfa/verify`)

📋 **Not Yet Implemented:**
- User profile page
- MFA enrollment in profile
- MFA disable in profile

## Implementation Plan

### 1. User Profile Page

**Location:** `/src/app/profile/security/page.tsx`

**Features:**
- Show current MFA status (enabled/disabled)
- Button to "Enable Two-Factor Authentication"
- Button to "Disable Two-Factor Authentication" (if enrolled)

### 2. Required Server Actions

Add to `/src/lib/cognitoActions.ts`:

```typescript
import { setupTOTP, verifyTOTPSetup, updateMFAPreference } from 'aws-amplify/auth';

/**
 * Initiates TOTP setup for the authenticated user
 * Returns QR code URL and secret for manual entry
 */
export async function handleSetupTOTP(
  prevState: { qrCode?: string; secret?: string; error?: string } | undefined,
  formData: FormData
) {
  try {
    const totpSetupDetails = await setupTOTP();

    return {
      qrCode: totpSetupDetails.getSetupUri('YourAppName').toString(),
      secret: totpSetupDetails.sharedSecret,
    };
  } catch (error) {
    return {
      error: getErrorMessage(error),
    };
  }
}

/**
 * Verifies TOTP setup with a test code from the user's authenticator app
 */
export async function handleVerifyTOTPSetup(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    const totpCode = String(formData.get('code'));

    await verifyTOTPSetup({ code: totpCode });

    // Set TOTP as preferred MFA method
    await updateMFAPreference({ totp: 'PREFERRED' });

  } catch (error) {
    return getErrorMessage(error);
  }

  redirect('/profile/security?mfa-enabled=true');
}

/**
 * Disables TOTP for the authenticated user
 */
export async function handleDisableTOTP(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    // Disable TOTP by setting preference to DISABLED
    await updateMFAPreference({ totp: 'DISABLED' });
  } catch (error) {
    return getErrorMessage(error);
  }

  redirect('/profile/security?mfa-disabled=true');
}
```

### 3. MFA Setup Form Component

**Location:** `/src/components/ui/access/mfa-setup-form.tsx`

**Features:**
- Step 1: Display QR code for scanning
- Step 2: Show secret key for manual entry
- Step 3: Input field for test code verification
- Success/error states

**Flow:**
```
User clicks "Enable MFA"
  ↓
handleSetupTOTP() → Returns QR code + secret
  ↓
Display QR code (user scans with authenticator app)
  ↓
User enters test code from app
  ↓
handleVerifyTOTPSetup(code) → Enables MFA
  ↓
Redirect to profile with success message
```

### 4. Profile Security Page

**Location:** `/src/app/profile/security/page.tsx`

**Example Structure:**
```tsx
export default function ProfileSecurityPage() {
  // Check if user has MFA enabled
  // This can be done by trying to get user's MFA preference

  return (
    <div>
      <h1>Security Settings</h1>

      {mfaEnabled ? (
        <>
          <div>✅ Two-factor authentication is enabled</div>
          <Button onClick={() => handleDisableTOTP()}>
            Disable MFA
          </Button>
        </>
      ) : (
        <>
          <div>⚠️ Two-factor authentication is not enabled</div>
          <Button onClick={() => router.push('/profile/mfa-setup')}>
            Enable MFA
          </Button>
        </>
      )}
    </div>
  );
}
```

### 5. Testing the Flow

1. **Enroll in MFA:**
   - Go to profile → security
   - Click "Enable MFA"
   - Scan QR code with Google Authenticator / Authy
   - Enter test code
   - Verify success message

2. **Test MFA at Login:**
   - Sign out
   - Sign in with email + password
   - Should be redirected to `/mfa/verify`
   - Enter 6-digit code from authenticator app
   - Should redirect to dashboard

3. **Disable MFA:**
   - Go to profile → security
   - Click "Disable MFA"
   - Confirm
   - Test login (should NOT ask for TOTP code)

## Key Cognito Concepts

### MFA Preference vs MFA Configuration

- **MFA Configuration (Amplify)**: `mode: 'OPTIONAL'` - Set at the user pool level
- **MFA Preference (Per User)**:
  - `PREFERRED` - MFA is enabled for this user
  - `DISABLED` - MFA is disabled for this user
  - `NOT_PREFERRED` - MFA is available but not preferred

### User Pool vs User Preference

```
User Pool Config (Amplify)     User Preference (Runtime)
┌─────────────────────┐       ┌────────────────────────┐
│ mode: 'OPTIONAL'    │       │ User A: PREFERRED      │
│ totp: true          │  ───▶ │ User B: DISABLED       │
│                     │       │ User C: NOT_PREFERRED  │
└─────────────────────┘       └────────────────────────┘
```

## References

- [Amplify Auth - Setup TOTP](https://docs.amplify.aws/javascript/build-a-backend/auth/manage-mfa/#totp-setup)
- [Amplify Auth - Verify TOTP Setup](https://docs.amplify.aws/javascript/build-a-backend/auth/manage-mfa/#verify-totp-setup)
- [Amplify Auth - Update MFA Preference](https://docs.amplify.aws/javascript/build-a-backend/auth/manage-mfa/#update-mfa-preference)

## Timeline

Implement when:
- User profile page structure is ready
- User can access their security settings
- Priority: Medium (security feature, not blocking core functionality)

## Related Files

**Current Implementation:**
- `/src/lib/cognitoActions.ts` - Server actions
- `/src/components/ui/access/mfa-verify-form.tsx` - TOTP verification at login
- `/src/app/mfa/verify/page.tsx` - TOTP verification page

**Future Implementation:**
- `/src/app/profile/security/page.tsx` - Security settings
- `/src/components/ui/access/mfa-setup-form.tsx` - MFA enrollment form
- `/src/app/profile/mfa-setup/page.tsx` - MFA setup page
