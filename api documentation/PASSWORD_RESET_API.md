# Password Reset API Documentation

## Overview

The Password Reset API provides three endpoints for password management:
1. **Forgot Password** - Request a password reset token
2. **Reset Password** - Reset password using a token
3. **Change Password** - Change password for authenticated users

---

## Base URL
```
http://localhost:5000/api/auth
```

---

## Endpoints

### 1. Forgot Password

Request a password reset link via email.

**Endpoint:** `POST /api/auth/forgot-password`

**Access:** Public

**Rate Limit:** 3 requests per hour

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If an account exists with that email, a password reset link has been sent."
}
```

**Development Response (includes token for testing):**
```json
{
  "success": true,
  "message": "If an account exists with that email, a password reset link has been sent.",
  "resetToken": "abc123...",
  "resetUrl": "http://localhost:3000/auth/reset-password?token=abc123...&email=user@example.com"
}
```

**Security Note:**
- Always returns success message (doesn't reveal if email exists)
- Token expires in 10 minutes
- In production, token should only be sent via email
- Development mode shows token in response for testing

**Error Responses:**
- `400`: Invalid email format
- `429`: Rate limit exceeded

---

### 2. Reset Password

Reset password using the token received via email.

**Endpoint:** `POST /api/auth/reset-password`

**Access:** Public

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePassword123"
}
```

**Validation Rules:**
- Password must be at least 8 characters
- Password must contain uppercase, lowercase, and number
- Token must be valid and not expired (10 minutes)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful. You can now login with your new password."
}
```

**Error Responses:**
- `400`: Invalid or expired token, or validation error
- `400`: Invalid password format

**Flow:**
1. User receives email with reset link containing token
2. User clicks link and is redirected to reset password page
3. User enters new password
4. Frontend sends token + new password to this endpoint
5. Password is updated

---

### 3. Change Password

Change password for authenticated users (requires current password).

**Endpoint:** `POST /api/auth/change-password`

**Access:** Private (Requires authentication)

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "CurrentPassword123",
  "newPassword": "NewSecurePassword456"
}
```

**Validation Rules:**
- Current password must be correct
- New password must be at least 8 characters
- New password must contain uppercase, lowercase, and number
- User must have a password set (OAuth users without password need to use reset)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400`: Validation error (password format)
- `400`: Password not set (use reset instead)
- `401`: Authentication required
- `401`: Current password is incorrect

---

## Admin Account Restrictions

### Admin Signup
❌ **Blocked**: Admin accounts cannot be created through signup endpoint

**Request:**
```json
POST /api/auth/signup
{
  "fullName": "Admin User",
  "email": "admin@example.com",
  "phone": "+1234567890",
  "password": "AdminPass123",
  "role": "admin"
}
```

**Response (403):**
```json
{
  "success": false,
  "message": "Admin accounts cannot be created through signup"
}
```

### Admin Role Selection
❌ **Blocked**: Users cannot select admin role

**Request:**
```json
POST /api/auth/select-role
Authorization: Bearer <token>
{
  "role": "admin"
}
```

**Response (403):**
```json
{
  "success": false,
  "message": "Admin role cannot be selected. Admin accounts must be created manually."
}
```

### Admin Login
✅ **Allowed**: Admin users can login normally using the login endpoint

**Note:** Admin accounts must be created manually in the database with admin role.

---

## Security Features

1. **Token Security:**
   - Reset tokens are hashed before storing in database
   - Tokens expire after 10 minutes
   - One-time use (token is cleared after password reset)
   - Cryptographically secure random token generation

2. **Rate Limiting:**
   - Forgot password: 3 requests per hour (prevents email spam)

3. **Password Validation:**
   - Minimum 8 characters
   - Must contain uppercase, lowercase, and number
   - Validated on both reset and change endpoints

4. **Privacy:**
   - Forgot password always returns success (doesn't reveal if email exists)
   - Tokens are only visible in development mode

5. **OAuth Users:**
   - OAuth users without password must use forgot password to set one
   - Change password endpoint checks if password exists

---

## Frontend Integration

### Forgot Password Flow

```javascript
// 1. User submits forgot password form
const response = await fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});

// 2. Show success message (don't reveal if email exists)
// In dev mode, you can get the token from response for testing

// 3. Redirect user or show email sent confirmation
```

### Reset Password Flow

```javascript
// Get token from URL query params
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const email = urlParams.get('email');

// Submit reset
const response = await fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: token,
    password: 'NewSecurePassword123'
  })
});

// If successful, redirect to login
if (response.ok) {
  router.push('/auth/login');
}
```

### Change Password Flow

```javascript
const response = await fetch('/api/auth/change-password', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    currentPassword: 'OldPassword123',
    newPassword: 'NewPassword456'
  })
});
```

---

## Email Service Integration (Production)

In production, you'll need to implement email sending. Here's an example structure:

```typescript
// src/services/emailService.ts
import nodemailer from 'nodemailer';

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
) => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}&email=${email}`;
  
  // Configure email transporter (Gmail, SendGrid, etc.)
  const transporter = nodemailer.createTransporter({
    // Your email config
  });
  
  await transporter.sendMail({
    to: email,
    subject: 'Reset Your Password',
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 10 minutes.</p>
    `
  });
};
```

Then in `passwordController.ts`:
```typescript
import { sendPasswordResetEmail } from '../services/emailService';

// In forgotPassword function:
await sendPasswordResetEmail(user.email, resetToken);
```

---

## Example cURL Commands

### Forgot Password
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Reset Password
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset_token_here",
    "password": "NewPassword123"
  }'
```

### Change Password
```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPassword123",
    "newPassword": "NewPassword456"
  }'
```

---

## Database Schema

### User Model Fields (Relevant to Password Reset)
```javascript
{
  password: String (hashed),
  resetPasswordToken: String (hashed),
  resetPasswordExpires: Date
}
```

**Token Storage:**
- Tokens are hashed with SHA-256 before storing
- Expires after 10 minutes
- Cleared after successful password reset

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

**Status Codes:**
- `400`: Bad Request (validation errors, invalid token)
- `401`: Unauthorized (authentication required, wrong password)
- `403`: Forbidden (admin restrictions)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

---

## Testing in Development

In development mode (`NODE_ENV=development`), the forgot password endpoint returns the reset token in the response. This allows you to:

1. Test the flow without setting up email service
2. Get the token directly from the API response
3. Use it to test the reset password endpoint

**Example Development Response:**
```json
{
  "success": true,
  "message": "...",
  "resetToken": "actual_token_here",
  "resetUrl": "http://localhost:3000/auth/reset-password?token=actual_token_here&email=user@example.com"
}
```

**In Production:**
- Remove token from response
- Only send via email
- Never expose tokens in API responses

---

Last Updated: 2024

