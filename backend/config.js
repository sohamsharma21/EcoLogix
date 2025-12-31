/**
 * Vehicle Overload Detection System - Configuration Module
 * Centralized configuration management with environment variable support
 */

// ============================================
// Database Configuration
// ============================================
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDvfOBRgHDzbwtN-dhBiLxpNiMHcW7kmzE',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'vehiclewatch-927ac.firebaseapp.com',
    databaseURL: process.env.FIREBASE_DATABASE_URL || '',
    projectId: process.env.FIREBASE_PROJECT_ID || 'vehiclewatch-927ac',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'vehiclewatch-927ac.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '1003751681542',
    appId: process.env.FIREBASE_APP_ID || '1:1003751681542:web:2d5696ee51901e4ee71d87',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-X9LJF8X0B0'
};

// ============================================
// Google Cloud Configuration
// ============================================
const googleCloudConfig = {
    GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '',
    GOOGLE_CLOUD_KEY_FILE: process.env.GOOGLE_CLOUD_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    GCP_VISION_API_KEY: process.env.GCP_VISION_API_KEY || process.env.GOOGLE_VISION_API_KEY || '',
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || ''
};

// ============================================
// Server Configuration
// ============================================
const serverConfig = {
    PORT: parseInt(process.env.PORT, 10) || 5000,
    HOST: process.env.HOST || process.env.SERVER_HOST || 'localhost',
    NODE_ENV: process.env.NODE_ENV || 'development',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    CORS_ORIGIN: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000'
};

// ============================================
// Model Configuration
// ============================================
const modelConfig = {
    MODEL_NAME: process.env.MODEL_NAME || 'vehicle-overload-detection',
    MODEL_VERSION: process.env.MODEL_VERSION || '1.0.0',
    CONFIDENCE_THRESHOLD: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.92
};

// ============================================
// API Endpoints Configuration
// ============================================
const apiEndpoints = {
    // Hugging Face API for model inference (if using external ML model)
    HUGGINGFACE_API_URL: process.env.HUGGINGFACE_API_URL || 
        process.env.HF_API_URL || 
        'https://api-inference.huggingface.co/models',
    
    // Google Vision API endpoint
    GOOGLE_VISION_API_URL: process.env.GOOGLE_VISION_API_URL || 
        'https://vision.googleapis.com/v1/images:annotate',
    
    // Custom model endpoint (if using Vertex AI or custom deployment)
    VERTEX_AI_ENDPOINT: process.env.VERTEX_AI_ENDPOINT || '',
    
    // Internal API base URL
    BASE_URL: process.env.BASE_URL || `http://${serverConfig.HOST}:${serverConfig.PORT}`
};

// ============================================
// Alert Settings
// ============================================
const alertConfig = {
    // Threshold for triggering alerts (probability score)
    ALERT_THRESHOLD: parseFloat(process.env.ALERT_THRESHOLD) || 0.7,
    
    // Channels for sending alerts
    ALERT_CHANNELS: process.env.ALERT_CHANNELS 
        ? process.env.ALERT_CHANNELS.split(',').map(ch => ch.trim())
        : ['firebase', 'email', 'sms'],
    
    // Email configuration (if email channel is enabled)
    EMAIL_CONFIG: {
        enabled: process.env.EMAIL_ENABLED === 'true' || false,
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
        smtpUser: process.env.SMTP_USER || '',
        smtpPassword: process.env.SMTP_PASSWORD || '',
        fromEmail: process.env.FROM_EMAIL || 'alerts@vehicle-detection.com',
        toEmail: process.env.TO_EMAIL || 'police@vehicle-detection.com'
    },
    
    // SMS configuration (if SMS channel is enabled)
    SMS_CONFIG: {
        enabled: process.env.SMS_ENABLED === 'true' || false,
        provider: process.env.SMS_PROVIDER || 'twilio',
        apiKey: process.env.SMS_API_KEY || '',
        apiSecret: process.env.SMS_API_SECRET || '',
        fromNumber: process.env.SMS_FROM_NUMBER || '',
        toNumber: process.env.SMS_TO_NUMBER || ''
    },
    
    // Firebase alerts configuration
    FIREBASE_ALERTS_ENABLED: process.env.FIREBASE_ALERTS_ENABLED !== 'false',
    
    // Police dashboard notification settings
    POLICE_DASHBOARD_ENABLED: process.env.POLICE_DASHBOARD_ENABLED !== 'false'
};

