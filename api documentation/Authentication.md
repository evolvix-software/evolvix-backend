# Evolvix Authentication API Documentation

## Base URL
```
http://localhost:5000/api/auth
```

## Authentication
Most endpoints use Firebase ID token authentication. Include the token in the Authorization header:
```
Authorization: Bearer <firebase_id_token>
```

---

## Table of Contents
1. [Sign Up](#sign-up)
2. [Login](#login)
3. [Google OAuth](#google-oauth)
4. [Apple Sign In](#apple-sign-in)
5. [Select Role](#select-role)
6. [Get Current User](#get-current-user)
7. [Refresh Token](#refresh-token)
8. [Logout](#logout)

---

## Sign Up

Register a new user account.

**Endpoint:** `POST /api/auth/signup`

**Access:** Public

**Rate Limit:** 3 requests per hour

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "role": "student" // Optional: student, mentor, employer, investor, sponsor, entrepreneur
}
```

**Note:** Firebase handles password authentication. The password is provided during Firebase signup, not in this API call.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Validation Rules:**
- `fullName`: 2-100 characters, letters/spaces/hyphens/apostrophes only
- `email`: Valid email format, unique
- `phone`: Valid international format (E.164), unique
- `role`: Optional, must be one of: student, mentor, employer, investor, sponsor, entrepreneur

**Note:** Password validation is handled by Firebase on the client side.

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "roles": ["student"],
      "primaryRole": "student",
      "isEmailVerified": false,
      "isPhoneVerified": false
    },
    "survey": {
      "role": "student",
      "completed": false,
      "hasStarted": false
    }
  }
}
```

**Error Responses:**
- `400`: Validation error
- `409`: Email or phone already exists
- `429`: Rate limit exceeded

---

## Login

Authenticate user and sync user data with backend.

**Endpoint:** `POST /api/auth/login`

**Access:** Public

**Rate Limit:** 5 requests per 15 minutes

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Request Body:**
```json
{}
```

**Note:** Firebase handles authentication. This endpoint verifies the Firebase token and syncs user data with MongoDB.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "roles": ["student"],
      "primaryRole": "student",
      "avatar": "https://...",
      "isEmailVerified": true,
      "isPhoneVerified": false
    },
    "survey": {
      "role": "student",
      "completed": false,
      "hasStarted": false
    },
    "surveys": {
      "student": {
        "completed": false,
        "hasStarted": false
      }
    }
  }
}
```

**Error Responses:**
- `401`: Invalid credentials
- `403`: Account deactivated
- `429`: Rate limit exceeded

---

## Google OAuth

Authenticate user with Google and sync user data.

**Endpoint:** `POST /api/auth/google`

**Access:** Public

**Rate Limit:** 10 requests per hour

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Request Body:**
```json
{}
```

**Note:** Firebase handles Google OAuth. This endpoint verifies the Firebase token and syncs user data with MongoDB.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "roles": ["student"],
      "primaryRole": "student"
    },
    "redirectUrl": "http://localhost:3000/auth/oauth/callback?provider=google&needsRoleSelection=true"
  }
}
```

---

## Apple Sign In

Authenticate user with Apple and sync user data.

**Endpoint:** `POST /api/auth/apple`

**Access:** Public

**Rate Limit:** 10 requests per hour

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Request Body:**
```json
{}
```

**Note:** Firebase handles Apple Sign In. This endpoint verifies the Firebase token and syncs user data with MongoDB.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Apple authentication successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "roles": ["student"],
      "primaryRole": "student"
    }
  }
}
```
  "user": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Note:** Apple Sign In requires client-side implementation. This endpoint is a placeholder for future implementation.

**Error Response (501):**
```json
{
  "success": false,
  "message": "Apple Sign In is not yet fully implemented. Please use email/password or Google sign in."
}
```

---

## Select Role

Select or update user's primary role.

**Endpoint:** `POST /api/auth/select-role`

**Access:** Private (Requires authentication)

**Request Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Request Body:**
```json
{
  "role": "mentor" // student, mentor, employer, investor, sponsor, entrepreneur
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Role selected successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "roles": ["student", "mentor"],
      "primaryRole": "mentor"
    }
  }
}
```

**Error Responses:**
- `400`: Invalid role
- `401`: Authentication required
- `403`: Access denied (if trying to set admin role)

---

## Get Current User

Get authenticated user's profile information.

**Endpoint:** `GET /api/auth/me`

**Access:** Private (Requires authentication)

**Request Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "roles": ["student"],
      "primaryRole": "student",
      "isEmailVerified": true,
      "isPhoneVerified": false,
      "avatar": "https://...",
      "bio": "Student at...",
      "location": "New York, USA",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `401`: Authentication required

---

## Refresh Token

Verify Firebase token validity (Firebase handles token refresh automatically).

**Endpoint:** `POST /api/auth/refresh-token`

**Access:** Public

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Request Body:**
```json
{}
```

**Note:** Firebase automatically refreshes tokens. This endpoint verifies token validity and returns user information.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "john.doe@example.com",
      "roles": ["student"],
      "primaryRole": "student"
    }
  }
}
```

