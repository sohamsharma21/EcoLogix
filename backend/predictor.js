/**
 * Vehicle Overload Detection System - Predictor Module
 * Contains prediction logic, license plate detection, and alert functions
 */

const { ImageAnnotatorClient } = require('@google-cloud/vision');
const firebaseService = require('./services/firebaseService');
const admin = require('firebase-admin');

// Initialize Google Cloud Vision API client
let visionClient = null;
try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        visionClient = new ImageAnnotatorClient({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
    } else if (process.env.GOOGLE_CLOUD_PROJECT) {
        visionClient = new ImageAnnotatorClient();
    }
} catch (error) {
    console.warn('Google Cloud Vision API client not initialized:', error.message);
}

/**
 * Predicts vehicle overload status based on vehicle data
 * 
 * @param {Object} vehicleData - Vehicle data object
 * @param {number} vehicleData.currentLoad - Current load in tons
 * @param {number} vehicleData.maxLoad - Maximum load capacity in tons
 * @param {number} vehicleData.suspension - Suspension health (0-100)
 * @param {number} vehicleData.tirePressure - Tire pressure in PSI (0-50)
 * @param {number} vehicleData.weight - Vehicle weight in kg
 * @param {number} vehicleData.speed - Current speed in km/h
 * @returns {Object} Prediction result with probability, status, riskLevel, etc.
 */
function predictOverload(vehicleData) {
    const {
        currentLoad,
        maxLoad,
        suspension,
        tirePressure,
        weight,
        speed
    } = vehicleData;

    // Step 1: Calculate load ratio
    // Load ratio indicates how much of the maximum capacity is being used
    const loadRatio = currentLoad / maxLoad;

    // Step 2: Initialize base score
    // If load ratio exceeds 1.0 (overloaded), start with base score of 50
    let score = 0;
    if (loadRatio > 1.0) {
        score = 50;
        console.log(`Base score set to 50 (load ratio: ${loadRatio.toFixed(2)})`);
    }

    // Step 3: Add suspension health penalty
    // If suspension is below 80, add penalty points
    // Formula: (80 - suspension) * 0.3
    // This means worse suspension health adds more points to the risk score
    if (suspension < 80) {
        const suspensionPenalty = (80 - suspension) * 0.3;
        score += suspensionPenalty;
        console.log(`Suspension penalty added: ${suspensionPenalty.toFixed(2)} (suspension: ${suspension})`);
    }

    // Step 4: Add tire pressure penalty
    // Normal tire pressure range is 28-35 PSI
    // If outside this range, add penalty points based on deviation
    const normalPressureMin = 28;
    const normalPressureMax = 35;
    
    if (tirePressure < normalPressureMin) {
        // Under-inflated: more dangerous, higher penalty
        const pressurePenalty = (normalPressureMin - tirePressure) * 2;
        score += pressurePenalty;
        console.log(`Tire pressure penalty (under-inflated): ${pressurePenalty.toFixed(2)} (pressure: ${tirePressure} PSI)`);
    } else if (tirePressure > normalPressureMax) {
        // Over-inflated: less dangerous but still risky
        const pressurePenalty = (tirePressure - normalPressureMax) * 1.5;
        score += pressurePenalty;
        console.log(`Tire pressure penalty (over-inflated): ${pressurePenalty.toFixed(2)} (pressure: ${tirePressure} PSI)`);
    }

    // Step 5: Add speed penalty
    // High speed with overload increases instability risk
    // If speed exceeds 80 km/h, add 5 points
    if (speed > 80) {
        score += 5;
        console.log(`Speed penalty added: 5 points (speed: ${speed} km/h)`);
    }

    // Step 6: Cap the final score at 100
    // Ensure score doesn't exceed maximum value
    score = Math.min(100, score);
    console.log(`Final risk score: ${score.toFixed(2)}`);

    // Step 7: Calculate probability (0-1 scale)
    // Convert score to probability where 100 = 1.0
    const probability = score / 100;

    // Step 8: Determine status based on score
    // - score > 70: OVERLOAD (critical, red)
    // - score 40-70: WARNING (moderate, orange)
    // - score < 40: NORMAL (safe, green)
    let status, riskLevel;
    
    if (score > 70) {
        status = 'OVERLOAD';
        riskLevel = 'Critical';
    } else if (score >= 40) {
        status = 'WARNING';
        riskLevel = score >= 55 ? 'High' : 'Moderate';
    } else {
        status = 'NORMAL';
        riskLevel = 'Safe';
    }

    // Step 9: Calculate excess load
    // Excess load is the amount by which current load exceeds maximum capacity
    const excessLoad = loadRatio > 1.0 ? (currentLoad - maxLoad) : 0;

    // Step 10: Generate recommendation based on status
    let recommendation;
    if (status === 'OVERLOAD') {
        recommendation = `CRITICAL: Vehicle is severely overloaded (${(loadRatio * 100).toFixed(1)}% of capacity). ` +
            `Excess load: ${excessLoad.toFixed(2)} tons. ` +
            `IMMEDIATE ACTION REQUIRED: Stop the vehicle immediately and reduce load. ` +
            `This poses severe safety risks including tire failure, suspension damage, and loss of control. ` +
            `Contact authorities if necessary.`;
    } else if (status === 'WARNING') {
        recommendation = `WARNING: Vehicle is approaching or exceeding safe load limits (${(loadRatio * 100).toFixed(1)}% of capacity). ` +
            `${excessLoad > 0 ? `Excess load: ${excessLoad.toFixed(2)} tons. ` : ''}` +
            `Reduce load before continuing. Monitor tire pressure (${tirePressure} PSI) and suspension health (${suspension}%). ` +
            `High speed (${speed} km/h) increases instability risk.`;
    } else {
        recommendation = `NORMAL: Vehicle is operating within safe parameters (${(loadRatio * 100).toFixed(1)}% of capacity). ` +
            `Continue monitoring load, tire pressure (${tirePressure} PSI), and suspension health (${suspension}%). ` +
            `Maintain safe driving practices.`;
    }

    // Step 11: Return prediction result
    // Confidence is set to 0.92 (92%) as per requirement
    return {
        probability: parseFloat(probability.toFixed(3)),
        status: status,
        riskLevel: riskLevel,
        excessLoad: parseFloat(excessLoad.toFixed(2)),
        confidence: 0.92,
        recommendation: recommendation,
        loadRatio: parseFloat((loadRatio * 100).toFixed(2)),
        score: parseFloat(score.toFixed(2))
    };
}

