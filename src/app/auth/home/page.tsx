import { ensureUserRecordExists } from '@/_actions/user-actions';

export default async function Home() {
  // Create user record in database if it doesn't exist
  // This happens on first login after signup
  const result = await ensureUserRecordExists();

  if (!result.success) {
    console.error('Failed to create user record:', result.error);
    // Don't block user access, just log the error
  }

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-3xl font-bold mb-4'>Welcome!</h1>
        <p className='text-muted-foreground'>
          You are successfully logged in.
        </p>
      </div>
    </div>
  );
}
