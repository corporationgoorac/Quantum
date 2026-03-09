class GifPicker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // --- API CONFIGURATION ---
        // Get a free key from Google Cloud Console (Tenor API)
        this.apiKey = 'YOUR_TENOR_API_KEY'; 
        this.clientKey = 'goorac_quantum_chat'; 
        
        // Load Recents (Limit to 6 to save space)
        let savedRecents = JSON.parse(localStorage.getItem('goorac_gif_recents')) || [];
        this.recentGifs = savedRecents.slice(0, 6);
        
        this.lastSearchedTerm = "";
        this.searchTimeout = null;
        this.lastMoodName = null;
        
        // Cache to prevent spamming the API on every open
        this.apiCache = {};
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
        this.loadGifSections();

        // Check for chat mood changes every 3 seconds to update the Vibe row
        this.moodRefreshInterval = setInterval(() => {
            this.refreshChatMood();
        }, 3000);
    }

    disconnectedCallback() {
        if (this.moodRefreshInterval) clearInterval(this.moodRefreshInterval);
    }

    refreshChatMood() {
        if (this.lastSearchedTerm) return; 
        
        const newMoodData = this.calculateChatMood();
        const newMoodName = newMoodData ? newMoodData.name : null;
        
        if (this.lastMoodName !== newMoodName) {
            this.loadGifSections(); 
        }
    }

    // --- 1. AI: CHAT VIBE ENGINE (VADER NLP PORT) ---
    getRecentChatContext() {
        let allChatMessages = [];
        for (let i = 0; i < localStorage.length; i++) {
            let key = localStorage.key(i);
            if (key && key.startsWith('chat_msgs_')) {
                try {
                    let msgs = JSON.parse(localStorage.getItem(key)) || [];
                    allChatMessages = allChatMessages.concat(msgs);
                } catch(e) {}
            }
        }
        allChatMessages.sort((a, b) => new Date(b.timestampIso || 0).getTime() - new Date(a.timestampIso || 0).getTime());
        return allChatMessages.slice(0, 25);
    }

    calculateChatMood() {
        const messages = this.getRecentChatContext();
        if (messages.length === 0) return null;

        const scores = { happy: 0, sad: 0, angry: 0, love: 0, funny: 0, surprised: 0, party: 0, work: 0 };
        const negations = ['not', "don't", "dont", 'never', 'no', 'illa', 'illai'];
        
        // Simplified lexicons for quick scanning
        const lexicons = {
            tamil: { happy: ['sema', 'mass', 'jolly'], sad: ['kavalai', 'sogam', 'feel'], angry: ['kovam', 'kaduppu', 'tension'], love: ['kadhal', 'chellam', 'kutti'], funny: ['sirippu', 'comedy', 'fun'], party: ['enjoy', 'vibes'] },
            english: { happy: ['good', 'great', 'awesome'], sad: ['sad', 'bad', 'cry'], angry: ['mad', 'hate', 'wtf'], love: ['love', 'babe', 'cute'], funny: ['haha', 'lmao', 'lol'], party: ['party', 'drink', 'lit'], work: ['work', 'busy', 'stress'] }
        };

        messages.forEach((msg, index) => {
            const rawText = (msg.text || '').toLowerCase();
            const tokens = rawText.split(/[\s,.\?!]+/);
            const timeWeight = 1.0 - (index * 0.04); 

            for (let i = 0; i < tokens.length; i++) {
                let word = tokens[i];
                if (!word) continue;
                let isNegated = (i > 0 && negations.includes(tokens[i - 1]));

                const applyScore = (emotion, val) => {
                    if (isNegated) {
                        if (['happy', 'love', 'funny', 'party'].includes(emotion)) scores.sad += val * timeWeight;
                        else if (['sad', 'angry'].includes(emotion)) scores.happy += val * timeWeight;
                    } else scores[emotion] += val * timeWeight;
                };

                for (const [emotion, words] of Object.entries(lexicons.tamil)) if (words.includes(word)) applyScore(emotion, 2.0);
                for (const [emotion, words] of Object.entries(lexicons.english)) if (words.includes(word)) applyScore(emotion, 1.0);
            }
        });

        let dominant = null;
        let maxScore = 0.8; 
        for (const [emotion, score] of Object.entries(scores)) {
            if (score > maxScore) { maxScore = score; dominant = emotion; }
        }

        if (dominant) {
            // Map the NLP emotion to a high-quality GIF search query
            const moodDisplayMap = {
                happy: { name: 'Happy', query: 'happy dance excitement' },
                sad: { name: 'Sad', query: 'crying sad hugs' },
                angry: { name: 'Angry', query: 'angry mad rage' },
                love: { name: 'In Love', query: 'love hugs blowing kiss' },
                funny: { name: 'Funny', query: 'laughing hysterically lmao' },
                surprised: { name: 'Surprised', query: 'shocked wtf mind blown' },
                party: { name: 'Vibes / Party', query: 'party lit dancing' },
                work: { name: 'Grind / Work', query: 'tired working stressed coffee' }
            };
            return moodDisplayMap[dominant];
        }
        return null;
    }

    // --- 2. AI: SMART SUGGESTIONS ENGINE ---
    getSmartSuggestionQuery() {
        const date = new Date();
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        
        let query = "";
        if (hour >= 5 && hour < 11) query = "good morning coffee wake up";
        else if (hour >= 11 && hour < 14) query = "lunch hungry eating";
        else if (hour >= 14 && hour < 17) query = "tired afternoon nap";
        else if (hour >= 17 && hour < 21) query = "relaxing chill evening";
        else query = "good night sleep tired";
        
        if (dayOfWeek === 5 && hour >= 16) query = "friday feeling weekend party";
        if (dayOfWeek === 1 && hour < 12) query = "monday morning tired";

        return query;
    }

    // --- API FETCHING LOGIC ---
    async fetchTenorGifs(endpoint, query = '', limit = 6) {
        const cacheKey = `${endpoint}_${query}_${limit}`;
        if (this.apiCache[cacheKey]) return this.apiCache[cacheKey];

        let url = `https://tenor.googleapis.com/v2/${endpoint}?key=${this.apiKey}&client_key=${this.clientKey}&limit=${limit}&media_filter=tinygif`;
        if (query) url += `&q=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(url);
            const data = await response.json();
            const results = data.results.map(gif => ({
                id: gif.id,
                url: gif.media_formats.tinygif.url,
                preview: gif.media_formats.tinygif.url // Tenor tinygif is small enough to act as its own preview
            }));
            this.apiCache[cacheKey] = results;
            return results;
        } catch (error) {
            console.error("GIF Fetch Error:", error);
            return [];
        }
    }

    // --- RENDERING ---
    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    background: #121212;
                    height: 45vh;
                    max-height: 45vh;
                    width: 100%;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    overflow: hidden;
                    padding-bottom: env(safe-area-inset-bottom);
                }
                .gp-header {
                    padding: 8px 12px;
                    border-bottom: 1px solid #262626;
                    display: flex; align-items: center; gap: 10px;
                    background: rgba(18,18,18,0.95);
                    flex-shrink: 0; 
                }
                .gp-search-container { flex: 1; position: relative; display: flex; align-items: center; }
                .gp-search {
                    width: 100%; background: #262626; border: none; border-radius: 8px;
                    padding: 8px 30px 8px 12px; color: #fff; font-size: 14px; outline: none;
                }
                .gp-clear {
                    position: absolute; right: 10px; background: none; border: none;
                    color: #888; cursor: pointer; display: none; font-size: 16px; outline: none;
                }
                .gp-body {
                    flex: 1; overflow-y: auto; padding: 10px; scroll-behavior: smooth; min-height: 0;
                }
                .gp-category-title {
                    font-size: 0.75rem; color: #888; margin: 15px 0 8px 5px; font-weight: 600; text-transform: uppercase;
                }
                #cat-suggested .gp-category-title { color: #a162f7; }
                #cat-chatmood .gp-category-title { color: #ff3366; text-shadow: 0 0 8px rgba(255, 51, 102, 0.4); }
                
                /* 2-Column Masonry for GIFs */
                .gp-grid {
                    column-count: 2;
                    column-gap: 8px;
                }
                .gp-gif-wrapper {
                    break-inside: avoid;
                    margin-bottom: 8px;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #262626; /* Shimmer fallback color */
                    cursor: pointer;
                    position: relative;
                }
                .gp-gif-wrapper:active { filter: brightness(0.8); transform: scale(0.98); }
                .gp-gif {
                    width: 100%;
                    display: block;
                    border-radius: 8px;
                }
                .loading-text { color: #888; text-align: center; padding: 20px; font-size: 0.9rem; }
            </style>
            <div class="gp-header">
                <div class="gp-search-container">
                    <input type="text" class="gp-search" placeholder="Search GIFs...">
                    <button class="gp-clear">&times;</button>
                </div>
            </div>
            <div class="gp-body" id="gif-body">
                <div class="loading-text">Initializing Quantum Engine...</div>
            </div>
        `;
    }

    setupEvents() {
        const searchInput = this.shadowRoot.querySelector('.gp-search');
        const clearBtn = this.shadowRoot.querySelector('.gp-clear');
        
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            this.lastSearchedTerm = val;
            clearBtn.style.display = val ? 'block' : 'none';
            
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.executeSearch(val);
            }, 400); // Debounce API calls
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.lastSearchedTerm = '';
            clearBtn.style.display = 'none';
            this.loadGifSections(); // Revert to AI / Trending views
        });
    }

    async loadGifSections() {
        const body = this.shadowRoot.getElementById('gif-body');
        body.innerHTML = ''; // Clear loading

        // 1. Recents (Local Storage)
        if (this.recentGifs.length > 0) {
            this.renderSection(body, 'recents', 'Recent', this.recentGifs);
        }

        // 2. Chat Vibe (VADER NLP -> API)
        const chatMoodData = this.calculateChatMood();
        this.lastMoodName = chatMoodData ? chatMoodData.name : null;
        if (chatMoodData) {
            const vibeGifs = await this.fetchTenorGifs('search', chatMoodData.query, 6);
            if (vibeGifs.length > 0) {
                this.renderSection(body, 'chatmood', `Chat Vibe: ${chatMoodData.name}`, vibeGifs);
            }
        }

        // 3. Smart AI / Suggested (Time/Context -> API)
        const smartQuery = this.getSmartSuggestionQuery();
        const smartGifs = await this.fetchTenorGifs('search', smartQuery, 6);
        if (smartGifs.length > 0) {
            this.renderSection(body, 'suggested', 'Smart AI', smartGifs);
        }

        // 4. Trending (Default API)
        const trendingGifs = await this.fetchTenorGifs('featured', '', 12);
        if (trendingGifs.length > 0) {
            this.renderSection(body, 'trending', 'Trending', trendingGifs);
        }
    }

    async executeSearch(query) {
        const body = this.shadowRoot.getElementById('gif-body');
        body.innerHTML = '<div class="loading-text">Searching...</div>';

        if (!query) {
            this.loadGifSections();
            return;
        }

        const results = await this.fetchTenorGifs('search', query, 20);
        body.innerHTML = '';

        if (results.length === 0) {
            body.innerHTML = '<div class="loading-text">No GIFs found.</div>';
            return;
        }

        this.renderSection(body, 'search-results', `Results for "${query}"`, results);
    }

    renderSection(container, id, titleText, gifsArray) {
        const section = document.createElement('div');
        section.id = `cat-${id}`;
        
        const title = document.createElement('div');
        title.className = 'gp-category-title';
        title.innerText = titleText;
        
        const grid = document.createElement('div');
        grid.className = 'gp-grid';

        gifsArray.forEach(gif => {
            const wrapper = document.createElement('div');
            wrapper.className = 'gp-gif-wrapper';
            
            const img = document.createElement('img');
            img.className = 'gp-gif';
            img.src = gif.url;
            img.loading = "lazy"; // Important for performance
            
            wrapper.onclick = () => {
                this.addToRecents(gif);
                // Emits a custom event your chat.html can listen to
                this.dispatchEvent(new CustomEvent('gif-selected', { 
                    detail: { url: gif.url },
                    bubbles: true, 
                    composed: true 
                }));
            };

            wrapper.appendChild(img);
            grid.appendChild(wrapper);
        });

        section.appendChild(title);
        section.appendChild(grid);
        container.appendChild(section);
    }

    addToRecents(gifObj) {
        // Remove if it already exists to move it to the front
        this.recentGifs = this.recentGifs.filter(g => g.id !== gifObj.id);
        this.recentGifs.unshift(gifObj);
        if (this.recentGifs.length > 6) this.recentGifs.pop(); // Keep array small
        
        localStorage.setItem('goorac_gif_recents', JSON.stringify(this.recentGifs));
    }
}

customElements.define('gif-picker', GifPicker);
