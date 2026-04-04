const admin = require('firebase-admin');

// --- STRICT CACHES to prevent duplicate sends and reaction spam ---
// FIXED: Set to 0. Phone clock drift was causing users with slow clocks to be permanently blocked by this check!
const SERVER_START_TIME = 0; 
const processedMessages = new Set();
const processedNotifs = new Set();
const reactionThrottle = new Set(); // Specifically limits reaction spam

// --- PERFORMANCE CACHES (Ultra-Fast 24-Hour RAM Cache) ---
const userCache = new Map(); 

// --- ADVANCED: MEMORY LEAK GUARD ---
// Prevents the Node.js server from crashing due to heap overflow if the cache grows too large
setInterval(() => {
    if (userCache.size > 10000) {
        console.warn("⚠️ [MEMORY GUARD] Cache exceeded 10,000 users. Pruning old entries...");
        userCache.clear(); // Emergency flush to protect server RAM
    }
    if (processedMessages.size > 50000) processedMessages.clear();
    if (processedNotifs.size > 50000) processedNotifs.clear();
}, 86400000); // UPDATED: Now checks and cleans every 24 hours instead of 1 hour to save Firebase reads!

// --- ADVANCED: EXPONENTIAL BACKOFF RETRY SYSTEM (Upgraded to OneSignal) ---
// If the API throws a 429 (Rate Limit) or 503 (Server Error), this ensures the push isn't lost
async function publishWithRetry(targetUids, payloadData, maxRetries = 3) {
    const ONE_SIGNAL_APP_ID = "e8dd6176-1634-47df-8375-ba261c7de172";
    const ONE_SIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

    if (!ONE_SIGNAL_API_KEY) {
        console.error("❌ ONESIGNAL_API_KEY is missing in your server environment variables.");
        return;
    }

    // 🚨 BUG FIX: Ensure the tag never exceeds OneSignal's strict 64-byte limit
    const safeTag = payloadData.tag ? payloadData.tag.substring(0, 64) : "default";

    // 🚨 THE ULTIMATE FIX FOR APP BADGES & GROUPING
    // This unique ID forces Android/Chrome to keep the old message and stack the new one, which triggers the App Badge!
    const uniquePushId = safeTag + "_" + Date.now();

    const osPayload = {
        app_id: ONE_SIGNAL_APP_ID,
        // Uses the OneSignal 'login' alias to map to Firebase UIDs
        include_aliases: { external_id: targetUids }, 
        target_channel: "push",
        headings: { en: payloadData.title },
        contents: { en: payloadData.body },
        url: payloadData.deep_link,
        chrome_web_icon: payloadData.icon, // Web Icon
        large_icon: payloadData.icon, // Android Icon
        
        // --- STACKING & BADGES ENFORCEMENT ---
        android_group: safeTag, // Native Android Grouping
        android_group_message: { en: "You have $[notif_count] new notifications" },
        web_push_topic: uniquePushId, // STOPS Web Push from deleting old messages!
        
        thread_id: safeTag, // iOS grouping
        ios_badgeType: "Increase", // Forces iOS Badge
        ios_badgeCount: 1,

        ttl: payloadData.time_to_live || 172800, // Beats Doze Mode
        ios_sound: payloadData.sound === "ringtone.wav" ? "ringtone.wav" : "default",
        android_sound: payloadData.sound === "ringtone.wav" ? "ringtone" : "default",
        priority: 10
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch('https://onesignal.com/api/v1/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${ONE_SIGNAL_API_KEY}`
                },
                body: JSON.stringify(osPayload)
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status} - ${await response.text()}`);
            return; // Success, exit the retry loop
        } catch (error) {
            if (attempt === maxRetries) {
                console.error(`❌ [PUSH FAILED] after ${maxRetries} attempts for UIDs: ${targetUids}`, error);
                return; // Don't throw to avoid crashing the event listener
            }
            const delay = Math.pow(2, attempt) * 500; // 1s, 2s, 4s backoff
            console.warn(`⚠️ [PUSH RETRY] Attempt ${attempt} failed. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

// --- NEW FIX: Boot Phase Lock ---
// Prevents downloading and processing thousands of historical messages on server restart
let isBooting = true;
setTimeout(() => { 
    isBooting = false; 
    console.log("🚀 Quantum Boot Phase Complete. Live Listening Active."); 
}, 2000); // 2-second lock

module.exports = function(app) {
    // --- HEALTH CHECK ROUTES FOR UPTIME MONITORS ---
    // (Note: The '/' route is handled by the master server now, but '/ping' remains here for your monitors)
    app.get('/ping', (req, res) => {
      res.status(200).send('Pong! Push Server is awake.');
    });

    // 1. Initialize Firebase Admin SDK
    if (!admin.apps.length) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                // 👇 THIS IS THE ONLY LINE ADDED TO FIX THE DATABASE CRASH 👇
                databaseURL: "https://goorac-quantum-default-rtdb.asia-southeast1.firebasedatabase.app"
            });
            console.log("✅ Firebase Admin initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Firebase Admin.", error);
        }
    }

    const db = admin.firestore();
    const rdb = admin.database(); // <-- ADVANCED FIX: Added Realtime Database to catch frontend signaling!

    // --- BUG FIX: Cache Invalidator ---
    // Listens for user profile changes so the 24-hour cache doesn't show old names/photos
    db.collection('users').onSnapshot((snap) => {
        snap.docChanges().forEach(change => {
            if (change.type === 'modified') userCache.delete(change.doc.id);
        });
    });

    // ============================================================================
    // LISTENER 1: CHATS, GROUP CHATS, DIRECT REPLIES, AND REACTIONS
    // ============================================================================
    function startMessageListener() {
        console.log("🎧 Listening for Chat Messages, Group Chats & Reactions...");
        
        // 🚀 THE PERFECT COLD START FIX: Ignore the initial historical data payload
        let isFirstRun = true; 

        db.collectionGroup('messages').onSnapshot((snapshot) => {
            
            // Mathematically guarantees zero spam on reboot
            if (isFirstRun) {
                isFirstRun = false;
                return;
            }

            snapshot.docChanges().forEach(async (change) => {
                
                // STRICT FIX: Ignore all historical snapshot data during the first 2 seconds
                if (isBooting) return;

                // Handle both new messages AND modified messages (for reactions)
                if (change.type === 'added' || change.type === 'modified') {
                    const messageData = change.doc.data();
                    const docId = change.doc.id;
                    
                    // RELIABLE TIMESTAMP: Uses Firestore's un-hackable create/update time
                    let msgTime = SERVER_START_TIME;
                    if (change.doc.createTime) msgTime = change.doc.createTime.toMillis();
                    if (change.doc.updateTime && change.type === 'modified') msgTime = change.doc.updateTime.toMillis();

                    // FIXED: Increased to 24 hours (86400000ms) to completely fix the "stops working after a while" bug caused by phone clock drift
                    if (Date.now() - msgTime > 86400000) return;
                    if (msgTime <= SERVER_START_TIME) return; 

                    // -----------------------------------------------------------------
                    // A. HANDLE BRAND NEW MESSAGES
                    // -----------------------------------------------------------------
                    if (change.type === 'added') {
                        if (processedMessages.has(docId)) return;
                        processedMessages.add(docId);
                        setTimeout(() => processedMessages.delete(docId), 180000); 

                        try {
                            const senderUid = messageData.sender;
                            if (!senderUid) return; // Safety check to prevent server crashes

                            const chatRef = change.doc.ref.parent.parent;
                            const chatDocId = chatRef.id;
                            const chatDoc = await chatRef.get();
                            
                            // RACE CONDITION FIX: Do not rely solely on the document existing. 
                            // It might not be fully written yet by the frontend!
                            const chatData = chatDoc.exists ? chatDoc.data() : {};
                            const isGroup = chatData.isGroup === true;
                            
                            let targetUids = [];
                            
                            if (isGroup) {
                                // Group chats must read from participants array
                                targetUids = (chatData.participants || []).filter(uid => uid !== senderUid);
                            } else {
                                // 1-on-1 chats mathematically extract the target from the ID string instantly!
                                const extractedUids = chatDocId.split('_');
                                if (extractedUids.length === 2) {
                                    targetUids = [extractedUids[0] === senderUid ? extractedUids[1] : extractedUids[0]];
                                } else {
                                    targetUids = (chatData.participants || []).filter(uid => uid !== senderUid);
                                }
                            }

                            if (targetUids.length === 0) return; // Abort if no target found
                            
                            // HIGH-SPEED CACHE INJECTION (Upgraded to 24 Hours)
                            let senderData;
                            if (userCache.has(senderUid)) {
                                senderData = userCache.get(senderUid);
                            } else {
                                const senderDoc = await db.collection('users').doc(senderUid).get();
                                senderData = senderDoc.data() || {};
                                userCache.set(senderUid, senderData);
                                setTimeout(() => userCache.delete(senderUid), 86400000); // UPDATED: 24-hour TTL to save Firebase reads
                            }

                            let senderName = senderData.name || senderData.username || "Someone";
                            const senderPhoto = senderData.photoURL || "https://www.goorac.biz/icon.png";
                            const senderUsername = senderData.username || senderUid;

                            if (isGroup) senderName = `${senderName} in ${chatData.groupName || 'Group'}`;

                            let bodyText = messageData.text || "New message";
                            if (messageData.isHtml || messageData.isDropReply || messageData.replyToNote) bodyText = "💬 Replied to your post";
                            else if (messageData.isBite) bodyText = "🎬 Sent a Bite video";
                            else if (messageData.isGif) bodyText = "🎞️ Sent a GIF";
                            else if (messageData.imageUrl) bodyText = "📷 Sent an image";
                            else if (messageData.fileMeta?.type?.includes('audio')) bodyText = "🎵 Sent a voice message";
                            else if (messageData.fileUrl) bodyText = "📎 Sent an attachment";

                            // 🛡️ URI FIX: Safely encode parameters to prevent Crashes
                            const deepLink = isGroup 
                                ? `https://www.goorac.biz/groupChat.html?id=${encodeURIComponent(chatDocId)}` 
                                : `https://www.goorac.biz/chat.html?user=${encodeURIComponent(senderUsername)}`;

                            // --- PRODUCTION READY FOCUSED CHECK (ZERO DELAYS, ZERO EXTRA DB PINGS) ---
                            // Checks purely against memory data fetched above. Requires frontend to use batch writes!
                            if (messageData.seen === true || messageData.read === true) return; 
                            if (isGroup && chatData.unreadCount) {
                                targetUids = targetUids.filter(uid => chatData.unreadCount[uid] > 0);
                            }
                            if (targetUids.length === 0) return;

                            // SPEED OPTIMIZATION: Fire all target push notifications in parallel
                            // --- ADVANCED: Using Custom publishWithRetry wrapper and 48-Hour TTL (172800) ---
                            await Promise.all(targetUids.map(targetUid => 
                                publishWithRetry([targetUid], {
                                    title: senderName,
                                    body: bodyText,
                                    icon: senderPhoto,
                                    deep_link: deepLink,
                                    tag: chatDocId, // 🚨 ADVANCED JACKPOT FEATURE: Collapse ID
                                    time_to_live: 172800 // ADVANCED FIX: 48 Hours to beat Doze Mode
                                })
                            ));
                        } catch (error) { console.error("❌ Message Push Error:", error); }
                    }

                    // -----------------------------------------------------------------
                    // B. HANDLE MESSAGE REACTIONS (THROTTLED TO PREVENT SPAM)
                    // -----------------------------------------------------------------
                    if (change.type === 'modified' && messageData.reactions) {
                        try {
                            const messageOwner = messageData.sender; 
                            if (!messageOwner) return;

                            for (const [reactorUid, reactionData] of Object.entries(messageData.reactions)) {
                                
                                if (reactorUid === messageOwner) continue; // Don't notify self
                                if (!reactorUid) continue;

                                // STRICT THROTTLE: Prevents the "multiple notifications" bug
                                // Only allows 1 reaction notification per user, per message, every 10 seconds
                                const throttleKey = `throttle_${docId}_${reactorUid}`;
                                if (reactionThrottle.has(throttleKey)) continue;
                                
                                reactionThrottle.add(throttleKey);
                                setTimeout(() => reactionThrottle.delete(throttleKey), 10000); 

                                // FIXED: Increased drift tolerance to 24 hours to stop bugs on mobile
                                if (Date.now() - reactionData.timestamp > 86400000) continue;
                                if (reactionData.timestamp <= SERVER_START_TIME) continue;

                                // Cache key to permanently log this specific emoji reaction in memory
                                const reactionCacheKey = `reaction_${docId}_${reactorUid}_${reactionData.emoji}`;
                                if (processedMessages.has(reactionCacheKey)) continue;
                                processedMessages.add(reactionCacheKey);
                                setTimeout(() => processedMessages.delete(reactionCacheKey), 180000);

                                const chatRef = change.doc.ref.parent.parent;
                                const chatDocId = chatRef.id;
                                const chatDoc = await chatRef.get();
                                
                                // Safe fetching of group data
                                const chatData = chatDoc.exists ? chatDoc.data() : {};
                                const isGroup = chatData.isGroup === true;

                                // HIGH-SPEED CACHE INJECTION (Upgraded to 24 Hours)
                                let reactorInfo;
                                if (userCache.has(reactorUid)) {
                                    reactorInfo = userCache.get(reactorUid);
                                } else {
                                    const reactorDoc = await db.collection('users').doc(reactorUid).get();
                                    reactorInfo = reactorDoc.data() || {};
                                    userCache.set(reactorUid, reactorInfo);
                                    setTimeout(() => userCache.delete(reactorUid), 86400000); // UPDATED: 24-hour TTL
                                }

                                let reactorName = reactorInfo.name || reactorInfo.username || "Someone";
                                const reactorPhoto = reactorInfo.photoURL || "https://www.goorac.biz/icon.png";
                                const reactorUsername = reactorInfo.username || reactorUid;

                                if (isGroup) reactorName = `${reactorName} in ${chatData.groupName || 'Group'}`;

                                const title = isGroup ? reactorName : `New Reaction`;
                                const body = `${isGroup ? reactorName.split(' ')[0] : reactorName} reacted ${reactionData.emoji} to your message.`;

                                // 🛡️ URI FIX: Safely encode parameters to prevent Crashes
                                const deepLink = isGroup 
                                    ? `https://www.goorac.biz/groupChat.html?id=${encodeURIComponent(chatDocId)}` 
                                    : `https://www.goorac.biz/chat.html?user=${encodeURIComponent(reactorUsername)}`;

                                // --- ADVANCED: Publish with Retry and 48-Hour TTL ---
                                await publishWithRetry([messageOwner], {
                                    title: title,
                                    body: body,
                                    icon: reactorPhoto,
                                    deep_link: deepLink,
                                    tag: `reaction_${chatDocId}`, // Neatly stacks multiple reactions
                                    time_to_live: 172800 
                                });
                            }
                        } catch (err) { console.error("❌ Reaction Push Error:", err); }
                    }
                }
            });
        }, (error) => { console.error("❌ Messages listener error:", error); });
    }

    // ============================================================================
    // LISTENER 2: BULLETPROOF DATABASE CATCH-ALL FOR LIKES, COMMENTS, DROPS, NOTES
    // ============================================================================
    function startNotificationListener() {
        console.log("🎧 Listening for ALL Database Notifications (Drops, Notes, Moments, Likes)...");
        
        // 🚀 THE PERFECT COLD START FIX
        let isFirstRun = true; 

        db.collection('notifications').onSnapshot((snapshot) => {
            
            if (isFirstRun) {
                isFirstRun = false;
                return;
            }

            snapshot.docChanges().forEach(async (change) => {
                
                // STRICT FIX: Ignore all historical snapshot data during the first 2 seconds
                if (isBooting) return;

                if (change.type === 'added') {
                    const docId = change.doc.id;
                    
                    // Prevent duplicate processing of the same notification document
                    if (processedNotifs.has(docId)) return;
                    processedNotifs.add(docId);
                    setTimeout(() => processedNotifs.delete(docId), 180000); 

                    const notifData = change.doc.data();
                    
                    // BULLETPROOF TIMESTAMP: Uses Firestore creation time if payload timestamp is missing/broken
                    let msgTime = SERVER_START_TIME;
                    if (change.doc.createTime) {
                        msgTime = change.doc.createTime.toMillis();
                    } else if (notifData.timestamp && notifData.timestamp.toMillis) {
                        msgTime = notifData.timestamp.toMillis();
                    } else if (notifData.timestamp) {
                        msgTime = new Date(notifData.timestamp).getTime();
                    }

                    // FIXED: Increased tolerance to 24 hours to prevent dropped notifications due to client drift
                    if (Date.now() - msgTime > 86400000) return;
                    if (msgTime <= SERVER_START_TIME) return;

                    // ==============================================================
                    // EXHAUSTIVE ID CATCHER: Guarantees we find the sender and receiver
                    // ==============================================================
                    const targetUid = notifData.toUid || notifData.targetUid || notifData.receiverId || notifData.ownerId || notifData.authorId || notifData.postOwnerId || notifData.to || notifData.targetUser;
                    const senderUid = notifData.fromUid || notifData.senderUid || notifData.userId || notifData.sender || notifData.actorId || notifData.byUser || notifData.from;
                    
                    // Safety abort: Do not send push if IDs are missing, or if user liked their own post
                    if (!targetUid || !senderUid || targetUid === senderUid) return; 

                    // --- PRODUCTION READY FOCUSED CHECK (ZERO DELAYS, ZERO DB PINGS) ---
                    if (notifData.seen === true || notifData.read === true) return; 

                    try {
                        // ALWAYS fetch exact user profile from DB to guarantee Names and PFPs are 100% correct
                        // HIGH-SPEED CACHE INJECTION (Upgraded to 24 Hours)
                        let senderData;
                        if (userCache.has(senderUid)) {
                            senderData = userCache.get(senderUid);
                        } else {
                            const senderDoc = await db.collection('users').doc(senderUid).get();
                            senderData = senderDoc.data() || {};
                            userCache.set(senderUid, senderData);
                            setTimeout(() => userCache.delete(senderUid), 86400000); // UPDATED: 24-hour TTL
                        }

                        const senderName = senderData.name || senderData.username || notifData.senderName || notifData.fromName || "Someone";
                        const senderPhoto = senderData.photoURL || notifData.senderPfp || notifData.fromPfp || "https://www.goorac.biz/icon.png";
                        
                        // 🛡️ URI FIX: Safely encode the entire raw link to prevent Crashes
                        let rawLink = notifData.link || notifData.targetUrl || `https://www.goorac.biz/notifications.html`;
                        const deepLink = rawLink.startsWith('http') ? encodeURI(rawLink) : `https://www.goorac.biz/${encodeURI(rawLink.replace(/^\//, ''))}`;

                        let title = "New Notification";
                        let body = ""; 

                        // Extract text payload no matter what the frontend named the variable
                        const textContent = notifData.text || notifData.body || notifData.message || notifData.comment || notifData.noteText || "";
                        
                        // Force lowercase for foolproof string matching
                        const type = (notifData.type || "").toLowerCase();
                        const linkString = (deepLink || "").toLowerCase();
                        const textLower = textContent.toLowerCase();

                        // ==============================================================
                        // 1. BULLETPROOF LIKE CATCHER (Drops, Notes, Moments, Posts)
                        // ==============================================================
                        if (type.includes('like') || textLower.includes('liked')) {
                            title = `New Like ❤️`;
                            
                            // Explicitly check for Drop indicators first
                            if (type === 'drop_like' || type.includes('drop') || notifData.dropId || linkString.includes('drop')) {
                                body = `${senderName} liked your Drop.`;
                            } 
                            // Explicitly check for Note indicators
                            else if (type === 'note_like' || type.includes('note') || notifData.noteId || linkString.includes('note')) {
                                body = `${senderName} liked your Note.`;
                            } 
                            // Explicitly check for Moment indicators
                            else if (type === 'like_moment' || type === 'moment_like' || type.includes('moment') || notifData.momentId || linkString.includes('moment')) {
                                body = `${senderName} liked your Moment.`;
                            } 
                            // Fallback for general post likes
                            else {
                                body = `${senderName} liked your post.`;
                            }
                        } 
                        
                        // ==============================================================
                        // 2. BULLETPROOF REPLY & COMMENT CATCHER
                        // ==============================================================
                        else if (type.includes('reply') || type.includes('comment') || textLower.includes('replied') || textLower.includes('commented')) {
                            title = `New Reply 💬`;
                            
                            if (type === 'drop_reply' || type.includes('drop') || notifData.dropId || linkString.includes('drop')) {
                                 body = textContent ? `${senderName} replied to your Drop: "${textContent}"` : `${senderName} replied to your Drop.`;
                            } 
                            else if (type === 'note_reply' || type.includes('note') || notifData.noteId || linkString.includes('note')) {
                                 body = textContent ? `${senderName} replied to your Note: "${textContent}"` : `${senderName} replied to your Note.`;
                            } 
                            else if (type === 'moment_reply' || type === 'moment_comment' || type.includes('moment') || notifData.momentId || linkString.includes('moment')) {
                                 body = textContent ? `${senderName} replied to your Moment: "${textContent}"` : `${senderName} replied to your Moment.`;
                            } 
                            else {
                                 body = textContent ? `${senderName} commented: "${textContent}"` : `${senderName} commented on your post.`;
                            }
                        } 

                        // ==============================================================
                        // 3. FOLLOW CATCHER
                        // ==============================================================
                        else if (type.includes('follow')) {
                            title = `New Follower 👤`;
                            body = `${senderName} started following you.`;
                        }

                        // ==============================================================
                        // 4. GENERIC INTERACTION FALLBACK
                        // ==============================================================
                        else if (type.includes('drop') || notifData.dropId) {
                            title = `Drop Interaction 🔔`;
                            body = `${senderName} interacted with your Drop.`;
                        }
                        else if (type.includes('note') || notifData.noteId) {
                            title = `Note Interaction 🔔`;
                            body = `${senderName} interacted with your Note.`;
                        }
                        else if (type.includes('moment') || notifData.momentId) {
                            title = `Moment Interaction 🔔`;
                            body = `${senderName} interacted with your Moment.`;
                        }
                        else {
                            // Ultimate fail-safe so no database event is ever missed
                            title = `New Activity 🔔`;
                            body = textContent || `${senderName} interacted with your profile.`;
                        }

                        // Publish the final constructed notification to OneSignal
                        // --- ADVANCED: Publish with Retry and 48-Hour TTL ---
                        await publishWithRetry([targetUid], {
                            title: title,
                            body: body,
                            icon: senderPhoto,
                            deep_link: deepLink,
                            tag: "social_notifications", // Stacks ALL social alerts into one neat group!
                            time_to_live: 172800 // ADVANCED FIX: 48 Hours
                        });
                        
                        console.log(`✅ Pure DB Push sent to ${targetUid} for event type: ${type}`);

                    } catch (error) { 
                        console.error("❌ Notification Push Error:", error); 
                    }
                }
            });
        }, (error) => { console.error("❌ Notifications DB listener error:", error); });
    }

    // ============================================================================
    // LISTENER 3: AUDIO AND VIDEO CALLS
    // ============================================================================
    function startCallListener() {
        console.log("🎧 Listening for Incoming and Missed Calls...");

        // 🚀 THE PERFECT COLD START FIX FOR CALLS
        let isFirstRunIncoming = true; 
        let isFirstRunMissed = true;

        // 1. INCOMING CALLS (Watches the 'calls' signaling collection)
        db.collection('calls').onSnapshot((snapshot) => {
            
            if (isFirstRunIncoming) {
                isFirstRunIncoming = false;
                return;
            }

            snapshot.docChanges().forEach(async (change) => {
                
                if (isBooting) return;

                if (change.type === 'added' || change.type === 'modified') {
                    const callData = change.doc.data();
                    if (callData.status !== 'calling') return; // Only notify if currently ringing

                    const targetUid = change.doc.id; // Receiver's UID is the Document ID
                    const callerUid = callData.callerId;
                    if (!targetUid || !callerUid) return;

                    // Throttle calls to prevent ringing them 50 times during ICE candidate exchange
                    const throttleKey = `call_${targetUid}_${callerUid}`;
                    if (processedNotifs.has(throttleKey)) return;
                    processedNotifs.add(throttleKey);
                    setTimeout(() => processedNotifs.delete(throttleKey), 45000); 

                    try {
                        // HIGH-SPEED CACHE INJECTION (Upgraded to 24 Hours)
                        let callerInfo;
                        if (userCache.has(callerUid)) {
                            callerInfo = userCache.get(callerUid);
                        } else {
                            const callerDoc = await db.collection('users').doc(callerUid).get();
                            callerInfo = callerDoc.data() || {};
                            userCache.set(callerUid, callerInfo);
                            setTimeout(() => userCache.delete(callerUid), 86400000); // UPDATED: 24-hour TTL
                        }

                        const callerName = callerInfo.name || callerInfo.username || callData.callerName || "Someone";
                        const callerPhoto = callerInfo.photoURL || callData.callerPfp || "https://www.goorac.biz/icon.png";
                        
                        const isVideo = callData.type === 'video';

                        const title = isVideo ? "Incoming Video Call 🎥" : "Incoming Audio Call 📞";
                        const body = `${callerName} is calling you... Tap to answer.`;
                        const deepLink = `https://www.goorac.biz/calls.html`;

                        // --- ADVANCED: Publish with Retry - KEEP TTL 60 to prevent phantom ringing later ---
                        await publishWithRetry([targetUid], {
                            title: title,
                            body: body,
                            icon: callerPhoto,
                            deep_link: deepLink,
                            tag: "incoming_call",
                            time_to_live: 60, // MUST STAY 60 FOR CALLS
                            sound: "ringtone.wav"
                        });
                        console.log(`✅ Incoming Call Push sent to ${targetUid}`);
                    } catch (e) { console.error("❌ Call Push Error:", e); }
                }
            });
        }, (error) => { console.error("❌ Calls listener error:", error); });

        // --- ADVANCED FIX: ADDED REALTIME DATABASE LISTENER BECAUSE FRONTEND USES RDB FOR CALLS ---
        rdb.ref('calls_status').on('child_added', async (snapshot) => {
            processRdbCall(snapshot);
        });
        rdb.ref('calls_status').on('child_changed', async (snapshot) => {
            processRdbCall(snapshot);
        });

        async function processRdbCall(snapshot) {
            if (isBooting) return;
            const targetUid = snapshot.key;
            const callData = snapshot.val();
            
            if (!callData || callData.status !== 'ringing') return;

            const callerUid = callData.callerId;
            if (!targetUid || !callerUid) return;

            // Throttle to avoid duplicate RDB and Firestore pings
            const throttleKey = `call_rdb_${targetUid}_${callerUid}`;
            if (processedNotifs.has(throttleKey)) return;
            processedNotifs.add(throttleKey);
            setTimeout(() => processedNotifs.delete(throttleKey), 45000); 

            try {
                let callerInfo;
                if (userCache.has(callerUid)) {
                    callerInfo = userCache.get(callerUid);
                } else {
                    const callerDoc = await db.collection('users').doc(callerUid).get();
                    callerInfo = callerDoc.data() || {};
                    userCache.set(callerUid, callerInfo);
                    setTimeout(() => userCache.delete(callerUid), 86400000); 
                }

                const callerName = callerInfo.name || callerInfo.username || callData.callerName || "Someone";
                const callerPhoto = callerInfo.photoURL || callData.callerPfp || "https://www.goorac.biz/icon.png";
                const isVideo = callData.type === 'video';

                const title = isVideo ? "Incoming Video Call 🎥" : "Incoming Audio Call 📞";
                const body = `${callerName} is calling you... Tap to answer.`;
                const deepLink = `https://www.goorac.biz/calls.html?targetUid=${targetUid}&autoAnswer=true`;

                // --- ADVANCED RINGING PAYLOAD ---
                await publishWithRetry([targetUid], {
                    title: title,
                    body: body,
                    icon: callerPhoto,
                    deep_link: deepLink,
                    tag: "incoming_call",
                    time_to_live: 60, // MUST STAY 60 FOR CALLS
                    sound: "ringtone.wav"
                });
                console.log(`✅ Incoming Call Push (RDB fallback) sent to ${targetUid}`);
            } catch (e) { console.error("❌ RDB Call Push Error:", e); }
        }

        // 2. MISSED CALLS (Watches the 'call_logs' collection)
        db.collection('call_logs').onSnapshot((snapshot) => {
            
            if (isFirstRunMissed) {
                isFirstRunMissed = false;
                return;
            }

            snapshot.docChanges().forEach(async (change) => {
                
                let msgTime = SERVER_START_TIME;
                if (change.doc.createTime) msgTime = change.doc.createTime.toMillis();

                // STRICT FIX: Ignore historical data on boot, BUT allow missed calls from the last 10 minutes
                if (isBooting && (Date.now() - msgTime > 600000)) return;

                if (change.type === 'added') {
                    const logData = change.doc.data();
                    if (logData.status !== 'missed') return; // Only notify if missed

                    const targetUid = logData.receiverId;
                    const callerUid = logData.callerId;
                    if (!targetUid || targetUid === callerUid) return;

                    const docId = change.doc.id;
                    if (processedNotifs.has(docId)) return;
                    processedNotifs.add(docId);
                    setTimeout(() => processedNotifs.delete(docId), 180000);

                    try {
                        // HIGH-SPEED CACHE INJECTION (Upgraded to 24 Hours)
                        let callerInfo;
                        if (userCache.has(callerUid)) {
                            callerInfo = userCache.get(callerUid);
                        } else {
                            const callerDoc = await db.collection('users').doc(callerUid).get();
                            callerInfo = callerDoc.data() || {};
                            userCache.set(callerUid, callerInfo);
                            setTimeout(() => userCache.delete(callerUid), 86400000); // UPDATED: 24-hour TTL
                        }

                        const callerName = callerInfo.name || callerInfo.username || logData.callerName || "Someone";
                        const callerPhoto = callerInfo.photoURL || logData.callerPfp || "https://www.goorac.biz/icon.png";
                        
                        const isVideo = logData.type === 'video';

                        const title = "Missed Call 📵";
                        const body = `You missed a ${isVideo ? 'video' : 'voice'} call from ${callerName}.`;
                        const deepLink = `https://www.goorac.biz/calls.html`;

                        // --- ADVANCED: Publish with Retry and 48-Hour TTL ---
                        await publishWithRetry([targetUid], {
                            title: title,
                            body: body,
                            icon: callerPhoto,
                            deep_link: deepLink,
                            tag: `missed_call_${callerUid}`, // Stacks multiple missed calls
                            time_to_live: 172800 
                        });
                        console.log(`✅ Missed Call Push sent to ${targetUid}`);
                    } catch (e) { console.error("❌ Missed Call Push Error:", e); }
                }
            });
        }, (error) => { console.error("❌ Call Logs listener error:", error); });
    }

    // Export all listeners wrapped in a single starter function
    function startPushListener() {
        startMessageListener();
        startNotificationListener();
        startCallListener(); // <-- Starts the new Call Listeners
    }

    // Start the Firebase background listeners when this module is required
    startPushListener();
}
