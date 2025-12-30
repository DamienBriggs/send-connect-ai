# Authorization Patterns: Context vs Targeted Approach

## Overview

This document explains the two approaches for managing authorization in the application and when to use each pattern.

## Pattern 1: Authorization Context (Full App-Wide State)

### Description
A React Context Provider that manages auth state globally, making user roles and permissions available throughout the entire component tree via a hook.

### Example Implementation
```typescript
// Context Provider
export const AuthorisationContextProvider: React.FC = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCentreAdmin, setIsCentreAdmin] = useState(false);

  useEffect(() => {
    // Listen to auth events
    Hub.listen('auth', ({ payload }) => {
      // Update state on auth changes
    });
  }, []);

  return (
    <AuthorisationContext.Provider value={{ isAdmin, isCentreAdmin }}>
      {children}
    </AuthorisationContext.Provider>
  );
};

// Usage in components
const { isAdmin } = useAuthorisationContext();
```

### When to Use This Pattern

✅ **Use when you have:**
- Multiple user roles/groups (ADMIN, MODERATOR, EDITOR, VIEWER, etc.)
- Many components that need role information
- Complex conditional UI across the entire app
- Need for real-time role updates in many places
- User-specific data fetched from database (centre name, profile data, etc.)
- App built primarily with client components

### Pros
- ✅ Single source of truth for authorization state
- ✅ Easy access via hook: `useAuthorisationContext()`
- ✅ Automatic updates via Hub listener
- ✅ No prop drilling
- ✅ Can combine auth state with user data
- ✅ Loading states handled centrally

### Cons
- ❌ Cannot use in Server Components
- ❌ Larger client-side bundle
- ❌ Hydration complexity
- ❌ Potential flash of wrong content during initial load
- ❌ Still need server-side checks for security
- ❌ More complex state management

## Pattern 2: Targeted Client Components (Current Implementation)

### Description
Keep most components as Server Components, use targeted client components only where role-based UI is needed. Each client component independently checks authorization.

### Example Implementation
```typescript
// Targeted client component
'use client';

export function AdminNavLink() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();

    const listener = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || 'signedOut') {
        checkAdminStatus();
      }
    });

    return () => listener();
  }, []);

  const checkAdminStatus = async () => {
    const session = await fetchAuthSession();
    const groups = session.tokens?.accessToken?.payload['cognito:groups'];
    setIsAdmin(Array.isArray(groups) && groups.includes('ADMIN'));
  };

  if (!isAdmin) return null;
  return <Link href="/admin">Admin Panel</Link>;
}

// Usage in Server Component
export async function Navbar() {
  // Server-side checks for initial render
  const isAdmin = await checkIsAdmin();

  return (
    <nav>
      {/* Server-rendered content */}
      <AdminNavLink /> {/* Client component island */}
    </nav>
  );
}
```

### When to Use This Pattern

✅ **Use when you have:**
- Simple role requirements (one or two roles)
- Primarily Server Component architecture
- Few places needing conditional role-based UI
- Performance-critical initial page loads
- Strong preference for server-side rendering

### Pros
- ✅ Smaller client-side bundle
- ✅ Works with Server Components
- ✅ Better initial page load performance
- ✅ No hydration complexity
- ✅ Server-side checks provide security
- ✅ Simple, minimal code

### Cons
- ❌ Duplicated auth checking code
- ❌ Each component manages its own state
- ❌ More boilerplate for multiple role checks
- ❌ No centralized loading states

## Current App Implementation

### Architecture Chosen: **Targeted Client Components**

### Why This Was Chosen:
1. Simple requirements - only ADMIN role needed currently
2. Navbar is a Server Component (better performance)
3. Only one admin-only feature (Maintain Topic link)
4. Preference for server-side rendering

### Files Implementing This Pattern:

**Client Component (Admin-only UI):**
- `src/components/ui/admin-nav-link.tsx` - Shows "Maintain Topic" link only to ADMIN users

**Server Component (Main Navbar):**
- `src/components/ui/navbar.tsx` - Server component with embedded `<AdminNavLink />`

**Protected Route:**
- `src/app/admin/maintain-topic/page.tsx` - Server-side admin check with `checkIsAdmin()`

**Middleware Protection:**
- `src/middleware.ts` - Protects `/admin/*` routes, requires ADMIN group membership

### Security Layers:
1. **Middleware** - Blocks unauthorized access at route level
2. **Server Component** - Page-level `checkIsAdmin()` check
3. **Client Component** - UI-level visibility control

## When to Migrate to Context Pattern

Consider migrating to full Authorization Context if:

1. **Multiple roles added** - MODERATOR, EDITOR, VIEWER, etc.
2. **Widespread role checks** - Many components need role information
3. **User data needed** - Centre name, profile data, preferences throughout app
4. **Complex permissions** - Role + custom permissions matrix
5. **Real-time updates critical** - Must update many components on auth changes

## Migration Path

If you decide to adopt Authorization Context later:

### Step 1: Create Context Provider
```typescript
// src/context/AuthorisationContext.tsx
export const AuthorisationContextProvider = ({ children }) => {
  // Implement pattern from other app
};
```

### Step 2: Wrap App
```typescript
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Authenticator.Provider>
          <AuthorisationContextProvider>
            {children}
          </AuthorisationContextProvider>
        </Authenticator.Provider>
      </body>
    </html>
  );
}
```

### Step 3: Convert Components
```typescript
// Convert navbar to client component
'use client';

export function Navbar() {
  const { isAdmin, centreName } = useAuthorisationContext();
  // Use context values
}
```

### Step 4: Remove Individual Checks
Remove per-component auth checking logic, rely on context.

## Recommendations

### For Current App:
**Stick with targeted approach** unless requirements change significantly.

### Future Apps:
- **Simple apps** → Targeted approach
- **Complex role-based apps** → Authorization Context
- **Uncertain** → Start with targeted, migrate to Context if needed

## Related Files

- `src/components/ui/admin-nav-link.tsx` - Example targeted client component
- `src/middleware.ts` - Route-level authorization
- `src/lib/amplify-utils.ts` - Server-side auth utilities
- `docs/AUTH_AUTOSIGNIN_DECISION.md` - Other auth architectural decisions

## References

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React Context](https://react.dev/reference/react/useContext)
- [AWS Amplify Hub](https://docs.amplify.aws/javascript/build-a-backend/utilities/hub/)
