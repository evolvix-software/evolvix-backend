# Survey API Documentation

## Overview

The Survey API allows users to complete role-specific surveys after registration and login. Each role (student, mentor, employer, investor, sponsor, entrepreneur) has unique questions that help personalize their experience.

## Base URL
```
http://localhost:5000/api/survey
```

---

## Endpoints

### 1. Get Survey Questions

Get all questions for a specific role.

**Endpoint:** `GET /api/survey/questions/:role`

**Access:** Public

**Parameters:**
- `role` (path): One of: `student`, `mentor`, `employer`, `investor`, `sponsor`, `entrepreneur`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "role": "student",
    "questions": [
      {
        "id": "goal",
        "question": "What's your primary goal?",
        "type": "single",
        "options": ["Learn new skills", "Get a job", "Build a startup", "Advance my career", "Explore opportunities"],
        "required": true
      },
      {
        "id": "domain",
        "question": "Which domain interests you most?",
        "type": "single",
        "options": ["Technology", "Business", "Design", "Data Science", "Marketing", "Healthcare", "Education", "Other"],
        "required": true
      }
    ]
  }
}
```

---

### 2. Get Survey Status

Check if survey is completed for a specific role.

**Endpoint:** `GET /api/survey/status/:role`

**Access:** Private (Requires authentication)

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Parameters:**
- `role` (path): Role to check status for

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "role": "student",
    "completed": false,
    "completedAt": null,
    "hasStarted": true,
    "progress": 60
  }
}
```

**Progress Calculation:** Percentage of required questions answered.

---

### 3. Get My Surveys

Get status of all surveys for the authenticated user.

**Endpoint:** `GET /api/survey/my-surveys`

**Access:** Private (Requires authentication)

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "surveys": [
      {
        "role": "student",
        "completed": true,
        "completedAt": "2024-01-01T00:00:00.000Z",
        "answersCount": 6,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "role": "mentor",
        "completed": false,
        "completedAt": null,
        "answersCount": 3,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 4. Get Survey Answers

Get all answers for a specific role's survey.

**Endpoint:** `GET /api/survey/:role`

**Access:** Private (Requires authentication)

**Request Headers:**
```
Authorization: Bearer <access_token>
```

**Parameters:**
- `role` (path): Role to get answers for

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "role": "student",
    "answers": [
      {
        "questionId": "goal",
        "answer": "Get a job"
      },
      {
        "questionId": "domain",
        "answer": "Technology"
      },
      {
        "questionId": "learning",
        "answer": ["With mentor guidance", "Self-paced courses"]
      }
    ],
    "completed": true,
    "completedAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Note:** If survey doesn't exist, returns empty answers array.

---

### 5. Save Single Answer

Save or update a single survey answer.

**Endpoint:** `POST /api/survey/save-answer`

**Access:** Private (Requires authentication)

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "student",
  "questionId": "goal",
  "answer": "Get a job"  // or ["option1", "option2"] for multiple choice
}
```

**Validation:**
- `role`: Required, must be valid role
- `questionId`: Required
- `answer`: Required, format depends on question type:
  - `single`: string
  - `multiple`: string[]
  - `text`: string

**Success Response (200):**
```json
{
  "success": true,
  "message": "Answer saved successfully",
  "data": {
    "role": "student",
    "answer": {
      "questionId": "goal",
      "answer": "Get a job"
    }
  }
}
```

---

### 6. Submit Complete Survey

Submit all survey answers at once (completes the survey).

**Endpoint:** `POST /api/survey/submit`

**Access:** Private (Requires authentication)

**Request Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "role": "student",
  "answers": [
    {
      "questionId": "goal",
      "answer": "Get a job"
    },
    {
      "questionId": "domain",
      "answer": "Technology"
    },
    {
      "questionId": "learning",
      "answer": ["With mentor guidance", "Self-paced courses"]
    },
    {
      "questionId": "expectations",
      "answer": "I want to learn and grow in tech."
    }
  ]
}
```

**Validation:**
- All required questions must be answered
- Answer format must match question type
- Options must be valid if question has options

**Success Response (200):**
```json
{
  "success": true,
  "message": "Survey submitted successfully",
  "data": {
    "role": "student",
    "completed": true,
    "completedAt": "2024-01-01T00:00:00.000Z",
    "answersCount": 6
  }
}
```

**Error Responses:**
- `400`: Missing required answers or validation errors
- `401`: Authentication required
- `404`: Question not found for role

---

## Survey Integration with Authentication

### Signup Response
When a user signs up with a role, the response includes survey status:

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "...",
    "survey": {
      "role": "student",
      "completed": false,
      "hasStarted": false
    }
  }
}
```

### Login Response
Login response includes survey status for primary role and all roles:

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "...",
    "survey": {
      "role": "student",
      "completed": false,
      "hasStarted": true
    },
    "surveys": {
      "student": {
        "completed": false,
        "hasStarted": true
      },
      "mentor": {
        "completed": true,
        "hasStarted": true
      }
    }
  }
}
```

### Get Current User (/api/auth/me)
Includes survey status for all roles:

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "surveys": {
      "student": {
        "completed": false,
        "hasStarted": true
      }
    }
  }
}
```

---

## Question Types

### Single Choice
```json
{
  "type": "single",
  "options": ["Option 1", "Option 2", "Option 3"],
  "answer": "Option 1"  // String
}
```

### Multiple Choice
```json
{
  "type": "multiple",
  "options": ["Option 1", "Option 2", "Option 3"],
  "answer": ["Option 1", "Option 2"]  // Array of strings
}
```

### Text Input
```json
{
  "type": "text",
  "answer": "User's text response"  // String
}
```

---

## Frontend Integration Flow

1. **After Signup/Login:**
   ```javascript
   // Check survey status from login response
   if (!data.survey?.completed && data.user.primaryRole) {
     // Redirect to survey
     router.push(`/auth/survey?role=${data.user.primaryRole}`);
   }
   ```

2. **Get Questions:**
   ```javascript
   const response = await fetch(`/api/survey/questions/${role}`);
   const { data } = await response.json();
   ```

3. **Save Answers (Progressive):**
   ```javascript
   await fetch('/api/survey/save-answer', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       role: 'student',
       questionId: 'goal',
       answer: 'Get a job'
     })
   });
   ```

4. **Submit Complete Survey:**
   ```javascript
   await fetch('/api/survey/submit', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       role: 'student',
       answers: allAnswers
     })
   });
   ```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

**Status Codes:**
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `404`: Not Found (question/role not found)
- `500`: Internal Server Error

---

## Database Schema

### Survey Model
```javascript
{
  userId: ObjectId (ref: User),
  role: String (enum),
  answers: [{
    questionId: String,
    answer: Mixed (String or Array)
  }],
  completed: Boolean,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `userId + role` (unique) - One survey per role per user
- `userId + completed` - Query performance

---

## Example cURL Commands

**Get Survey Questions:**
```bash
curl http://localhost:5000/api/survey/questions/student
```

**Get Survey Status:**
```bash
curl -X GET http://localhost:5000/api/survey/status/student \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Save Answer:**
```bash
curl -X POST http://localhost:5000/api/survey/save-answer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "student",
    "questionId": "goal",
    "answer": "Get a job"
  }'
```

**Submit Survey:**
```bash
curl -X POST http://localhost:5000/api/survey/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "student",
    "answers": [
      {"questionId": "goal", "answer": "Get a job"},
      {"questionId": "domain", "answer": "Technology"}
    ]
  }'
```

---

Last Updated: 2024

