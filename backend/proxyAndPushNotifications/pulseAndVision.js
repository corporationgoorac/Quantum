const admin = require('firebase-admin');
const cron = require('node-cron');

/**
 * Helper function to securely and efficiently delete entire Firestore collections
 * using batch processing, as recommended by the Firebase Admin SDK documentation.
 */
async function deleteCollection(db, collectionPath, batchSize = 100) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();
    const batchSize = snapshot.size;
    
    if (batchSize === 0) {
        resolve(); // Nothing left to delete
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    
    await batch.commit();

    // Recurse on the next process tick to avoid stack overflow
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

module.exports = function startPulseVisionCleanup() {
    console.log("🕒 Scheduled Job: Pulse & Vision Room deep-clean scheduled for 2:00 PM IST everyday.");

    // Cron expression '0 14 * * *' means minute 0, hour 14 (2:00 PM), every day
    cron.schedule('0 14 * * *', async () => {
        console.log("🧹 [CRON] 2:00 PM IST - Starting daily deep-clean of Pulse and Vision data...");

        try {
            // Ensure Firebase Admin is initialized in your master file first
            const db = admin.firestore();
            const rtdb = admin.database();

            // ====================================================================
            // 1. DELETE FIRESTORE COLLECTIONS (Rooms & Settings)
            // ====================================================================
            console.log("   -> Wiping [pulse_rooms] from Firestore...");
            await deleteCollection(db, 'pulse_rooms', 100);
            
            console.log("   -> Wiping [vision_rooms] from Firestore...");
            await deleteCollection(db, 'vision_rooms', 100);


            // ====================================================================
            // 2. DELETE REALTIME DATABASE NODES (Chats, Typing, & Presence)
            // ====================================================================
            console.log("   -> Wiping Realtime Database Chats & Presence...");
            
            // Delete the massive chat history nodes
            await rtdb.ref('pulse_chat').remove();
            await rtdb.ref('vision_chat').remove();
            
            // Wipe presence to fix any ghost users stuck online
            await rtdb.ref('pulse_presence').remove();
            await rtdb.ref('vision_presence').remove();

            // Safely iterate and delete ONLY Pulse and Vision typing indicators
            // (Leaves standard direct message typing indicators perfectly intact)
            const typingRef = rtdb.ref('typing');
            const typingSnap = await typingRef.once('value');
            const typingUpdates = {};
            
            typingSnap.forEach(child => {
                if (child.key.startsWith('pulse_') || child.key.startsWith('vision_')) {
                    typingUpdates[child.key] = null; // Setting to null deletes the node
                }
            });
            
            if (Object.keys(typingUpdates).length > 0) {
                await typingRef.update(typingUpdates);
            }

            console.log("✅ [CRON] Daily Pulse & Vision deep-clean completed successfully.");

        } catch (error) {
            console.error("❌ [CRON] Fatal error during daily cleanup:", error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata" // Forces the cron job to strictly follow Indian Standard Time
    });
};
