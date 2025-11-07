# Deploying Evolvix Backend to Vercel

This guide will help you deploy your Express.js backend to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Vercel CLI installed: `npm i -g vercel`
3. MongoDB Atlas account (or your MongoDB connection string)

## Step 1: Prepare Your Backend

The following files have been created for Vercel deployment:
- `vercel.json` - Vercel configuration
- `api/index.ts` - Serverless function entry point

## Step 2: Install Vercel Dependencies

Add `@vercel/node` to your dependencies:

```bash
cd evolvix-backend
npm install @vercel/node --save-dev
```

Or add it manually to `package.json`:

```json
{
  "devDependencies": {
    "@vercel/node": "^3.0.0"
  }
}
```

## Step 3: Set Up Environment Variables

Before deploying, you need to set up environment variables in Vercel:

### Required Environment Variables:

1. **MongoDB Connection**
   - `MONGO_DB` or `MONGODB_URI` - Your MongoDB connection string
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/evolvix?retryWrites=true&w=majority`

2. **CORS Origin**
   - `CORS_ORIGIN` - Your frontend URL (e.g., `https://your-frontend.vercel.app`)

3. **JWT Secret** (if used)
   - `JWT_SECRET` - Secret key for JWT tokens

4. **Firebase Admin** (if used)
   - `FIREBASE_PROJECT_ID` - Firebase project ID
   - `FIREBASE_CLIENT_EMAIL` - Firebase service account email
   - `FIREBASE_PRIVATE_KEY` - Firebase private key

5. **Email Service** (if used)
   - `EMAIL_HOST` - SMTP host
   - `EMAIL_PORT` - SMTP port
   - `EMAIL_USER` - SMTP username
   - `EMAIL_PASS` - SMTP password

6. **Node Environment**
   - `NODE_ENV` - Set to `production`

## Step 4: Deploy via Vercel Dashboard

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"

2. **Import Your Repository**
   - Connect your Git repository (GitHub, GitLab, or Bitbucket)
   - Select the `evolvix-backend` directory as the root

3. **Configure Project**
   - **Framework Preset**: Other
   - **Root Directory**: `evolvix-backend`
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave empty (not needed for serverless)
   - **Install Command**: `npm install`

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add all required variables from Step 3
   - Make sure to set them for "Production", "Preview", and "Development" as needed

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete

## Step 5: Deploy via Vercel CLI

### Option B: Deploy via Command Line

1. **Login to Vercel**
   ```bash
   cd evolvix-backend
   vercel login
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow the prompts**:
   - Link to existing project? (No for first time)
   - Project name: `evolvix-backend`
   - Directory: `./`
   - Override settings? (No)

4. **Set Environment Variables**
   ```bash
   vercel env add MONGO_DB
   vercel env add CORS_ORIGIN
   vercel env add NODE_ENV
   # Add other variables as needed
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Step 6: Verify Deployment

After deployment, you'll get a URL like:
- `https://evolvix-backend.vercel.app`

Test your API:
```bash
curl https://evolvix-backend.vercel.app/
```

You should see:
```json
{
  "success": true,
  "message": "Welcome to Evolvix Backend API",
  "version": "1.0.0"
}
```

## Step 7: Update Frontend API URLs

Update your frontend `.env` files to point to the Vercel backend:

```env
NEXT_PUBLIC_API_URL=https://evolvix-backend.vercel.app
```

## Important Notes

### Serverless Functions Limitations

1. **Cold Starts**: Vercel serverless functions may have cold starts (first request can be slower)
2. **Timeout**: Functions have a 10-second timeout on the free plan, 60 seconds on Pro
3. **Database Connections**: Use connection pooling and handle reconnections properly

### MongoDB Connection

For MongoDB Atlas:
- Whitelist Vercel's IP addresses (or use `0.0.0.0/0` for all IPs)
- Use connection pooling in your database connection code
- Consider using MongoDB Atlas connection string with retry logic

### CORS Configuration

Make sure your `CORS_ORIGIN` includes:
- Your production frontend URL
- Your preview deployment URLs (if needed)
- Format: `https://your-frontend.vercel.app,https://*.vercel.app`

## Troubleshooting

### Build Fails
- Check that `@vercel/node` is installed
- Verify TypeScript compilation works: `npm run build`
- Check Vercel build logs for errors

### API Returns 404
- Verify `api/index.ts` exists and exports the Express app
- Check `vercel.json` routes configuration
- Ensure all routes are prefixed with `/api` in your Express app

### Database Connection Issues
- Verify MongoDB connection string is correct
- Check MongoDB Atlas network access settings
- Ensure environment variables are set correctly in Vercel

### CORS Errors
- Verify `CORS_ORIGIN` includes your frontend URL
- Check that credentials are enabled if needed
- Test with `curl` to isolate CORS issues

## Additional Resources

- [Vercel Serverless Functions Docs](https://vercel.com/docs/functions/serverless-functions)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Express on Vercel](https://vercel.com/guides/using-express-with-vercel)

