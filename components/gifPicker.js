/**
 * Goorac Quantum Engine - Universal GIF Picker Component
 * Uses the Keyless Tenor Legacy API to bypass all 401/403 browser blocks.
 */

class GifPicker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // --- 1. CORE API CONFIGURATION ---
        // Universal Master Key - No registration required, bypasses browser origin blocks.
        this.apiKey = 'LIVDSRZULELA'; 
        
        // Local Storage State
        let savedRecents = JSON.parse(localStorage.getItem('goorac_gif_recents')) || [];
        this.recentGifs = savedRecents.slice(0, 8); // Keep up to 8 recents
        
        // Search State
        this.lastSearchedTerm = "";
        this.searchTimeout = null;
        this.activeCategory = 'trending';
        this.nextPos = null; // Used for Tenor pagination
        this.isFetchingMore = false;
        
        // AI State
        this.lastMoodName = null;
        this.apiCache = {};
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
        this.loadInitialViews();

        // AI Mood Polling
        this.moodRefreshInterval = setInterval(() => {
            this.refreshChatMood();
        }, 3000);
    }

    disconnectedCallback() {
        if (this.moodRefreshInterval) clearInterval(this.moodRefreshInterval);
    }

    // ==========================================
    //  AI ENGINE: VADER NLP PORT
    // ==========================================

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

        const scores = { happy: 0, sad: 0, angry: 0, love: 0, funny: 0, surprised: 0, party: 0, work: 0, chill: 0 };
        const negations = ['not', "don't", "dont", 'never', 'no', 'illa', 'illai', 'illay', 'illam', 'kidayathu'];
        const intensifiers = ['very', 'really', 'so', 'too', 'extremely', 'romba', 'rumba', 'migavum'];
        
        const lexicons = {
            emojis: {
                happy: ['😊', '😁', '😄', '🙂', '🥳', '😎', '😇', '👍', '☀️'],
                sad: ['😢', '😭', '😞', '😔', '💔', '☹️', '😓', '👎', '🌧️'],
                angry: ['😠', '😡', '🤬', '😾', '😤', '🖕', '💥', '💢'],
                love: ['❤️', '😍', '🥰', '😘', '💕', '💖', '💗', '🫂'],
                funny: ['😂', '🤣', '💀', '😹', '🤡', '🤪'],
                surprised: ['😮', '😱', '😲', '🤯', '😳', '👀', '⁉️'],
                party: ['🎉', '🎊', '🍻', '🥂', '🍾', '💃', '🕺', '🔥'],
                work: ['💻', '📝', '📈', '🏢', '💼', '☕', '🧠', '🛠️'],
                chill: ['🧘', '🎧', '🛀', '🛋️', '🍵', '🍃']
            },
            tamil: {
                happy: ['santhosham', 'magilchi', 'super', 'sema', 'nalla', 'mass', 'verithanam', 'jolly', 'arputham'],
                sad: ['kavalai', 'varutham', 'sogam', 'kavala', 'kashtam', 'vali', 'paavam', 'feel', 'azhugai'],
                angry: ['kovam', 'kaduppu', 'erichal', 'poda', 'loosu', 'mutal', 'tension', 'veri', 'moodu'],
                love: ['kadhal', 'anbu', 'chellam', 'kutti', 'uyire', 'thangam', 'kannu', 'pasam', 'muththam'],
                funny: ['sirippu', 'nagaichuvai', 'siripa', 'kalaai', 'comedy', 'mokkai', 'fun'],
                surprised: ['achariyam', 'athirchi', 'enna', 'nijamava', 'appadiya', 'shok', 'bayam'],
                party: ['kondaattam', 'enjoy', 'kudhukalam', 'vibes'],
                work: ['velai', 'office', 'project', 'padipu', 'exam']
            },
            english: {
                happy: ['good', 'great', 'happy', 'yay', 'awesome', 'nice', 'sweet', 'cool', 'amazing', 'best', 'fantastic'],
                sad: ['sad', 'bad', 'sorry', 'depressed', 'down', 'miss', 'cry', 'hurt', 'pain', 'lonely'],
                angry: ['angry', 'mad', 'hate', 'annoyed', 'wtf', 'stupid', 'idiot', 'furious', 'pissed', 'crap'],
                love: ['love', 'miss you', 'babe', 'baby', 'kiss', 'heart', 'beautiful', 'cute', 'darling'],
                funny: ['haha', 'lmao', 'lol', 'rofl', 'dead', 'funny', 'joke', 'hilarious', 'goofy', 'meme'],
                surprised: ['wow', 'omg', 'really', 'shocked', 'whoa', 'crazy', 'insane', 'stunned'],
                party: ['party', 'drink', 'drunk', 'celebrate', 'weekend', 'club', 'dance', 'lit', 'fire', 'cheers'],
                work: ['work', 'job', 'busy', 'meeting', 'tired', 'code', 'deploy', 'office', 'boss', 'stress'],
                chill: ['relax', 'chill', 'calm', 'peace', 'sleep', 'rest', 'lazy', 'vibe']
            }
        };

        messages.forEach((msg, index) => {
            const rawText = (msg.text || '').toLowerCase();
            const tokens = rawText.split(/[\s,.\?!]+/);
            const timeWeight = 1.0 - (index * 0.04); 

            for (const [emotion, emojiList] of Object.entries(lexicons.emojis)) {
                emojiList.forEach(emoji => {
                    if (rawText.includes(emoji)) scores[emotion] += 3.0 * timeWeight;
                });
            }

            for (let i = 0; i < tokens.length; i++) {
                let word = tokens[i];
                if (!word) continue;

                let isNegated = false;
                let isIntensified = false;

                for(let j = 1; j <= 2; j++) {
                    if (i - j >= 0) {
                        if (negations.includes(tokens[i - j])) isNegated = true;
                        if (intensifiers.includes(tokens[i - j])) isIntensified = true;
                    }
                }

                const applyScore = (emotion, baseValue) => {
                    let finalValue = baseValue * timeWeight;
                    if (isIntensified) finalValue *= 1.5;

                    if (isNegated) {
                        if (['happy', 'love', 'funny', 'party', 'chill'].includes(emotion)) scores.sad += finalValue;
                        else if (['sad', 'angry', 'work'].includes(emotion)) scores.happy += finalValue;
                    } else {
                        scores[emotion] += finalValue;
                    }
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
            const moodDisplayMap = {
                happy: { name: 'Happy', query: 'happy dance excitement joy' },
                sad: { name: 'Sad', query: 'crying sad hugs lonely' },
                angry: { name: 'Angry', query: 'angry mad rage flip table' },
                love: { name: 'In Love', query: 'love hugs blowing kiss heart eyes' },
                funny: { name: 'Funny', query: 'laughing hysterically lmao rofl' },
                surprised: { name: 'Surprised', query: 'shocked wtf mind blown gasp' },
                party: { name: 'Vibes / Party', query: 'party lit dancing cheers' },
                work: { name: 'Grind / Work', query: 'tired working stressed coffee typing' },
                chill: { name: 'Chill', query: 'relaxing chilling zen peaceful' }
            };
            return moodDisplayMap[dominant];
        }
        return null;
    }

    refreshChatMood() {
        if (this.lastSearchedTerm) return; 
        const newMoodData = this.calculateChatMood();
        const newMoodName = newMoodData ? newMoodData.name : null;
        
        if (this.lastMoodName !== newMoodName) {
            this.lastMoodName = newMoodName;
            this.loadInitialViews(true); 
        }
    }

    getSmartSuggestionQuery() {
        const date = new Date();
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        
        let query = "";
        if (hour >= 5 && hour < 11) query = "good morning coffee";
        else if (hour >= 11 && hour < 14) query = "lunch hungry eating";
        else if (hour >= 14 && hour < 17) query = "tired afternoon nap bored";
        else if (hour >= 17 && hour < 21) query = "relaxing chill evening";
        else query = "good night sleep tired bed";
        
        if (dayOfWeek === 5 && hour >= 16) query = "friday feeling weekend party";
        if (dayOfWeek === 1 && hour < 12) query = "monday morning tired";

        return query;
    }

    // ==========================================
    //  API LOGIC: UNIVERSAL TENOR KEYLESS FETCH
    // ==========================================

    async fetchUniversalGifs(endpoint, query = '', limit = 20, pos = null) {
        // Create cache key (ignore pos for simplicity in caching)
        const cacheKey = `${endpoint}_${query}_${limit}_${pos}`;
        if (this.apiCache[cacheKey]) return this.apiCache[cacheKey];

        // Using Tenor V1 Legacy Endpoint with Universal Key
        let url = `https://g.tenor.com/v1/${endpoint}?key=${this.apiKey}&limit=${limit}&media_filter=minimal`;
        if (query) url += `&q=${encodeURIComponent(query)}`;
        if (pos) url += `&pos=${pos}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const data = await response.json();
            
            // Map Tenor V1 data payload
            const results = data.results.map(gif => {
                const media = gif.media[0].tinygif; // Optimized for chat
                return {
                    id: gif.id,
                    url: media.url,
                    width: media.dims[0],
                    height: media.dims[1],
                    title: gif.title || "GIF"
                };
            });
            
            const returnData = { results: results, next: data.next };
            this.apiCache[cacheKey] = returnData;
            return returnData;
            
        } catch (error) {
            console.error("[Quantum Engine] Universal Fetch Error:", error);
            return { results: [], next: null };
        }
    }

    // ==========================================
    //  RENDERING & UI LOGIC
    // ==========================================

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
                
                /* HEADER & SEARCH */
                .gp-header {
                    padding: 8px 12px;
                    background: rgba(18,18,18,0.95);
                    flex-shrink: 0; 
                    z-index: 10;
                }
                .gp-search-container { 
                    position: relative; 
                    display: flex; 
                    align-items: center; 
                }
                .gp-search {
                    width: 100%; background: #262626; border: none; border-radius: 8px;
                    padding: 10px 35px 10px 12px; color: #fff; font-size: 15px; outline: none;
                    transition: border 0.2s;
                }
                .gp-search:focus { border: 1px solid #FF6D00; }
                .gp-clear {
                    position: absolute; right: 10px; background: none; border: none;
                    color: #888; cursor: pointer; display: none; font-size: 20px; outline: none;
                }
                
                /* PILL NAVIGATION */
                .gp-nav-pills {
                    display: flex;
                    gap: 8px;
                    padding: 0 12px 10px 12px;
                    overflow-x: auto;
                    scrollbar-width: none;
                    border-bottom: 1px solid #262626;
                }
                .gp-nav-pills::-webkit-scrollbar { display: none; }
                .gp-pill {
                    background: #1e1e1e;
                    color: #aaa;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    white-space: nowrap;
                    cursor: pointer;
                    border: 1px solid #333;
                    transition: all 0.2s ease;
                }
                .gp-pill.active {
                    background: rgba(255, 109, 0, 0.15);
                    color: #FF6D00;
                    border-color: #FF6D00;
                }
                .gp-pill:active { transform: scale(0.95); }

                /* SCROLLABLE BODY */
                .gp-body {
                    flex: 1; 
                    overflow-y: auto; 
                    padding: 10px; 
                    scroll-behavior: smooth; 
                    min-height: 0;
                }
                .gp-body::-webkit-scrollbar { display: none; }
                
                /* SECTION HEADERS */
                .gp-category-title {
                    font-size: 0.75rem; color: #888; margin: 15px 0 8px 5px; 
                    font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
                }
                .gp-category-title.ai-glow { color: #a162f7; }
                .gp-category-title.vibe-glow { color: #ff3366; text-shadow: 0 0 8px rgba(255, 51, 102, 0.4); }
                
                /* 2-COLUMN MASONRY GRID */
                .gp-grid {
                    column-count: 2;
                    column-gap: 8px;
                }
                .gp-gif-wrapper {
                    break-inside: avoid;
                    margin-bottom: 8px;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #262626; 
                    cursor: pointer;
                    position: relative;
                    min-height: 100px; 
                }
                .gp-gif-wrapper:active { filter: brightness(0.8); transform: scale(0.98); }
                .gp-gif {
                    width: 100%;
                    display: block;
                    border-radius: 8px;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .gp-gif.loaded { opacity: 1; }

                /* LOADING EFFECTS */
                .shimmer {
                    background: linear-gradient(90deg, #222 0%, #333 50%, #222 100%);
                    background-size: 400% 100%;
                    animation: shimmerAnim 1.5s infinite linear;
                }
                @keyframes shimmerAnim {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .loading-text { 
                    color: #888; text-align: center; padding: 20px; font-size: 0.9rem; 
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                }
                .spinner {
                    width: 24px; height: 24px; border: 3px solid #333;
                    border-top-color: #FF6D00; border-radius: 50%;
                    animation: spin 1s infinite linear;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                .empty-state { text-align: center; color: #666; padding: 40px 20px; }
                .empty-icon { font-size: 3rem; margin-bottom: 10px; opacity: 0.5; }
            </style>
            
            <div class="gp-header">
                <div class="gp-search-container">
                    <input type="text" class="gp-search" placeholder="Search Tenor...">
                    <button class="gp-clear">&times;</button>
                </div>
            </div>
            
            <div class="gp-nav-pills" id="nav-pills">
                <div class="gp-pill active" data-query="">Trending</div>
                <div class="gp-pill" data-query="reactions">Reactions</div>
                <div class="gp-pill" data-query="anime">Anime</div>
                <div class="gp-pill" data-query="memes">Memes</div>
                <div class="gp-pill" data-query="gaming">Gaming</div>
                <div class="gp-pill" data-query="sports">Sports</div>
                <div class="gp-pill" data-query="music">Music</div>
            </div>

            <div class="gp-body" id="gif-body">
                <div class="loading-text"><div class="spinner"></div>Initializing Quantum Engine...</div>
            </div>
        `;
    }

    setupEvents() {
        const searchInput = this.shadowRoot.querySelector('.gp-search');
        const clearBtn = this.shadowRoot.querySelector('.gp-clear');
        const body = this.shadowRoot.getElementById('gif-body');
        const pills = this.shadowRoot.querySelectorAll('.gp-pill');
        
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            this.lastSearchedTerm = val;
            clearBtn.style.display = val ? 'block' : 'none';
            pills.forEach(p => p.classList.remove('active'));

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.executeSearch(val);
            }, 500); 
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.lastSearchedTerm = '';
            clearBtn.style.display = 'none';
            pills.forEach(p => p.classList.remove('active'));
            pills[0].classList.add('active'); 
            this.loadInitialViews(); 
        });

        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                
                const query = pill.getAttribute('data-query');
                searchInput.value = query; 
                this.lastSearchedTerm = query;
                clearBtn.style.display = query ? 'block' : 'none';
                
                if (query === "") {
                    this.loadInitialViews(); 
                } else {
                    this.executeSearch(query);
                }
            });
        });

        // Infinite Scroll
        body.addEventListener('scroll', () => {
            if (this.lastSearchedTerm && !this.isFetchingMore && this.nextPos) {
                const scrollDistanceToBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
                if (scrollDistanceToBottom < 200) {
                    this.loadMoreGifs();
                }
            }
        });
    }

    // ==========================================
    //  DATA LOADING & SECTION MANAGEMENT
    // ==========================================

    async loadInitialViews(isSilentUpdate = false) {
        const body = this.shadowRoot.getElementById('gif-body');
        
        if (!isSilentUpdate) {
            body.innerHTML = '<div class="loading-text"><div class="spinner"></div>Loading...</div>';
        }

        const aiMoodData = this.calculateChatMood();
        const smartQuery = this.getSmartSuggestionQuery();
        
        // Parallel fetching using Tenor endpoints
        const [vibeGifs, smartGifs, trendingGifs] = await Promise.all([
            aiMoodData ? this.fetchUniversalGifs('search', aiMoodData.query, 8) : Promise.resolve(null),
            this.fetchUniversalGifs('search', smartQuery, 8),
            this.fetchUniversalGifs('trending', '', 16)
        ]);

        body.innerHTML = ''; 

        // 1. Render Recents
        if (this.recentGifs.length > 0) {
            this.renderSection(body, 'recents', 'Recent', this.recentGifs);
        }

        // 2. Render AI Chat Vibe
        this.lastMoodName = aiMoodData ? aiMoodData.name : null;
        if (vibeGifs && vibeGifs.results.length > 0) {
            this.renderSection(body, 'chatmood', `Chat Vibe: ${aiMoodData.name}`, vibeGifs.results, 'vibe-glow');
        }

        // 3. Render Smart AI
        if (smartGifs && smartGifs.results.length > 0) {
            this.renderSection(body, 'suggested', 'Smart AI', smartGifs.results, 'ai-glow');
        }

        // 4. Render Trending
        if (trendingGifs && trendingGifs.results.length > 0) {
            this.renderSection(body, 'trending', 'Trending Now', trendingGifs.results);
        }
        
        this.nextPos = null; 
    }

    async executeSearch(query) {
        const body = this.shadowRoot.getElementById('gif-body');
        
        this.nextPos = null;
        this.isFetchingMore = false;

        body.innerHTML = `
            <div class="gp-category-title">Results for "${query}"</div>
            <div class="gp-grid" id="search-grid"></div>
            <div class="loading-text" id="scroll-loader"><div class="spinner"></div></div>
        `;
        
        const grid = this.shadowRoot.getElementById('search-grid');
        
        for(let i=0; i<12; i++) this.appendSkeleton(grid);

        const response = await this.fetchUniversalGifs('search', query, 24);
        grid.innerHTML = ''; 

        if (response.results.length === 0) {
            body.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🤷</div>
                    <div>No GIFs found for "${query}"</div>
                </div>`;
            return;
        }

        this.appendGifsToGrid(grid, response.results);
        this.nextPos = response.next;

        if (!this.nextPos || this.nextPos === "0") {
            this.shadowRoot.getElementById('scroll-loader').style.display = 'none';
        }
    }

    async loadMoreGifs() {
        this.isFetchingMore = true;
        const grid = this.shadowRoot.getElementById('search-grid');
        const loader = this.shadowRoot.getElementById('scroll-loader');
        
        if(loader) loader.style.display = 'flex';

        const response = await this.fetchUniversalGifs('search', this.lastSearchedTerm, 20, this.nextPos);
        
        if (response.results.length > 0) {
            this.appendGifsToGrid(grid, response.results);
            this.nextPos = response.next;
        }

        if (!this.nextPos || this.nextPos === "0") {
            this.nextPos = null;
            if(loader) loader.style.display = 'none';
        }
        this.isFetchingMore = false;
    }

    // ==========================================
    //  DOM CONSTRUCTION HELPERS
    // ==========================================

    renderSection(container, id, titleText, gifsArray, titleClass = '') {
        const section = document.createElement('div');
        section.id = `cat-${id}`;
        
        const title = document.createElement('div');
        title.className = `gp-category-title ${titleClass}`;
        title.innerText = titleText;
        
        const grid = document.createElement('div');
        grid.className = 'gp-grid';

        this.appendGifsToGrid(grid, gifsArray);

        section.appendChild(title);
        section.appendChild(grid);
        container.appendChild(section);
    }

    appendGifsToGrid(gridElement, gifsArray) {
        gifsArray.forEach(gif => {
            const wrapper = document.createElement('div');
            wrapper.className = 'gp-gif-wrapper shimmer';
            
            if (gif.width && gif.height) {
                const ratio = gif.height / gif.width;
                wrapper.style.paddingBottom = `${ratio * 100}%`;
            } else {
                wrapper.style.height = '120px';
            }

            const img = document.createElement('img');
            img.className = 'gp-gif';
            img.dataset.src = gif.url; 
            img.alt = gif.title || "GIF";
            img.loading = "lazy"; 
            
            if (gif.width && gif.height) {
                img.style.position = 'absolute';
                img.style.top = '0';
                img.style.left = '0';
                img.style.height = '100%';
            }

            img.onload = () => {
                wrapper.classList.remove('shimmer');
                img.classList.add('loaded');
                wrapper.style.paddingBottom = '0'; 
                img.style.position = 'relative'; 
            };
            
            img.src = gif.url; 

            wrapper.onclick = () => {
                this.addToRecents(gif);
                this.dispatchEvent(new CustomEvent('gif-selected', { 
                    detail: { url: gif.url },
                    bubbles: true, 
                    composed: true 
                }));
            };

            wrapper.appendChild(img);
            gridElement.appendChild(wrapper);
        });
    }

    appendSkeleton(gridElement) {
        const wrapper = document.createElement('div');
        wrapper.className = 'gp-gif-wrapper shimmer';
        const randomHeight = Math.floor(Math.random() * (160 - 90 + 1) + 90);
        wrapper.style.height = `${randomHeight}px`;
        gridElement.appendChild(wrapper);
    }

    addToRecents(gifObj) {
        this.recentGifs = this.recentGifs.filter(g => g.id !== gifObj.id);
        this.recentGifs.unshift(gifObj);
        
        if (this.recentGifs.length > 8) this.recentGifs.pop(); 
        
        localStorage.setItem('goorac_gif_recents', JSON.stringify(this.recentGifs));
    }
}

customElements.define('gif-picker', GifPicker);
