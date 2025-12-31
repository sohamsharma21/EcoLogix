/**
 * Vehicle Overload Detection System - Express Server
 * Main server file with API endpoints and middleware
 */

// ============================================
// Import Dependencies
// ============================================
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { predictOverload, detectLicensePlate, sendAlert } = require('./predictor');
const config = require('./config');

// Load environment variables
dotenv.config();

// Validate configuration
const configValidation = config.validateConfig();
if (!configValidation.isValid) {
    console.error('Configuration validation failed:');
    configValidation.errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
}

// ============================================
// Initialize Express App
// ============================================
const app = express();
const PORT = config.serverConfig.PORT;

// ============================================
// Middleware Setup
// ============================================

// CORS configuration
app.use(cors({
    origin: config.serverConfig.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer configuration for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: config.uploadConfig.MAX_FILE_SIZE
    },
    fileFilter: (req, file, cb) => {
        // Accept only allowed image types
        if (config.uploadConfig.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Only ${config.uploadConfig.ALLOWED_IMAGE_TYPES.join(', ')} files are allowed`), false);
        }
    }
});

// ============================================
// Logging Middleware
// ============================================
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        body: req.method === 'POST' ? req.body : undefined
    });
    next();
});

// ============================================
// Initialize Google Cloud Vision API
// ============================================
let visionClient = null;

try {
    if (config.googleCloudConfig.GOOGLE_CLOUD_KEY_FILE) {
        visionClient = new ImageAnnotatorClient({
            keyFilename: config.googleCloudConfig.GOOGLE_CLOUD_KEY_FILE
        });
        console.log('Google Cloud Vision API client initialized');
    } else if (config.googleCloudConfig.GOOGLE_CLOUD_PROJECT_ID) {
        visionClient = new ImageAnnotatorClient({
            projectId: config.googleCloudConfig.GOOGLE_CLOUD_PROJECT_ID
        });
        console.log('Google Cloud Vision API client initialized (using default credentials)');
    } else {
        console.warn('Warning: Google Cloud Vision API credentials not found. Vision features will be disabled.');
    }
} catch (error) {
    console.error('Error initializing Google Cloud Vision API:', error.message);
    console.warn('Vision features will be disabled');
}

// ============================================
// Initialize Firebase Admin
// ============================================
const firebaseService = require('./services/firebaseService');
const firebaseInitResult = firebaseService.initializeFirebase();
const firestore = firebaseService.getFirestore();
const firebaseApp = firebaseService.getFirebaseApp();

// ============================================
// Helper Functions
// ============================================
// Note: Prediction functions are now imported from predictor.js module

/**
 * Validate input ranges
 */
function validateInput(data) {
    const errors = [];

    if (data.currentLoad === undefined || data.currentLoad < 0) {
        errors.push('currentLoad must be a positive number');
    }

    if (data.maxLoad === undefined || data.maxLoad <= 0) {
        errors.push('maxLoad must be greater than 0');
    }

    if (data.suspension === undefined || data.suspension < 0 || data.suspension > 100) {
        errors.push('suspension must be between 0 and 100');
    }

    if (data.tirePressure === undefined || data.tirePressure < 0 || data.tirePressure > 100) {
        errors.push('tirePressure must be a positive number');
    }

    if (data.weight === undefined || data.weight <= 0) {
        errors.push('weight must be greater than 0');
    }

    if (data.speed === undefined || data.speed < 0 || data.speed > 200) {
        errors.push('speed must be between 0 and 200 km/h');
    }

    if (data.registrationNumber === undefined || data.registrationNumber.trim() === '') {
        errors.push('registrationNumber is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Note: Alert functions are now imported from predictor.js module

// ============================================
// API Routes
// ============================================

/**
 * GET / - API Status
 */
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'Vehicle Overload Detection System API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /info - Model Information
 */
app.get('/info', (req, res) => {
    res.json({
        model_name: config.modelConfig.MODEL_NAME,
        version: config.modelConfig.MODEL_VERSION,
        features: config.featureNames,
        powered_by: 'Google Cloud Platform',
        confidence_threshold: config.modelConfig.CONFIDENCE_THRESHOLD,
        alert_threshold: config.alertConfig.ALERT_THRESHOLD,
        endpoints: {
            predict: '/predict',
            detectPlate: '/detect-plate',
            status: '/'
        },
        description: 'AI-powered vehicle overload detection system using machine learning models'
    });
});

/**
 * POST /predict - Prediction Endpoint
 */
app.post('/predict', async (req, res, next) => {
    try {
        const vehicleData = req.body;

        // Validate input
        const validation = validateInput(vehicleData);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validation.errors
            });
        }

        // Call predictor function
        const prediction = predictOverload(vehicleData);

        // Send alert to Firebase and police dashboard if status is OVERLOAD
        if (prediction.status === 'OVERLOAD') {
            await sendAlert(vehicleData, prediction, vehicleData.location);
        }

        // Return prediction result
        res.json({
            success: true,
            ...prediction
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /detect-plate - Vehicle Registration Plate Detection
 */
app.post('/detect-plate', upload.single('image'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided'
            });
        }

        // Use detectLicensePlate function from predictor module
        const result = await detectLicensePlate(req.file.buffer);

        if (result.success) {
            res.json({
                success: true,
                text: result.plateNumber,
                plateNumber: result.plateNumber,
                fullText: result.fullText,
                confidence: result.confidence,
                detectedPatterns: result.allMatches || []
            });
        } else {
            res.json({
                success: false,
                text: '',
                plateNumber: null,
                fullText: result.fullText || '',
                confidence: result.confidence || 0,
                message: result.message || 'License plate not detected'
            });
        }
    } catch (error) {
        next(error);
    }
});

// ============================================
// Error Handling Middleware
// ============================================
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method
    });

    // Multer errors
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB'
            });
        }
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    // Validation errors
    if (err.message && err.message.includes('Only image files')) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    // Google Cloud Vision API errors
    if (err.code && err.code === 7) {
        return res.status(403).json({
            success: false,
            error: 'Google Cloud Vision API authentication failed'
        });
    }

    // Generic error response
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
    });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('Server running on port', PORT);
    console.log('Environment:', config.serverConfig.NODE_ENV);
    console.log('Host:', config.serverConfig.HOST);
    console.log('CORS enabled for:', config.serverConfig.CORS_ORIGIN);
    console.log('Model:', config.modelConfig.MODEL_NAME, 'v' + config.modelConfig.MODEL_VERSION);
    console.log('Confidence Threshold:', config.modelConfig.CONFIDENCE_THRESHOLD);
    console.log('Alert Threshold:', config.alertConfig.ALERT_THRESHOLD);
    console.log('Google Cloud Vision:', visionClient ? 'Enabled' : 'Disabled');
    console.log('Firebase:', firestore ? 'Connected' : 'Disabled');
    console.log('='.repeat(50));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});

module.exports = app;

