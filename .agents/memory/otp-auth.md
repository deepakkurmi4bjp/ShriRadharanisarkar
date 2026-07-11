---
name: OTP authentication system
description: Login is 2-step for super_admin/admin/collector. Password verify → OTP sent via Gmail SMTP → verify-otp issues JWT.
---

Two-step login flow for protected roles (super_admin, admin, collector):
1. POST /api/auth/login with mobile+password → returns {otpRequired:true, userId, maskedEmail}
2. POST /api/auth/verify-otp with {userId, otp} → returns {user, token}

Public role skips OTP and gets token directly in step 1.

**OTP storage:** `otp_codes` table (userId FK, code, expiresAt 10min, used bool). Old unused OTPs invalidated on new request.

**Email sender:** nodemailer via Gmail SMTP. Credentials: GMAIL_USER + GMAIL_APP_PASSWORD secrets.

**User emails in DB:**
- 7440771076 (super_admin) → deepak53802@gmail.com
- 7440771077 (admin) → bjp4taradehi@gmail.com
- 9425478323 (collector) → sdf.Deepakpatel@gmail.com

**Why:** users.email column added to users table for OTP delivery. If user has no email set, login returns 400 asking them to contact super_admin.

**Admin panel email management:** When creating/editing users via admin panel, email field must be included so OTP can be delivered.