/**
 * Detects vehicle license plate from image using Google Cloud Vision API
 * 
 * @param {Buffer|string} imageData - Image buffer or base64 string
 * @returns {Promise<Object>} Object with detected plate number and confidence
 */
async function detectLicensePlate(imageData) {
    // Check if Vision API client is available
    if (!visionClient) {
        throw new Error('Google Cloud Vision API client is not initialized');
    }

    try {
        // Convert base64 string to buffer if needed
        let imageBuffer;
        if (typeof imageData === 'string') {
            // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
            const base64Data = imageData.includes(',') 
                ? imageData.split(',')[1] 
                : imageData;
            imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
            imageBuffer = imageData;
        }

        // Step 1: Call Google Cloud Vision API TextDetection feature
        // This will detect all text in the image
        const [result] = await visionClient.textDetection({
            image: {
                content: imageBuffer
            }
        });

        // Step 2: Extract text annotations from the result
        const detections = result.textAnnotations;
        
        if (!detections || detections.length === 0) {
            return {
                success: false,
                plateNumber: null,
                confidence: 0,
                message: 'No text detected in image'
            };
        }

        // Step 3: Get full text from first detection (contains all detected text)
        const fullText = detections[0].description || '';

        // Step 4: Extract registration number using regex pattern
        // Pattern: [A-Z]{2}\d{2}[A-Z]{2}\d{4}
        // Example: MH12AB1234, DL01CD9876, KA03EF4567
        // Format: 2 letters (state code) + 2 digits (district) + 2 letters + 4 digits
        const registrationPattern = /[A-Z]{2}\d{2}[A-Z]{2}\d{4}/g;
        const matches = fullText.match(registrationPattern);

        // Step 5: Get confidence from first detection
        // Vision API provides confidence score for text detection
        const confidence = detections[0].confidence || 0;

        // Step 6: Return detected plate number
        if (matches && matches.length > 0) {
            // Return the first match (most likely to be the license plate)
            return {
                success: true,
                plateNumber: matches[0],
                allMatches: matches,
                confidence: parseFloat(confidence.toFixed(3)),
                fullText: fullText.trim()
            };
        } else {
            // No matching pattern found, return full text for manual review
            return {
                success: false,
                plateNumber: null,
                confidence: parseFloat(confidence.toFixed(3)),
                fullText: fullText.trim(),
                message: 'License plate pattern not found in detected text'
            };
        }
    } catch (error) {
        console.error('Error detecting license plate:', error);
        throw new Error(`License plate detection failed: ${error.message}`);
    }
}

