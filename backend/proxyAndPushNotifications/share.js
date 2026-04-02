const express = require('express');
const multer = require('multer');
const crypto = require('crypto'); // Built-in Node.js module for unique IDs

const router = express.Router();

// ============================================================================
// ⚙️ SYSTEM CONFIGURATION
// ============================================================================
// Configure Multer to process files entirely in RAM (MemoryStorage)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 250 * 1024 * 1024 } // 250MB limit to protect server RAM
});

// The RAM Buffer: This Map holds the files temporarily
const tempStore = new Map();

// ============================================================================
// 📥 ROUTE 1: THE RECEIVER (Catches the OS Share)
// ============================================================================
// We use upload.array() instead of single() because some Android devices 
// randomly send multiple files under the 'shared_files' key.
router.post('/receiver', upload.array('shared_files', 10), (req, res) => {
    try {
        // Extract raw text intent data sent by the OS
        const title = req.body.title || '';
        const text = req.body.text || '';
        const url = req.body.url || '';

        // Build the redirect query parameters
        let redirectParams = new URLSearchParams();
        if (title) redirectParams.append('title', title);
        if (text) redirectParams.append('text', text);
        if (url) redirectParams.append('url', url);

        // Process the file if one was attached
        if (req.files && req.files.length > 0) {
            const file = req.files[0]; // We only process the primary file for now
            const tempId = crypto.randomUUID();

            // Store the raw binary and metadata in RAM
            tempStore.set(tempId, {
                buffer: file.buffer,
                mimetype: file.mimetype,
                originalname: file.originalname,
                size: file.size,
                expiry: Date.now() + (5 * 60 * 1000) // Expires in 5 minutes
            });

            redirectParams.append('tempId', tempId);
        }

        // Redirect the user back to the PWA UI on GitHub Pages/Goorac domain. 
        // ⚠️ STATUS 303 IS CRITICAL: It forces the browser to change the POST to a GET.
        const redirectUrl = `https://www.goorac.biz/share.html?${redirectParams.toString()}`;
        res.redirect(303, redirectUrl);

    } catch (error) {
        console.error("❌ [SHARE] Receiver Error:", error);
        res.redirect(303, 'https://www.goorac.biz/share.html?error=upload_failed');
    }
});

// ============================================================================
// 📤 ROUTE 2: THE PROVIDER (Serves the file to your frontend)
// ============================================================================
router.get('/preview/:tempId', (req, res) => {
    const tempId = req.params.tempId;
    const fileData = tempStore.get(tempId);

    if (!fileData) {
        return res.status(404).send('File expired or not found in RAM');
    }

    // Set custom headers so the frontend can reconstruct the exact File object
    res.set('x-original-filename', fileData.originalname);
    res.set('Content-Type', fileData.mimetype);
    res.set('Content-Length', fileData.size);
    
    // Send the raw binary buffer directly
    res.send(fileData.buffer);

    // 🧹 MEMORY OPTIMIZATION: Delete the file from RAM instantly after it is fetched!
    // Since the frontend loads it into an Object URL, the server doesn't need to hold it anymore.
    tempStore.delete(tempId);
});

// ============================================================================
// 🛡️ MEMORY LEAK GUARD (Cron)
// ============================================================================
// Just in case a user closes the app during the redirect and never fetches the preview,
// this loop runs every 60 seconds and wipes expired files from the server's memory.
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of tempStore.entries()) {
        if (value.expiry < now) {
            tempStore.delete(key);
            console.log(`🧹 [SHARE] Cleared expired temp file from RAM: ${key}`);
        }
    }
}, 60000);

module.exports = router;