// ============================================
// Feature Names Array
// ============================================
const featureNames = [
    'currentLoad',
    'maxLoad',
    'loadRatio',
    'suspension',
    'tirePressure',
    'weight',
    'speed'
];

// ============================================
// Additional Configuration
// ============================================

// File upload configuration
const uploadConfig = {
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: process.env.ALLOWED_IMAGE_TYPES 
        ? process.env.ALLOWED_IMAGE_TYPES.split(',').map(t => t.trim())
        : ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads'
};

// Logging configuration
const loggingConfig = {
    LOG_LEVEL: process.env.LOG_LEVEL || (serverConfig.NODE_ENV === 'production' ? 'info' : 'debug'),
    LOG_FILE: process.env.LOG_FILE || './logs/app.log',
    ENABLE_CONSOLE_LOG: process.env.ENABLE_CONSOLE_LOG !== 'false',
    ENABLE_FILE_LOG: process.env.ENABLE_FILE_LOG === 'true'
};

// Rate limiting configuration
const rateLimitConfig = {
    ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false',
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
};

// ============================================
// Export Configuration
// ============================================
module.exports = {
    // Database configuration
    firebaseConfig,
    
    // Google Cloud configuration
    googleCloudConfig,
    
    // Server configuration
    serverConfig,
    
    // Model configuration
    modelConfig,
    
    // API endpoints
    apiEndpoints,
    
    // Alert settings
    alertConfig,
    
    // Feature names
    featureNames,
    
    // Additional configurations
    uploadConfig,
    loggingConfig,
    rateLimitConfig,
    
    // Helper function to validate configuration
    validateConfig: () => {
        const errors = [];
        
        // Validate server config
        if (!serverConfig.PORT || serverConfig.PORT < 1 || serverConfig.PORT > 65535) {
            errors.push('Invalid PORT configuration');
        }
        
        // Validate model config
        if (modelConfig.CONFIDENCE_THRESHOLD < 0 || modelConfig.CONFIDENCE_THRESHOLD > 1) {
            errors.push('CONFIDENCE_THRESHOLD must be between 0 and 1');
        }
        
        // Validate alert threshold
        if (alertConfig.ALERT_THRESHOLD < 0 || alertConfig.ALERT_THRESHOLD > 1) {
            errors.push('ALERT_THRESHOLD must be between 0 and 1');
        }
        
        // Validate Firebase config (if Firebase alerts are enabled)
        if (alertConfig.FIREBASE_ALERTS_ENABLED) {
            if (!firebaseConfig.projectId) {
                errors.push('Firebase projectId is required when Firebase alerts are enabled');
            }
        }
        
        // Validate Google Cloud config (if Vision API is used)
        if (!googleCloudConfig.GOOGLE_CLOUD_PROJECT_ID && !googleCloudConfig.GOOGLE_CLOUD_KEY_FILE) {
            console.warn('Warning: Google Cloud credentials not configured. Vision API features will be disabled.');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },
    
    // Helper function to get full configuration object
    getAllConfig: () => {
        return {
            firebase: firebaseConfig,
            googleCloud: googleCloudConfig,
            server: serverConfig,
            model: modelConfig,
            api: apiEndpoints,
            alerts: alertConfig,
            features: featureNames,
            upload: uploadConfig,
            logging: loggingConfig,
            rateLimit: rateLimitConfig
        };
    }
};

