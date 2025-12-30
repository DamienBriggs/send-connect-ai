'use client';

import { useFormStatus } from 'react-dom';
import { useState, useMemo, useActionState } from 'react';
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
import { handleSignUp } from '@/lib/cognitoActions';
import {
  validatePassword,
  validatePasswordMatch,
  PASSWORD_REQUIREMENTS,
} from '@/lib/passwordValidation';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type='submit' disabled={pending}>
      {pending ? 'Creating Account...' : 'Create Account'}
    </Button>
  );
}

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [errorMessage, formAction] = useActionState(handleSignUp, undefined);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordError = useMemo(() => {
    if (!password) return '';

    const validationResult = validatePassword(password);
    if (!validationResult.isValid) {
      return validationResult.error || '';
    }

    if (confirmPassword) {
      const matchResult = validatePasswordMatch(password, confirmPassword);
      return matchResult.error || '';
    }

    return '';
  }, [password, confirmPassword]);

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <FieldGroup className='gap-4'>
            {errorMessage && (
              <div className='rounded-md bg-destructive/10 p-3 text-sm text-destructive'>
                {errorMessage}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor='givenName'>Given Name</FieldLabel>
              <Input
                id='givenName'
                name='givenName'
                type='text'
                placeholder='John'
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor='familyName'>Family Name</FieldLabel>
              <Input
                id='familyName'
                name='familyName'
                type='text'
                placeholder='Doe'
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor='email'>Email</FieldLabel>
              <Input
                id='email'
                name='email'
                type='email'
                placeholder='m@example.com'
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor='password'>Password</FieldLabel>
              <Input
                id='password'
                name='password'
                type='password'
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldDescription>{PASSWORD_REQUIREMENTS}</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor='confirm-password'>
                Confirm Password
              </FieldLabel>
              <Input
                id='confirm-password'
                name='confirm-password'
                type='password'
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {passwordError && (
                <FieldDescription className='text-destructive'>
                  {passwordError}
                </FieldDescription>
              )}
            </Field>

            <FieldGroup>
              <Field>
                <SubmitButton />
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
