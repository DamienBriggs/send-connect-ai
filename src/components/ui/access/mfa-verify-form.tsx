'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { confirmSignIn } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function MfaVerifyForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/auth/home';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(undefined);

    const formData = new FormData(e.currentTarget);
    const totpCode = String(formData.get('code'));

    try {
      const { nextStep } = await confirmSignIn({
        challengeResponse: totpCode,
      });

      if (nextStep.signInStep === 'DONE') {
        // Force full page reload to ensure server components re-render with updated auth state
        window.location.href = redirectTo;
      } else {
        console.error('Unexpected step after TOTP:', nextStep.signInStep);
        setErrorMessage('Unexpected authentication step. Please contact support.');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('TOTP verification error:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Invalid verification code'
      );
      setIsLoading(false);
    }
  };

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup className='gap-4'>
            {errorMessage && (
              <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                {errorMessage}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor='code'>Authentication Code</FieldLabel>
              <Input
                id='code'
                name='code'
                type='text'
                placeholder='000000'
                required
                maxLength={6}
                pattern='[0-9]{6}'
                autoComplete='one-time-code'
                className='text-center text-2xl tracking-widest'
                disabled={isLoading}
              />
              <FieldDescription>
                Open your authenticator app (Google Authenticator, Authy, etc.)
                and enter the 6-digit code
              </FieldDescription>
            </Field>

            <FieldGroup>
              <Field>
                <Button type='submit' disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
