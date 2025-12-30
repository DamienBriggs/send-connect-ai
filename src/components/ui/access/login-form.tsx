'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, resendSignUpCode } from 'aws-amplify/auth';
import { cn } from '@/lib/utils';
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
import Link from 'next/link';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const verified = searchParams.get('verified') === 'true';
  const redirectTo = searchParams.get('redirect') || '/auth/home';
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(undefined);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));

    try {
      const { nextStep } = await signIn({
        username: email,
        password: password,
      });

      console.log('Sign-in nextStep:', nextStep.signInStep);

      switch (nextStep.signInStep) {
        case 'CONFIRM_SIGN_UP':
          await resendSignUpCode({ username: email });
          router.push('/confirm-signup');
          break;

        case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
          router.push(`/mfa/verify?redirect=${encodeURIComponent(redirectTo)}`);
          break;

        case 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP':
          console.log('Skipping TOTP setup - user can enable in profile later');
          // Force full page reload to ensure server components re-render with updated auth state
          window.location.href = redirectTo;
          break;

        case 'RESET_PASSWORD':
          router.push('/reset-password');
          break;

        case 'DONE':
          // Force full page reload to ensure server components re-render with updated auth state
          window.location.href = redirectTo;
          break;

        default:
          console.error('Unexpected sign-in step:', nextStep.signInStep);
          setErrorMessage(
            `Unexpected sign-in step: ${nextStep.signInStep}. Please contact support.`
          );
          setIsLoading(false);
      }
    } catch (error) {
      console.error('Sign-in error:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'An error occurred during sign-in'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {verified && (
                <div className='rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300'>
                  Email verified successfully! You can now log in.
                </div>
              )}
              {errorMessage && (
                <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                  {errorMessage}
                </div>
              )}
              <Field>
                <FieldLabel htmlFor='email'>Email</FieldLabel>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  placeholder='m@example.com'
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <div className='flex items-center'>
                  <FieldLabel htmlFor='password'>Password</FieldLabel>
                  <Link
                    href='/reset-password'
                    className='ml-auto inline-block text-sm underline-offset-4 hover:underline'
                  >
                    Forgot your password?
                  </Link>
                </div>
                <Input
                  id='password'
                  name='password'
                  type='password'
                  required
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <Button type='submit' disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Login'}
                </Button>
                <FieldDescription className='text-center'>
                  Don&apos;t have an account?{' '}
                  <Link href='/signup' className='underline'>
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
