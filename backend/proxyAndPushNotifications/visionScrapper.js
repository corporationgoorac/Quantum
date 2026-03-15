const express = require('express'); // FIXED: Changed 'Const' to 'const' to prevent crashes
const ytSearch = require('yt-search');
const router = express.Router(); // Changed from 'app = express()' to 'router'

// 🔥 Added Global API Quota Tracker for Vision
let visionApiQuotaExceeded = false;

router.get('/', (req, res) => {
    res.send('🚀 Goorac Vision Direct Proxy is ONLINE!');
});

// Note: I removed '/api' from '/api/feed' here because we will add it in the master server.js
router.get('/feed', async (req, res) => {
    const rawTopic = req.query.topics || req.query.topic || "trending";
    const isVisionMode = req.query.mode === 'strict';
    
    let searchQuery = rawTopic.trim();
    if (!isVisionMode && !searchQuery.toLowerCase().includes('shorts')) {
        searchQuery += " shorts";
    }

    try {
        console.log(`Searching YouTube directly for: ${searchQuery}`);
        
        // ============================================================================
        // 🟢 NEW: LAYER 1 - OFFICIAL YOUTUBE API (API-FIRST ARCHITECTURE)
        // ============================================================================
        const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
        if (YOUTUBE_API_KEY && !visionApiQuotaExceeded) {
            try {
                const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=25&key=${YOUTUBE_API_KEY}`;
                const apiResponse = await fetch(apiUrl);
                const apiData = await apiResponse.json();

                if (apiResponse.ok && apiData.items) {
                    console.log(`✅ Vision API Success for: ${searchQuery}`);
                    
                    // Format API output perfectly to match the original structure
                    const apiFeed = apiData.items.slice(0, 20).map(item => ({
                        id: `yt_${item.id.videoId}_${Math.random().toString(36).substring(2, 7)}`,
                        category: rawTopic,
                        author: item.snippet.channelTitle || "YouTube Creator",
                        title: item.snippet.title,
                        imgUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                        videoId: item.id.videoId, 
                        likes: Math.floor(Math.random() * 50000) + 1000, 
                        link: `https://youtube.com/watch?v=${item.id.videoId}`,
                        type: 'video',
                        lengthSeconds: isVisionMode ? 300 : 60
                    }));

                    return res.json({ success: true, bites: apiFeed }); // Early return!
                } else if (apiResponse.status === 403 || apiResponse.status === 429) {
                    console.warn(`⚠️ Vision API Quota Reached (Status ${apiResponse.status}). Switching to Scraper Fallback.`);
                    visionApiQuotaExceeded = true;
                } else {
                    console.warn(`⚠️ Vision API Error: ${apiData.error?.message}. Falling back to Scraper.`);
                }
            } catch (apiErr) {
                console.warn(`⚠️ Vision API Network Failure. Falling back to Scraper.`, apiErr.message);
            }
        }

        // ============================================================================
        // 🟠 LAYER 2: ORIGINAL SCRAPER FALLBACK (Preserved Exactly Below)
        // ============================================================================

        // Directly search YouTube (Bypasses all API blocks)
        const r = await ytSearch(searchQuery);
        const videos = r.videos;

        if (!videos || videos.length === 0) {
            return res.json({ success: true, bites: [] });
        }

        let filteredVideos = videos;
        if (!isVisionMode) {
            filteredVideos = videos.filter(v => v.seconds > 0 && v.seconds < 240);
            if (filteredVideos.length === 0) filteredVideos = videos.slice(0, 5);
        }

        const combinedFeed = filteredVideos.slice(0, 20).map(video => ({
            id: `yt_${video.videoId}_${Math.random().toString(36).substring(2, 7)}`,
            category: rawTopic,
            author: video.author ? video.author.name : "YouTube Creator",
            title: video.title,
            imgUrl: video.thumbnail || video.image,
            videoId: video.videoId, 
            likes: video.views || Math.floor(Math.random() * 5000), 
            link: video.url,
            type: 'video',
            lengthSeconds: video.seconds
        }));

        res.json({ success: true, bites: combinedFeed });
    } catch (error) {
        console.error("Direct Search Failed:", error);
        res.json({ success: false, bites: [] });
    }
});

// Export this router so the master server can use it
module.exports = router; 
