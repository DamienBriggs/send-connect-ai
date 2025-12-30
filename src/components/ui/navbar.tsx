import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/ui/user-nav';
import { AdminNavLink } from '@/components/ui/admin-nav-link';
import {
  checkIsAuthenticated,
  fetchUserAttributesServer,
} from '@/lib/amplify-utils';
import {
  Github,
  MessageSquare,
  Twitter,
  Linkedin,
  Youtube,
} from 'lucide-react';

export interface NavbarProps {
  logoText?: string;
  logoHref?: string;
  className?: string;
}

export async function Navbar({
  className,
  logoText = 'SEND Connect',
  logoHref = '/',
}: NavbarProps) {
  // Check if user is authenticated
  let isAuthenticated = false;
  let userName = '';
  let userEmail = '';

  try {
    isAuthenticated = await checkIsAuthenticated();

    if (isAuthenticated) {
      try {
        const userAttributes = await fetchUserAttributesServer();
        const givenName = userAttributes.given_name || '';
        const familyName = userAttributes.family_name || '';
        userName = `${givenName} ${familyName}`.trim();
        userEmail = userAttributes.email || '';
      } catch (attrError) {
        // If we can't fetch attributes, treat as not authenticated
        console.error('Error fetching user attributes:', attrError);
        isAuthenticated = false;
      }
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    isAuthenticated = false;
  }

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-background border-b border-border',
        className
      )}
    >
      <div className='flex items-center justify-between h-16 px-6 mx-auto max-w-[1400px]'>
        {/* Logo */}
        <div className='flex items-center gap-2'>
          <Link
            href={logoHref}
            className='flex items-center gap-2 hover:opacity-80 transition-opacity'
          >
            <div className='w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-500 rounded-md flex items-center justify-center'>
              <span className='text-white font-bold text-sm'>SC</span>
            </div>
            <span className='font-semibold text-lg'>{logoText}</span>
          </Link>
        </div>

        {/* Center Navigation */}
        <div className='hidden lg:flex items-center gap-8'>
          <NavLink href='#'>Product</NavLink>
          <NavLink href='#'>Solutions</NavLink>
          <NavLink href='#'>Developers</NavLink>
          <NavLink href='#'>Resources</NavLink>
          <NavLink href='#'>Company</NavLink>
          <NavLink href='#'>Blog</NavLink>
          <NavLink href='#'>Pricing</NavLink>
          {/* Query Topics - available to all authenticated users */}
          {isAuthenticated && <NavLink href='/query'>Query Topics</NavLink>}
          {/* Admin-only link - client component with real-time updates */}
          <AdminNavLink />
        </div>

        {/* Right Side - Social Icons and User Actions */}
        <div className='flex items-center gap-4'>
          {/* Social Icons */}
          <div className='hidden md:flex items-center gap-3'>
            <SocialIcon
              href='https://github.com'
              icon={Github}
              label='GitHub'
            />
            <SocialIcon
              href='https://discord.com'
              icon={MessageSquare}
              label='Discord'
            />
            <SocialIcon
              href='https://twitter.com'
              icon={Twitter}
              label='Twitter'
            />
            <SocialIcon
              href='https://linkedin.com'
              icon={Linkedin}
              label='LinkedIn'
            />
            <SocialIcon
              href='https://youtube.com'
              icon={Youtube}
              label='YouTube'
            />
          </div>

          {/* User Actions - Show profile dropdown if authenticated, otherwise show login/register */}
          {isAuthenticated ? (
            <UserNav user={{ name: userName, email: userEmail }} />
          ) : (
            <div className='flex items-center gap-3'>
              <Button variant='outline' asChild>
                <Link href='/login'>LOGIN</Link>
              </Button>
              <Button variant='default' asChild>
                <Link href='/signup'>REGISTER</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

const NavLink = ({ href, children }: NavLinkProps) => {
  return (
    <Link
      href={href}
      className='text-sm font-medium text-foreground/80 hover:text-foreground transition-colors'
    >
      {children}
    </Link>
  );
};

interface SocialIconProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const SocialIcon = ({ href, icon: Icon, label }: SocialIconProps) => {
  return (
    <Link
      href={href}
      className='text-foreground/60 hover:text-foreground transition-colors'
      aria-label={label}
      target='_blank'
      rel='noopener noreferrer'
    >
      <Icon className='w-5 h-5' />
    </Link>
  );
};
