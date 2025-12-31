/**
 * Firebase Service Module
 * Centralized Firebase Admin SDK initialization and utilities
 */

const admin = require('firebase-admin');
const config = require('../config');

let firebaseApp = null;
let firestore = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * @returns {Object} { success: boolean, message: string, app: FirebaseApp|null, firestore: Firestore|null }
 */
function initializeFirebase() {
    // Prevent multiple initializations
    if (isInitialized && firebaseApp) {
        return {
            success: true,
            message: 'Firebase already initialized',
            app: firebaseApp,
            firestore: firestore
        };
    }

    try {
        // Method 1: Use service account from environment variable
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    projectId: config.firebaseConfig.projectId
                });
                firestore = admin.firestore();
                isInitialized = true;
                
                console.log('✅ Firebase Admin initialized with service account');
                return {
                    success: true,
                    message: 'Firebase initialized with service account',
                    app: firebaseApp,
                    firestore: firestore
                };
            } catch (parseError) {
                console.error('Error parsing FIREBASE_SERVICE_ACCOUNT:', parseError.message);
            }
        }

        // Method 2: Use project ID from config (for default credentials)
        if (config.firebaseConfig.projectId) {
            // Check if Firebase is already initialized
            if (admin.apps.length > 0) {
                firebaseApp = admin.app();
                firestore = admin.firestore();
                isInitialized = true;
                
                console.log('✅ Firebase Admin initialized (using existing app)');
                return {
                    success: true,
                    message: 'Firebase initialized (existing app)',
                    app: firebaseApp,
                    firestore: firestore
                };
            }

            // Initialize with project ID
            firebaseApp = admin.initializeApp({
                projectId: config.firebaseConfig.projectId
            });
            firestore = admin.firestore();
            isInitialized = true;
            
            console.log('✅ Firebase Admin initialized with project ID:', config.firebaseConfig.projectId);
            return {
                success: true,
                message: 'Firebase initialized with project ID',
                app: firebaseApp,
                firestore: firestore
            };
        }

        // Method 3: Try default initialization
        try {
            firebaseApp = admin.initializeApp();
            firestore = admin.firestore();
            isInitialized = true;
            
            console.log('✅ Firebase Admin initialized (default credentials)');
            return {
                success: true,
                message: 'Firebase initialized with default credentials',
                app: firebaseApp,
                firestore: firestore
            };
        } catch (defaultError) {
            console.warn('⚠️ Firebase default initialization failed:', defaultError.message);
        }

        // If all methods fail
        console.warn('⚠️ Warning: Firebase credentials not found. Real-time alerts will be disabled.');
        return {
            success: false,
            message: 'Firebase credentials not found',
            app: null,
            firestore: null
        };

    } catch (error) {
        console.error('❌ Error initializing Firebase:', error.message);
        console.warn('⚠️ Real-time alerts will be disabled');
        return {
            success: false,
            message: error.message,
            app: null,
            firestore: null,
            error: error
        };
    }
}

/**
 * Get Firebase App instance
 * @returns {FirebaseApp|null}
 */
function getFirebaseApp() {
    if (!isInitialized) {
        const result = initializeFirebase();
        return result.app;
    }
    return firebaseApp;
}

/**
 * Get Firestore instance
 * @returns {Firestore|null}
 */
function getFirestore() {
    if (!isInitialized) {
        const result = initializeFirebase();
        return result.firestore;
    }
    return firestore;
}

/**
 * Check if Firebase is initialized
 * @returns {boolean}
 */
function isFirebaseReady() {
    return isInitialized && firebaseApp !== null && firestore !== null;
}

/**
 * Save alert to Firestore
 * @param {Object} alertData - Alert data object
 * @param {string} collection - Collection name (default: 'alerts')
 * @returns {Promise<Object>}
 */
async function saveAlert(alertData, collection = 'alerts') {
    const db = getFirestore();
    if (!db) {
        throw new Error('Firestore not initialized');
    }

    try {
        const alertRef = await db.collection(collection).add({
            ...alertData,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
        });
        
        return {
            success: true,
            id: alertRef.id,
            message: 'Alert saved successfully'
        };
    } catch (error) {
        console.error('Error saving alert to Firestore:', error);
        throw error;
    }
}

/**
 * Get alerts from Firestore
 * @param {number} limit - Number of alerts to retrieve
 * @param {string} collection - Collection name (default: 'alerts')
 * @returns {Promise<Array>}
 */
async function getAlerts(limit = 10, collection = 'alerts') {
    const db = getFirestore();
    if (!db) {
        throw new Error('Firestore not initialized');
    }

    try {
        const snapshot = await db.collection(collection)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        const alerts = [];
        snapshot.forEach(doc => {
            alerts.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return alerts;
    } catch (error) {
        console.error('Error getting alerts from Firestore:', error);
        throw error;
    }
}

module.exports = {
    initializeFirebase,
    getFirebaseApp,
    getFirestore,
    isFirebaseReady,
    saveAlert,
    getAlerts
};

