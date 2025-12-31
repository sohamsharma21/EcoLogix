/**
 * Vehicle Overload Detection System - Main JavaScript
 * Handles form submission, API calls, UI updates, and tab management
 */

// ============================================
// Configuration & Constants
// ============================================
const CONFIG = {
    API_URL: 'http://localhost:5000/predict',
    STORAGE_KEY: 'vehicleDetectionHistory',
    MAX_HISTORY: 10,
    LOADING_TIMEOUT: 30000 // 30 seconds
};

// ============================================
// Utility Functions
// ============================================

/**
 * Logs messages to console with timestamp
 */
function log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data || '');
}

/**
 * Shows loading spinner
 */
function showLoadingSpinner() {
    const submitButton = document.querySelector('#detectionForm button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...';
    submitButton.dataset.originalText = originalText;
    log('Loading spinner shown');
}

/**
 * Hides loading spinner
 */
function hideLoadingSpinner() {
    const submitButton = document.querySelector('#detectionForm button[type="submit"]');
    submitButton.disabled = false;
    submitButton.innerHTML = submitButton.dataset.originalText || 'Check Overload Status';
    log('Loading spinner hidden');
}

/**
 * Creates and shows error message
 */
function showError(message) {
    log('Error shown:', message);
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <h4 class="alert-heading">Error!</h4>
            <p>${message}</p>
        </div>
    `;
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validates all form inputs
 */
function validateForm(formData) {
    log('Validating form data', formData);
    
    const errors = [];
    
    // Registration number validation
    if (!formData.registrationNumber || formData.registrationNumber.trim() === '') {
        errors.push('Vehicle Registration Number is required');
    }
    
    // Current load validation
    if (formData.currentLoad === null || formData.currentLoad === undefined || formData.currentLoad < 0) {
        errors.push('Current Load must be a positive number');
    }
    
    // Max load validation
    if (formData.maxLoad === null || formData.maxLoad === undefined || formData.maxLoad <= 0) {
        errors.push('Maximum Load Capacity must be greater than 0');
    }
    
    // Check if current load exceeds max load significantly (warning, not error)
    if (formData.currentLoad > formData.maxLoad * 2) {
        log('Warning: Current load is more than double the max capacity', {
            currentLoad: formData.currentLoad,
            maxLoad: formData.maxLoad
        });
    }
    
    // Suspension health validation (0-100)
    if (formData.suspension < 0 || formData.suspension > 100) {
        errors.push('Suspension Health must be between 0 and 100');
    }
    
    // Tire pressure validation (reasonable range: 20-50 PSI)
    if (formData.tirePressure < 20 || formData.tirePressure > 50) {
        errors.push('Tire Pressure should be between 20 and 50 PSI');
    }
    
    // Vehicle weight validation
    if (formData.weight === null || formData.weight === undefined || formData.weight <= 0) {
        errors.push('Vehicle Weight must be a positive number');
    }
    
    // Speed validation (reasonable range: 0-150 km/h)
    if (formData.speed < 0 || formData.speed > 150) {
        errors.push('Current Speed should be between 0 and 150 km/h');
    }
    
    if (errors.length > 0) {
        log('Validation errors:', errors);
        return {
            isValid: false,
            errors: errors
        };
    }
    
    log('Form validation passed');
    return {
        isValid: true,
        errors: []
    };
}

// ============================================
// API Functions
// ============================================

/**
 * Makes POST request to backend API
 */
async function predictOverload(formData) {
    log('Making API request to:', CONFIG.API_URL);
    log('Request payload:', formData);
    
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        log('API response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        log('API response received:', data);
        
        return {
            success: true,
            data: data
        };
    } catch (error) {
        log('API request failed:', error);
        
        // Handle different types of errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return {
                success: false,
                error: 'Network error: Unable to connect to the server. Please check if the backend is running.'
            };
        }
        
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        };
    }
}

// ============================================
// UI Update Functions
// ============================================

/**
 * Updates results section based on prediction response
 */
function updateResults(predictionData, formData) {
    log('Updating results section with prediction data:', predictionData);
    
    const resultsSection = document.getElementById('resultsSection');
    const {
        probability,
        status,
        riskLevel,
        excessLoad,
        confidence
    } = predictionData;
    
    // Calculate load ratio
    const loadRatio = ((formData.currentLoad / formData.maxLoad) * 100).toFixed(2);
    
    // Determine status badge styling
    let statusClass, statusText, resultClass;
    
    if (status === 'critical' || riskLevel === 'Critical') {
        statusClass = 'status-danger';
        statusText = '🚨 CRITICAL OVERLOAD';
        resultClass = 'overload';
    } else if (status === 'warning' || riskLevel === 'High' || riskLevel === 'Moderate') {
        statusClass = 'status-warning';
        statusText = status === 'warning' ? '⚠️ HIGH RISK' : '⚠️ MODERATE RISK';
        resultClass = 'warning';
    } else {
        statusClass = 'status-safe';
        statusText = '✅ SAFE';
        resultClass = 'normal';
    }
    
    // Generate recommendation text
    const recommendation = generateRecommendation(predictionData, formData, loadRatio);
    
    // Update status badge
    const statusBadge = document.getElementById('statusBadge');
    statusBadge.textContent = statusText;
    statusBadge.className = `status-badge ${statusClass}`;
    
    // Update metrics
    document.getElementById('loadRatio').textContent = `${loadRatio}%`;
    document.getElementById('riskLevel').textContent = riskLevel || status || 'Unknown';
    document.getElementById('predictionScore').textContent = `${(confidence || probability * 100).toFixed(1)}%`;
    document.getElementById('resultVehicleReg').textContent = formData.registrationNumber;
    document.getElementById('recommendation').textContent = recommendation;
    
    // Update results section class for styling
    resultsSection.className = `results-section ${resultClass}`;
    
    // Show results section with animation
    resultsSection.style.display = 'block';
    resultsSection.style.opacity = '0';
    resultsSection.style.transform = 'translateY(20px)';
    
    // Animate into view
    setTimeout(() => {
        resultsSection.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        resultsSection.style.opacity = '1';
        resultsSection.style.transform = 'translateY(0)';
    }, 10);
    
    // Scroll to results
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    
    log('Results section updated successfully');
}

/**
 * Generates recommendation text based on prediction
 */
function generateRecommendation(predictionData, formData, loadRatio) {
    const { status, riskLevel, excessLoad, confidence } = predictionData;
    
    if (status === 'critical' || riskLevel === 'Critical') {
        return `IMMEDIATE ACTION REQUIRED: Vehicle is critically overloaded (${loadRatio}% of capacity). ${excessLoad ? `Excess load: ${excessLoad.toFixed(2)} tons. ` : ''}Stop immediately and reduce load. This poses severe safety risks. Confidence: ${(confidence * 100).toFixed(1)}%.`;
    } else if (status === 'warning' || riskLevel === 'High') {
        return `WARNING: Vehicle is overloaded beyond capacity (${loadRatio}% of capacity). ${excessLoad ? `Excess load: ${excessLoad.toFixed(2)} tons. ` : ''}Reduce load immediately before continuing. High risk of tire failure and suspension damage. Confidence: ${(confidence * 100).toFixed(1)}%.`;
    } else if (riskLevel === 'Moderate') {
        return `CAUTION: Vehicle is approaching overload limits (${loadRatio}% of capacity). Consider reducing load if possible. Monitor tire pressure and suspension health closely. Confidence: ${(confidence * 100).toFixed(1)}%.`;
    } else {
        return `Vehicle is operating within safe parameters (${loadRatio}% of capacity). Continue monitoring load and vehicle conditions regularly. Confidence: ${(confidence * 100).toFixed(1)}%.`;
    }
}

// ============================================
// LocalStorage Functions
// ============================================

/**
 * Saves search to localStorage
 */
function saveToHistory(formData, predictionData) {
    try {
        let history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
        
        const historyItem = {
            timestamp: new Date().toISOString(),
            formData: formData,
            prediction: predictionData
        };
        
        // Add to beginning of array
        history.unshift(historyItem);
        
        // Keep only last MAX_HISTORY items
        if (history.length > CONFIG.MAX_HISTORY) {
            history = history.slice(0, CONFIG.MAX_HISTORY);
        }
        
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history));
        log('Search saved to history. Total items:', history.length);
        
        return history;
    } catch (error) {
        log('Error saving to history:', error);
        return [];
    }
}

/**
 * Gets search history from localStorage
 */
function getHistory() {
    try {
        const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
        log('Retrieved history. Items:', history.length);
        return history;
    } catch (error) {
        log('Error retrieving history:', error);
        return [];
    }
}

// ============================================
// Form Handler
// ============================================

/**
 * Handles form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    log('Form submitted');
    
    // Get form values
    const formData = {
        registrationNumber: document.getElementById('vehicleReg').value.trim(),
        currentLoad: parseFloat(document.getElementById('currentLoad').value),
        maxLoad: parseFloat(document.getElementById('maxCapacity').value),
        suspension: parseFloat(document.getElementById('suspensionHealth').value),
        tirePressure: parseFloat(document.getElementById('tirePressure').value),
        weight: parseFloat(document.getElementById('vehicleWeight').value),
        speed: parseFloat(document.getElementById('currentSpeed').value)
    };
    
    log('Form data extracted:', formData);
    
    // Validate form
    const validation = validateForm(formData);
    if (!validation.isValid) {
        showError(validation.errors.join('<br>'));
        hideLoadingSpinner();
        return;
    }
    
    // Show loading spinner
    showLoadingSpinner();
    
    // Prepare API request payload
    const apiPayload = {
        currentLoad: formData.currentLoad,
        maxLoad: formData.maxLoad,
        suspension: formData.suspension,
        tirePressure: formData.tirePressure,
        weight: formData.weight,
        speed: formData.speed,
        registrationNumber: formData.registrationNumber
    };
    
    // Set timeout for API call
    const timeoutId = setTimeout(() => {
        hideLoadingSpinner();
        showError('Request timeout: The server took too long to respond. Please try again.');
        log('API request timeout');
    }, CONFIG.LOADING_TIMEOUT);
    
    try {
        // Make API call
        const result = await predictOverload(apiPayload);
        
        clearTimeout(timeoutId);
        hideLoadingSpinner();
        
        if (result.success) {
            // Save to history
            saveToHistory(formData, result.data);
            
            // Update UI with results
            updateResults(result.data, formData);
        } else {
            // Show error
            showError(result.error);
        }
    } catch (error) {
        clearTimeout(timeoutId);
        hideLoadingSpinner();
        log('Unexpected error in form submission:', error);
        showError('An unexpected error occurred. Please try again.');
    }
}

// ============================================
// Tab Management
// ============================================

/**
 * Initializes Analytics tab with charts
 */
function initializeAnalyticsTab() {
    log('Initializing Analytics tab');
    
    const analyticsTab = document.getElementById('analytics-tab');
    let violationsChart = null;
    
    analyticsTab.addEventListener('shown.bs.tab', function() {
        log('Analytics tab shown');
        
        if (violationsChart) {
            log('Chart already initialized, skipping');
            return;
        }
        
        const ctx = document.getElementById('violationsChart');
        if (!ctx) {
            log('Chart canvas not found');
            return;
        }
        
        violationsChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Overload Violations',
                    data: [320, 290, 310, 280, 265, 275, 255, 240, 250, 235, 245, 247],
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'High Risk Cases',
                    data: [145, 130, 140, 125, 120, 115, 110, 105, 108, 102, 95, 89],
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Monthly Overload Violations Trend',
                        font: {
                            size: 18,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Violations'
                        }
                    }
                }
            }
        });
        
        log('Analytics chart initialized');
    });
}

/**
 * Initializes Live Alerts tab
 */
function initializeAlertsTab() {
    log('Initializing Live Alerts tab');
    
    const alertsTab = document.getElementById('alerts-tab');
    
    alertsTab.addEventListener('shown.bs.tab', function() {
        log('Live Alerts tab shown');
        // Mock data is already in HTML, but we could fetch real data here
        // For now, just log that the tab was opened
    });
}

/**
 * Initializes About tab
 */
function initializeAboutTab() {
    log('Initializing About tab');
    
    const aboutTab = document.getElementById('about-tab');
    
    aboutTab.addEventListener('shown.bs.tab', function() {
        log('About tab shown');
    });
}

/**
 * Initializes Detection tab (default)
 */
function initializeDetectionTab() {
    log('Initializing Detection tab');
    // Detection tab is the default, form handler is set up separately
}

// ============================================
// Initialization
// ============================================

/**
 * Initializes all components when DOM is ready
 */
function initialize() {
    log('Initializing application');
    
    // Initialize form handler
    const detectionForm = document.getElementById('detectionForm');
    if (detectionForm) {
        detectionForm.addEventListener('submit', handleFormSubmit);
        log('Form handler attached');
    } else {
        log('Warning: Detection form not found');
    }
    
    // Initialize suspension health slider
    const suspensionHealth = document.getElementById('suspensionHealth');
    const suspensionValue = document.getElementById('suspensionValue');
    
    if (suspensionHealth && suspensionValue) {
        suspensionHealth.addEventListener('input', function() {
            suspensionValue.textContent = this.value;
            log('Suspension health updated:', this.value);
        });
        log('Suspension slider handler attached');
    }
    
    // Initialize tabs
    initializeDetectionTab();
    initializeAnalyticsTab();
    initializeAlertsTab();
    initializeAboutTab();
    
    // Log tab switching
    const allTabs = document.querySelectorAll('[data-bs-toggle="tab"]');
    allTabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            log('Tab switched to:', event.target.textContent.trim());
        });
    });
    
    // Log history on load
    const history = getHistory();
    log('Application initialized. History items:', history.length);
}

// ============================================
// Event Listeners
// ============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // DOM is already ready
    initialize();
}

// Export functions for testing/debugging (if needed)
if (typeof window !== 'undefined') {
    window.VehicleDetection = {
        validateForm,
        predictOverload,
        updateResults,
        saveToHistory,
        getHistory,
        log
    };
}

