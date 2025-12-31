# 🔒 Security Guide

## Important: Protecting Your Credentials

This project uses environment variables and configuration files to manage sensitive credentials. **Never commit actual credentials to Git!**

## Setup Instructions

### 1. Backend Configuration

1. Copy the example config file:
   ```bash
   cp backend/config.example.js backend/config.js
   ```

2. Create a `.env` file in the `backend` directory:
   ```bash
   cd backend
   cp .env.example .env
   ```

3. Edit `.env` file and add your Firebase credentials:
   ```env
   FIREBASE_API_KEY=your_actual_api_key
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   # ... other variables
   ```

### 2. Frontend Configuration

1. Copy the example config file:
   ```bash
   cp frountend/firebase-config.example.js frountend/firebase-config.js
   ```

2. Edit `frountend/firebase-config.js` and add your Firebase credentials:
   ```javascript
   const firebaseConfig = {
     apiKey: "your_actual_api_key",
     authDomain: "your_project.firebaseapp.com",
     // ... other config
   };
   ```

3. Also update `frountend/index.html` - find the Firebase config section and update it with your credentials.

## Files to Never Commit

The following files are in `.gitignore` and should **never** be committed:
- `backend/config.js` (use `config.example.js` as template)
- `frountend/firebase-config.js` (use `firebase-config.example.js` as template)
- `backend/.env` (use `.env.example` as template)
- Any files containing API keys, passwords, or tokens

## Getting Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on Project Settings (gear icon)
4. Scroll to "Your apps" section
5. Copy the config values

## If You Accidentally Committed Credentials

If you've already committed sensitive data:

1. **Immediately rotate your credentials** in Firebase Console
2. Remove the files from Git history:
   ```bash
   git rm --cached backend/config.js
   git rm --cached frountend/firebase-config.js
   ```
3. Add them to `.gitignore`
4. Commit the changes
5. Consider using `git filter-branch` or BFG Repo-Cleaner to remove from history

## Best Practices

✅ **DO:**
- Use environment variables for sensitive data
- Use `.env.example` files as templates
- Keep credentials in `.gitignore`
- Rotate credentials if exposed

❌ **DON'T:**
- Commit actual API keys or passwords
- Share credentials in screenshots or documentation
- Hardcode credentials in source code
- Commit `.env` files

## Need Help?

If you need help setting up credentials, check:
- `SETUP_GUIDE.md` - Step-by-step setup instructions
- `README.md` - General project information

