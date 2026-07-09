---
name: Auth race condition fix
description: AuthProvider needs isLoading state to prevent ProtectedRoute from redirecting to /login before localStorage is read on page load.
---

AuthProvider uses useState (null) for user/token and a useEffect to restore from localStorage. On the first render, user is null → isAuthenticated is false → ProtectedRoute redirects to /login immediately, BEFORE the effect fires. This means any page refresh or direct URL navigation kicks the user back to login even with a valid stored session.

**Why:** useEffect fires after render, but ProtectedRoute checks auth synchronously on first render.

**Fix:** Add `isLoading: boolean` (starts true, set false in useEffect finally block) to AuthState. ProtectedRoute returns null while isLoading is true, preventing the premature redirect.

**How to apply:** Every ProtectedRoute must check `isLoading` before `isAuthenticated`. Login page should also redirect away if `!isLoading && isAuthenticated`.
