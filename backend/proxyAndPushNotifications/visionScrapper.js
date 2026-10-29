const express = require('express'); // FIXED: Changed 'Const' to 'const' to prevent crashes
const ytSearch = require('yt-search');
const router = express.Router(); // Changed from 'app = express()' to 'router'

// 🔥 Added Global API Quota Tracker for Vision
let visionApiQuotaExceeded = false;
let visionQuotaExceededAt = 0;
const VISION_QUOTA_RESET_MS = 60 * 60 * 1000; // Auto-retry official API after 1 hour

// ============================================================================
// 🛠️ HELPER FUNCTIONS: ISO-8601 DURATION PARSER, TIMESTAMP PARSER & HTML DECODER
// ============================================================================
function parseIso8601Duration(isoStr) {
    if (!isoStr || typeof isoStr !== 'string') return 0;
    const match = isoStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return (hours * 3600) + (minutes * 60) + seconds;
}

function parseTimestampToSeconds(ts) {
    if (!ts || typeof ts !== 'string') return 0;
    const parts = ts.trim().split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
}

function formatSecondsToTimestamp(totalSeconds) {
    const secNum = Number(totalSeconds);
    if (!secNum || secNum <= 0 || isNaN(secNum)) return "";
    const h = Math.floor(secNum / 3600);
    const m = Math.floor((secNum % 3600) / 60);
    const s = Math.floor(secNum % 60);
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function decodeHtmlEntities(text) {
    if (!text || typeof text !== 'string') return "";
    return text
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

router.get('/', (req, res) => {
    res.send('🚀 Goorac Vision Direct Proxy is ONLINE!');
});

// Note: I removed '/api' from '/api/feed' here because we will add it in the master server.js
router.get('/feed', async (req, res) => {
    const rawTopic = String(req.query.topics || req.query.topic || "trending");
    const isVisionMode = req.query.mode === 'strict';
    
    let searchQuery = rawTopic.trim() || "trending";
    if (!isVisionMode && !searchQuery.toLowerCase().includes('shorts')) {
        searchQuery += " shorts";
    }

    // Auto-reset quota lock after cooldown period so server never stays stuck on fallback forever
    if (visionApiQuotaExceeded && (Date.now() - visionQuotaExceededAt > VISION_QUOTA_RESET_MS)) {
        visionApiQuotaExceeded = false;
    }

    try {
        console.log(`Searching YouTube directly for: ${searchQuery}`);
        
        // ============================================================================
        // 🟢 NEW: LAYER 1 - OFFICIAL YOUTUBE API (API-FIRST ARCHITECTURE + REAL DURATION)
        // ============================================================================
        const rawKeyEnv = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEYS || "";
        const apiKeyList = rawKeyEnv.split(',').map(k => k.trim()).filter(Boolean);
        const YOUTUBE_API_KEY = apiKeyList.length > 0
            ? apiKeyList[Math.floor(Math.random() * apiKeyList.length)]
            : null;

        if (YOUTUBE_API_KEY && !visionApiQuotaExceeded) {
            try {
                const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=25&key=${YOUTUBE_API_KEY}`;
                const apiResponse = await fetchWithTimeout(apiUrl, 8000);
                const apiData = await apiResponse.json();

                if (apiResponse.ok && Array.isArray(apiData.items) && apiData.items.length > 0) {
                    console.log(`✅ Vision API Success for: ${searchQuery}`);

                    // Extract all video IDs to fetch exact durations from YouTube v3/videos?part=contentDetails
                    const validItems = apiData.items.filter(item => item && item.id && item.id.videoId);
                    const videoIds = validItems.map(item => item.id.videoId);
                    const durationMap = {};

                    if (videoIds.length > 0) {
                        try {
                            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;
                            const detailsRes = await fetchWithTimeout(detailsUrl, 6000);
                            const detailsData = await detailsRes.json();

                            if (detailsRes.ok && Array.isArray(detailsData.items)) {
                                detailsData.items.forEach(vItem => {
                                    const isoDur = vItem.contentDetails?.duration;
                                    const secs = parseIso8601Duration(isoDur);
                                    if (vItem.id && secs > 0) {
                                        durationMap[vItem.id] = secs;
                                    }
                                });
                            }
                        } catch (durErr) {
                            console.warn(`⚠️ Vision API Duration Lookup Warning:`, durErr.message);
                        }
                    }

                    // Filter shorts if not in strict Vision mode and durations are known
                    let finalApiItems = validItems;
                    if (!isVisionMode && Object.keys(durationMap).length > 0) {
                        const shortItems = validItems.filter(item => {
                            const s = durationMap[item.id.videoId];
                            return s > 0 && s < 240;
                        });
                        if (shortItems.length > 0) finalApiItems = shortItems;
                    }
                    
                    // Format API output perfectly to match the original structure with REAL extracted durations
                    const apiFeed = finalApiItems.slice(0, 20).map(item => {
                        const vidId = item.id.videoId;
                        const realSeconds = durationMap[vidId] || 0;
                        return {
                            id: `yt_${vidId}_${Math.random().toString(36).substring(2, 7)}`,
                            category: rawTopic,
                            author: decodeHtmlEntities(item.snippet?.channelTitle) || "YouTube Creator",
                            title: decodeHtmlEntities(item.snippet?.title) || "YouTube Video",
                            imgUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
                            videoId: vidId, 
                            likes: Math.floor(Math.random() * 50000) + 1000, 
                            link: `https://youtube.com/watch?v=${vidId}`,
                            type: 'video',
                            lengthSeconds: realSeconds,
                            duration: realSeconds,
                            durationText: formatSecondsToTimestamp(realSeconds)
                        };
                    });

                    return res.json({ success: true, bites: apiFeed }); // Early return!
                } else if (apiResponse.status === 403 || apiResponse.status === 429) {
                    console.warn(`⚠️ Vision API Quota Reached (Status ${apiResponse.status}). Switching to Scraper Fallback.`);
                    visionApiQuotaExceeded = true;
                    visionQuotaExceededAt = Date.now();
                } else {
                    console.warn(`⚠️ Vision API Error: ${apiData.error?.message}. Falling back to Scraper.`);
                }
            } catch (apiErr) {
                console.warn(`⚠️ Vision API Network Failure. Falling back to Scraper.`, apiErr.message);
            }
        }

        // ============================================================================
        // 🟠 LAYER 2: ORIGINAL SCRAPER FALLBACK (Preserved & Enhanced With Full Duration)
        // ============================================================================

        // Directly search YouTube (Bypasses all API blocks)
        const r = await ytSearch(searchQuery);
        const videos = (r && Array.isArray(r.videos)) ? r.videos : [];

        if (!videos || videos.length === 0) {
            return res.json({ success: true, bites: [] });
        }

        let filteredVideos = videos;
        if (!isVisionMode) {
            filteredVideos = videos.filter(v => {
                const s = v.seconds || parseTimestampToSeconds(v.timestamp || v.duration?.timestamp);
                return s > 0 && s < 240;
            });
            if (filteredVideos.length === 0) filteredVideos = videos.slice(0, 5);
        }

        const combinedFeed = filteredVideos.slice(0, 20).map(video => {
            const exactSeconds = Number(video.seconds) || parseTimestampToSeconds(video.timestamp || video.duration?.timestamp) || 0;
            const exactTimestamp = video.timestamp || video.duration?.timestamp || formatSecondsToTimestamp(exactSeconds);

            return {
                id: `yt_${video.videoId}_${Math.random().toString(36).substring(2, 7)}`,
                category: rawTopic,
                author: video.author ? video.author.name : "YouTube Creator",
                title: video.title,
                imgUrl: video.thumbnail || video.image,
                videoId: video.videoId, 
                likes: video.views || Math.floor(Math.random() * 5000), 
                link: video.url,
                type: 'video',
                lengthSeconds: exactSeconds,
                duration: exactSeconds,
                durationText: exactTimestamp
            };
        });

        res.json({ success: true, bites: combinedFeed });
    } catch (error) {
        console.error("Direct Search Failed:", error);
        res.json({ success: false, bites: [] });
    }
});

// Export this router so the master server can use it
module.exports = router;
