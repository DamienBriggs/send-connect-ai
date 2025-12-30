'use client';

import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
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
import {
  handleConfirmSignUp,
  handleSendEmailVerificationCode,
} from '@/lib/cognitoActions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type='submit' disabled={pending}>
      {pending ? 'Verifying...' : 'Verify Email'}
    </Button>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type='submit' variant='outline' disabled={pending}>
      {pending ? 'Sending...' : 'Resend Code'}
    </Button>
  );
}

export function ConfirmSignupForm({
  ...props
}: React.ComponentProps<typeof Card>) {
  const [errorMessage, confirmAction] = useActionState(
    handleConfirmSignUp,
    undefined
  );
  const [resendState, resendAction] = useActionState(
    handleSendEmailVerificationCode,
    { message: '', errorMessage: '' }
  );

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <CardDescription>
          Enter the verification code sent to your email address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={confirmAction}>
          <FieldGroup className='gap-4'>
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
              />
              <FieldDescription>
                Enter the email address you used to sign up
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor='code'>Verification Code</FieldLabel>
              <Input
                id='code'
                name='code'
                type='text'
                placeholder='123456'
                required
                maxLength={6}
              />
              <FieldDescription>
                Enter the 6-digit code from your email
              </FieldDescription>
            </Field>

            <FieldGroup>
              <Field>
                <SubmitButton />
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>

        <div className='mt-4 border-t pt-4'>
          <form action={resendAction}>
            <FieldGroup className='gap-4'>
              {resendState.message && (
                <div className='rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300'>
                  {resendState.message}
                </div>
              )}
              {resendState.errorMessage && (
                <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                  {resendState.errorMessage}
                </div>
              )}

              <Field>
                <FieldLabel htmlFor='resend-email'>Email</FieldLabel>
                <Input
                  id='resend-email'
                  name='email'
                  type='email'
                  placeholder='m@example.com'
                  required
                />
              </Field>

              <FieldGroup>
                <Field>
                  <ResendButton />
                </Field>
              </FieldGroup>
            </FieldGroup>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
