# 🚀 Vehicle Overload Detection System - Setup Guide

## Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Firebase account
- Google Cloud account (optional, for Vision API)

---

## Step-by-Step Setup

### 1. Backend Setup

```bash
cd backend
npm install
```

#### Environment Variables
Create a `.env` file in the `backend` directory:

```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Firebase (Already configured)
FIREBASE_PROJECT_ID=vehiclewatch-927ac
FIREBASE_API_KEY=AIzaSyDvfOBRgHDzbwtN-dhBiLxpNiMHcW7kmzE
FIREBASE_AUTH_DOMAIN=vehiclewatch-927ac.firebaseapp.com
FIREBASE_STORAGE_BUCKET=vehiclewatch-927ac.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=1003751681542
FIREBASE_APP_ID=1:1003751681542:web:2d5696ee51901e4ee71d87
FIREBASE_MEASUREMENT_ID=G-X9LJF8X0B0

# Google Cloud (Optional)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
```

#### Start Backend Server
```bash
npm start
# or for development
npm run dev
```

Server will run on `http://localhost:5000`

---

### 2. Frontend Setup

Frontend is already configured with Firebase! Just open the HTML file:

```bash
cd frountend
# Option 1: Open directly in browser
open index.html

# Option 2: Use a local server
python -m http.server 3000
# or
npx http-server -p 3000
```

Then open `http://localhost:3000` in your browser.

---

## Firebase Configuration

### Current Setup
Firebase is already configured with the following project:
- **Project ID**: `vehiclewatch-927ac`
- **Database**: Firestore
- **Real-time Alerts**: Enabled

### Firebase Features Enabled
✅ **Firestore Database** - Stores alerts and notifications
✅ **Real-time Listeners** - Live updates in frontend
✅ **Analytics** - Usage tracking (optional)

### Firebase Collections
The system uses these Firestore collections:
- `alerts` - Stores overload detection alerts
- `notifications` - Police dashboard notifications

---

## Project Structure

```
vehicle-detection/
├── backend/
│   ├── services/
│   │   └── firebaseService.js  ← Firebase service module
│   ├── server.js               ← Main server
│   ├── config.js               ← Configuration
│   └── predictor.js            ← ML logic
│
└── frountend/
    ├── index.html              ← Main HTML (with Firebase SDK)
    ├── app.js                  ← Application logic
    ├── firebase-config.js      ← Firebase config
    └── styles.css              ← Styling
```

---

## Features

### ✅ Implemented
- Firebase Admin SDK integration
- Firebase Client SDK integration
- Real-time alert system
- Firestore database storage
- Frontend real-time updates
- Centralized Firebase service module

### 🔄 How It Works

1. **Backend**: 
   - Uses `firebaseService.js` for all Firebase operations
   - Automatically initializes Firebase Admin SDK
   - Saves alerts to Firestore

2. **Frontend**:
   - Firebase SDK loaded via CDN
   - Real-time listeners for alerts
   - Automatic UI updates when new alerts arrive

---

## Testing

### Test Backend API
```bash
curl http://localhost:5000/
```

### Test Prediction
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "currentLoad": 15,
    "maxLoad": 10,
    "suspension": 50,
    "tirePressure": 30,
    "weight": 8000,
    "speed": 70,
    "registrationNumber": "MH12AB1234"
  }'
```

---

## Troubleshooting

### Firebase Not Initializing
1. Check `.env` file has correct Firebase credentials
2. Verify Firebase project exists
3. Check console logs for error messages

### Frontend Not Loading
1. Check browser console for errors
2. Verify Firebase SDK is loading (check Network tab)
3. Make sure backend is running

### Real-time Updates Not Working
1. Check Firestore rules allow read access
2. Verify Firebase connection in browser console
3. Check network tab for WebSocket connections

---

## Next Steps

1. ✅ Firebase is configured and ready
2. ✅ Backend and Frontend are integrated
3. 🚀 Start using the system!

For more details, see the main [README.md](README.md)