**Error Responses:**
- `401`: Invalid or expired token

---

## Logout

Logout user (client should delete tokens).

**Endpoint:** `POST /api/auth/logout`

**Access:** Private (Requires authentication)

**Request Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## User Roles

Available roles in the system:

1. **student**: Access to learning resources, mentors, courses
2. **mentor**: Can provide mentorship, create content
3. **employer**: Can post jobs, find talent
4. **investor**: Can discover and invest in startups
5. **sponsor**: Can sponsor students and programs
6. **entrepreneur**: Startup tools, funding access
7. **admin**: Full system access (managed separately)

**Note:** Users can have multiple roles, but must select one primary role.

---

## Firebase Authentication

This API uses Firebase Authentication for user authentication. Firebase handles:
- Email/password authentication
- Google OAuth
- Apple Sign In
- Token generation and refresh
- Email verification

### Firebase ID Token

Firebase automatically generates ID tokens that are used for API authentication. These tokens:
- Are automatically refreshed by Firebase SDK
- Expire after 1 hour
- Include user information (uid, email, email_verified, etc.)

**Note:** Firebase handles token refresh automatically. No manual refresh token handling is needed.

---

## Environment Variables

Required environment variables for authentication:

```env
# Firebase Admin SDK Configuration
# Option 1: Individual variables
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key\n-----END PRIVATE KEY-----\n"

# Option 2: Service account JSON (as string)
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...",...}

# Server
CORS_ORIGIN=http://localhost:3000
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

**Status Codes:**
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (access denied)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error

---

## Security Features

1. **Password Hashing**: bcrypt with salt rounds of 12
2. **Rate Limiting**: 
   - Login: 5 attempts per 15 minutes
   - Signup: 3 attempts per hour
   - OAuth: 10 attempts per hour
3. **Firebase Authentication**: 
   - Secure token generation and verification
   - Automatic token refresh
   - Built-in security features
4. **Input Validation**: All inputs validated with express-validator
5. **CORS**: Configured for allowed origins only
6. **Helmet**: Security headers enabled

---

## Example Usage

### cURL Examples

**Sign Up:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "password": "SecurePass123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@example.com",
    "password": "SecurePass123"
  }'
```

**Get Current User:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Select Role:**
```bash
curl -X POST http://localhost:5000/api/auth/select-role \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "mentor"
  }'
```

---

## Frontend Integration Notes

1. **Store Tokens**: Save `accessToken` and `refreshToken` securely (localStorage/sessionStorage)
2. **Token Refresh**: Implement automatic token refresh before expiration
3. **Role Selection**: After OAuth or signup, check if user needs role selection
4. **Error Handling**: Handle rate limiting and authentication errors gracefully
5. **Google OAuth**: Redirect user to `/api/auth/google` for OAuth flow

---

## Testing

Test the API endpoints using:
- Postman
- cURL
- Thunder Client (VS Code)
- Frontend application

**Test User Credentials** (after creating):
```
Email: test@example.com
Password: Test123456
```

---

## Support

For issues or questions, please contact the development team.

Last Updated: 2024

