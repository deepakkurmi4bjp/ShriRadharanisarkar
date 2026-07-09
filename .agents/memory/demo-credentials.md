---
name: Demo credentials
description: Actual seeded demo accounts and their passwords — different from original replit.md documentation.
---

All accounts use password: **Aditya@123**

| Mobile | Role | Name | Notes |
|--------|------|------|-------|
| 9876543210 | super_admin | Ramesh Sharma | bcrypt-hashed after first login |
| 7440771076 | super_admin | Deepak Patel | |
| 9425478323 | collector | Deepak Patel | bcrypt-hashed after first login |
| 7440771077 | admin | Deepak Patel | |

The auth route (`auth.ts`) auto-hashes plaintext passwords on first successful login (bcrypt). So some accounts show a bcrypt hash in the DB — they still work with the same password.

The originally documented mobiles (9876543210–9876543214 with named users Ramesh/Suresh/Mohan/Priya/Ravi) do not all exist in the DB. Only 9876543210 (Ramesh Sharma) survived from the original seed.
