# Vehicle Overload Detection System - Backend Server

Express.js server for the Vehicle Overload Detection System with Google Cloud Vision API and Firebase integration.

## Features

- RESTful API endpoints for vehicle overload prediction
- Google Cloud Vision API for license plate detection
- Firebase integration for real-time alerts
- CORS enabled for frontend requests
- Comprehensive error handling
- Request logging middleware
- Input validation

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env` file

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to Google Cloud service account key
- `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON (as string)
- `FIREBASE_PROJECT_ID` - Firebase project ID

## API Endpoints

### GET `/`
Returns API status and version information.

**Response:**
```json
{
  "status": "online",
  "message": "Vehicle Overload Detection System API",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET `/info`
Returns model information and available features.

**Response:**
```json
{
  "model_name": "Vehicle Overload Detection",
  "version": "1.0.0",
  "features": ["currentLoad", "maxLoad", "suspension", "tirePressure", "weight", "speed", "registrationNumber"],
  "powered_by": "Google Cloud Platform"
}
```

### POST `/predict`
Predicts vehicle overload status based on input parameters.

**Request Body:**
```json
{
  "currentLoad": 15.5,
  "maxLoad": 10.0,
  "suspension": 45,
  "tirePressure": 32.5,
  "weight": 8500,
  "speed": 75,
  "registrationNumber": "MH12AB1234"
}
```

**Response:**
```json
{
  "success": true,
  "probability": 0.85,
  "status": "critical",
  "riskLevel": "Critical",
  "excessLoad": 5.5,
  "confidence": 0.745,
  "loadRatio": 155.0
}
```

### POST `/detect-plate`
Detects vehicle registration number from image using Google Cloud Vision API.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: Form data with `image` field containing image file

**Response:**
```json
{
  "success": true,
  "text": "MH12AB1234",
  "fullText": "MH12AB1234\n...",
  "confidence": 0.95,
  "detectedPatterns": ["MH12AB1234"]
}
```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## Error Handling

All errors are handled by middleware and return JSON responses with:
- `success: false`
- `error: "Error message"`
- Additional details in development mode

## Logging

All requests are logged with:
- Timestamp
- HTTP method and path
- IP address
- User agent
- Request body (for POST requests)

## Firebase Integration

Critical alerts are automatically saved to Firebase Firestore in the `alerts` collection with:
- Registration number
- Load data
- Risk level
- Timestamp
- Location (if provided)

## License

ISC

