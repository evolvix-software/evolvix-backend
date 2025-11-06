# Evolvix Backend

TypeScript + Express + MongoDB backend for the Evolvix platform.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy the environment variables file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - MongoDB connection string
   - Firebase Admin SDK credentials (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions)

## Development

Run the development server with hot reload:
```bash
npm run dev
```

The server will start on `http://localhost:5000` by default.

## Build

Build for production:
```bash
npm run build
```

Run production build:
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### API Info
```
GET /api
```

## Project Structure

```
src/
├── config/          # Configuration files
│   ├── database.ts   # MongoDB connection
│   └── env.ts       # Environment variables
├── controllers/     # Request handlers
├── middlewares/     # Express middlewares
├── models/          # Mongoose models
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Environment Variables

Required environment variables:

### Server Configuration
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MONGODB_URI` - MongoDB connection string
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:3000)

### Firebase Configuration
Choose one of the following options:

**Option 1: Individual Environment Variables**
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_CLIENT_EMAIL` - Service account email
- `FIREBASE_PRIVATE_KEY` - Service account private key (with escaped newlines)

**Option 2: Service Account JSON**
- `FIREBASE_SERVICE_ACCOUNT` - Complete service account JSON as a string

### Email Configuration (Optional)
- `EMAIL_HOST` - SMTP server host
- `EMAIL_PORT` - SMTP server port
- `EMAIL_SECURE` - Use TLS (true/false)
- `EMAIL_USER` - SMTP username
- `EMAIL_PASS` - SMTP password

See `.env.example` for a complete template.

## MongoDB Connection

### Local MongoDB
```
MONGODB_URI=mongodb://localhost:27017/evolvix
```

### MongoDB Atlas
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/evolvix?retryWrites=true&w=majority
```

## License

ISC