/**
 * Sends alert to Firebase and police dashboard if vehicle is overloaded
 * 
 * @param {Object} vehicleData - Vehicle data object
 * @param {string} vehicleData.registrationNumber - Vehicle registration number
 * @param {number} vehicleData.currentLoad - Current load in tons
 * @param {number} vehicleData.maxLoad - Maximum load capacity in tons
 * @param {Object} prediction - Prediction result from predictOverload
 * @param {string} prediction.status - Status (OVERLOAD/WARNING/NORMAL)
 * @param {string} location - Optional location string
 * @returns {Promise<Object>} Result of alert operation
 */
async function sendAlert(vehicleData, prediction, location = null) {
    // Step 1: Check if status is OVERLOAD
    // Only send alerts for critical overload situations
    if (prediction.status !== 'OVERLOAD') {
        return {
            success: false,
            message: 'Alert not sent: Vehicle status is not OVERLOAD',
            status: prediction.status
        };
    }

    // Step 2: Check if Firebase is available
    const firestore = firebaseService.getFirestore();
    if (!firestore) {
        console.warn('Firebase not available, alert not sent');
        return {
            success: false,
            message: 'Firebase not initialized',
            status: prediction.status
        };
    }

    try {
        // Step 3: Prepare alert data
        // Include all relevant vehicle and prediction information
        const alertData = {
            registrationNumber: vehicleData.registrationNumber || 'Unknown',
            currentLoad: vehicleData.currentLoad,
            maxLoad: vehicleData.maxLoad,
            loadRatio: prediction.loadRatio,
            excessLoad: prediction.excessLoad,
            riskLevel: prediction.riskLevel,
            status: prediction.status,
            probability: prediction.probability,
            score: prediction.score,
            suspension: vehicleData.suspension,
            tirePressure: vehicleData.tirePressure,
            speed: vehicleData.speed,
            weight: vehicleData.weight,
            location: location || 'Unknown',
            recommendation: prediction.recommendation,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString(),
            alertType: 'OVERLOAD_DETECTION',
            severity: 'CRITICAL'
        };

        // Step 4: Store alert data in Firebase Firestore
        // Save to 'alerts' collection for real-time access
        const alertRef = await firestore.collection('alerts').add(alertData);
        console.log(`Alert stored in Firebase with ID: ${alertRef.id}`);

        // Step 5: Send notification to police dashboard
        // Create a separate document in 'notifications' collection for police dashboard
        const notificationData = {
            alertId: alertRef.id,
            registrationNumber: alertData.registrationNumber,
            loadRatio: alertData.loadRatio,
            excessLoad: alertData.excessLoad,
            location: alertData.location,
            riskLevel: alertData.riskLevel,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'PENDING', // PENDING, ACKNOWLEDGED, RESOLVED
            priority: 'HIGH',
            notificationType: 'OVERLOAD_ALERT'
        };

        await firestore.collection('notifications').add(notificationData);
        console.log('Notification sent to police dashboard');

        // Step 6: Return success result
        return {
            success: true,
            alertId: alertRef.id,
            message: 'Alert sent successfully to Firebase and police dashboard',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error sending alert:', error);
        return {
            success: false,
            message: `Failed to send alert: ${error.message}`,
            error: error.message
        };
    }
}

// Export functions for use in other modules
module.exports = {
    predictOverload,
    detectLicensePlate,
    sendAlert
};

