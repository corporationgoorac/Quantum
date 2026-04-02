const express = require('express'); // 🔧 FIXED: Capital 'Const' changed to lowercase 'const' 
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin'); // <-- UNCOMMENTED TO ALLOW DATABASE CONNECTION

// Load environment variables
dotenv.config();

// ============================================================================
// ⚠️ DISABLED: FIREBASE MASTER INITIALIZATION
// ============================================================================
// I have safely commented this out because it was causing your "Container loading" loop.
// Since you already initialize Firebase somewhere else, this duplicate initialization crashed the server.
/*
if (admin.apps.length === 0) {
    admin.initializeApp({
        // Note: If you authenticate using a specific serviceAccount.json file in your project, 
        // you'll need to require it above and replace applicationDefault() with: admin.credential.cert(serviceAccount)
        credential: admin.credential.applicationDefault(), 
        databaseURL: "https://goorac-quantum-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
}
*/

// ============================================================================
// 🔥 DISABLED: SAFE FIREBASE INITIALIZATION 
// ============================================================================
// Now that we fixed pushNotifications.js, we MUST comment this out too! 
// If we leave this here, it steals the initialization and causes a crash.
/*
if (admin.apps.length === 0) {
    admin.initializeApp({
        databaseURL: "https://goorac-quantum-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
}
*/

// Initialize the Master App
const app = express();

// Global Security & Parsing Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================================================================
// 1. IMPORT YOUR SEPARATE MODULES
// ============================================================================
const aiRoutes = require('./ai');
const visionRoutes = require('./visionScrapper'); 
const bitesScrapper = require('./bitesScrapper');
const pushNotifications = require('./pushNotifications');
const startScheduledPushes = require('./scheduledPush'); 
const startPulseVisionCleanup = require('./pulseAndVision'); // <-- INJECTED NEW MODULE
const shareRoutes = require('./share'); // <-- INJECTED SHARE MODULE

// ============================================================================
// 2. MOUNT YOUR ROUTERS
// ============================================================================
app.use('/api', aiRoutes); 
app.use('/api', visionRoutes);
app.use('/share', shareRoutes); // <-- MOUNTED ON /share

// ============================================================================
// 3. ATTACH YOUR DIRECT PLUGINS
// ============================================================================
bitesScrapper(app); 
pushNotifications(app); 

// ============================================================================
// 4. START YOUR BACKGROUND CRON JOBS
// ============================================================================
startScheduledPushes(); 
startPulseVisionCleanup(); // <-- INJECTED CRON START

// ============================================================================
// 5. GLOBAL HEALTH CHECK & SERVER START
// ============================================================================
app.get('/', (req, res) => {
    res.send('🚀 Quantum Master Backend is ONLINE and running all services (AI, Vision, Bites, Push, Share)!');
});

// 🔧 FIXED: Hugging Face Spaces specifically route external traffic to port 7860.
const PORT = process.env.PORT || 7860; 

app.listen(PORT, '0.0.0.0', () => { // 🔧 FIXED: Added '0.0.0.0' to ensure Hugging Face Docker binds correctly
    console.log(`🚀 Quantum Master Server is running and listening on port ${PORT}`);
    console.log(`✅ All modules loaded successfully.`);
});
