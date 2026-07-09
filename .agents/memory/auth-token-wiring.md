---
name: Auth token wiring for web app
description: This app uses localStorage bearer tokens, not cookies. setAuthTokenGetter must be called once in main.tsx at startup.
---

The generated API client uses `customFetch` from `@workspace/api-client-react`. It supports an optional `_authTokenGetter` that is called before each request to attach `Authorization: Bearer <token>`. By default it is null (no auth header).

This app stores the auth token in `localStorage` under key `"auth_token"` (set on login, cleared on logout). The `setAuthTokenGetter` must be called once at startup in `main.tsx` with a live getter function (not a snapshot) so it reads the current token on every request.

**Fix applied in main.tsx:**
```ts
setAuthTokenGetter(() => localStorage.getItem("auth_token"));
```

**Why a getter (not a value):** The getter is called fresh on every request, so login/logout changes to localStorage are automatically picked up without re-registering.

**Note:** The `custom-fetch.ts` comment says "should never be used in web applications where session cookies are automatically associated" — ignore this for this app because it uses localStorage tokens, not cookies.
