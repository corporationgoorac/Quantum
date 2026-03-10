// Wrap in a closure to prevent variable conflicts
(function() {

    // ==========================================
    // ⚙️ SYSTEM CONFIGURATION
    // ==========================================
    const SUPABASE_URL = "https://ekgsgltykakwopcfyxqu.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3NnbHR5a2Frd29wY2Z5eHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzY3NDcsImV4cCI6MjA4NTg1Mjc0N30.gsh7Zb6JEJcDx_CzVbrPsfcaiyDvl8ws-gUNsQQFWLc";
    const THEME_COLOR = "#ffffff"; // Sleek White/Black theme
    const ACCENT_COLOR = "#0095f6"; 
    const STORAGE_BUCKET = "public-files"; 
    // ==========================================

    class FilePicker extends HTMLElement {
        constructor() {
            super();
            // Network State
            this.supabaseUrl = SUPABASE_URL;
            this.supabaseKey = SUPABASE_KEY;
            this.sbClient = null;
            
            // File State
            this.originalFile = null;
            this.fileType = null;
            this.originalSizeMB = 0;

            // Editor State
            this.videoDuration = 0;
            this.trimStart = 0;
            this.trimEnd = 0;
            this.isPlaying = false;
            
            // Visual State
            this.selectedFilterPreset = 'none'; 
            this.adjustments = {
                brightness: 100,
                contrast: 100,
                saturation: 100
            };
            
            // Text Overlays
            this.textOverlays = []; // Array of { id, text, color, font, size, xPct, yPct }
            this.activeDragElement = null;
            this.dragStartX = 0;
            this.dragStartY = 0;

            // App State
            this.isOpen = false;
            this.mode = 'closed'; // closed | editor | exporting
        }

        connectedCallback() {
            if (!this.querySelector('#fp-file-input')) {
                this.ensureSupabase();
                this.render();
                this.setupEvents();
                this.setupEditorEvents();
                this.setupDragEvents();
                this.setupAdjustments();
            }
        }

        ensureSupabase() {
            if (!window.supabase) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                document.head.appendChild(script);
                script.onload = () => this.initSupabaseClient();
            } else {
                this.initSupabaseClient();
            }
        }

        initSupabaseClient() {
            if(this.supabaseUrl && this.supabaseKey && window.supabase) {
                this.sbClient = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
            }
        }

        // Helper to combine all CSS filters
        getFinalFilter() {
            return `brightness(${this.adjustments.brightness}%) contrast(${this.adjustments.contrast}%) saturate(${this.adjustments.saturation}%) ${this.selectedFilterPreset}`;
        }

        // ==========================================
        // 🎨 SLEEK PURE BLACK UI & CSS DEFINITION
        // ==========================================
        render() {
            this.innerHTML = `
            <style>
                :host { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                    display: block; 
                    --fp-bg: #000000;
                    --fp-panel: #121212;
                    --fp-border: #2a2a2a;
                    --fp-text: #ffffff;
                    --fp-subtext: #888888;
                    --fp-accent: #ffffff;
                    --fp-accent-blue: #0095f6;
                    --fp-danger: #ff3b30;
                }
                
                /* --- Base Overlay --- */
                #fp-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: var(--fp-bg); z-index: 10000;
                    display: none; flex-direction: column; overflow: hidden;
                    opacity: 0; transition: opacity 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                #fp-overlay.open { display: flex; opacity: 1; }

                /* --- Top Navigation --- */
                .fp-nav {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 20px 20px; z-index: 50;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%);
                    position: absolute; top: 0; left: 0; width: 100%; box-sizing: border-box;
                }
                .fp-nav-btn {
                    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); 
                    color: white; width: 44px; height: 44px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; backdrop-filter: blur(15px); transition: all 0.2s ease;
                }
                .fp-nav-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
                .fp-nav-btn:active { transform: scale(0.95); }
                .fp-nav-btn svg { width: 22px; height: 22px; fill: white; }
                
                .fp-nav-send {
                    background: var(--fp-accent); color: var(--fp-bg); width: auto; 
                    padding: 0 24px; border-radius: 30px; font-weight: 700; font-size: 15px; 
                    gap: 8px; border: none; letter-spacing: 0.5px;
                }
                .fp-nav-send svg { width: 18px; height: 18px; fill: var(--fp-bg); }
                .fp-nav-send:disabled { opacity: 0.5; cursor: not-allowed; }

                /* --- Editor Preview Area --- */
                .fp-workspace {
                    flex: 1; position: relative; width: 100%; height: 100%;
                    display: flex; align-items: center; justify-content: center;
                    overflow: hidden; background: var(--fp-bg); 
                    margin-top: 80px; margin-bottom: 220px;
                }
                .fp-preview-container {
                    position: relative; max-width: 100%; max-height: 100%;
                    border-radius: 20px; overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.9);
                }
                #fp-video-preview {
                    display: block; width: auto; height: auto;
                    max-width: 100vw; max-height: calc(100vh - 300px);
                    object-fit: contain; transition: filter 0.1s ease-out;
                    background: #0a0a0a;
                }
                
                /* Play/Pause Overlay */
                .fp-play-btn {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 70px; height: 70px; background: rgba(0,0,0,0.5);
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(10px); cursor: pointer; z-index: 10;
                    border: 1px solid rgba(255,255,255,0.2); transition: opacity 0.3s;
                }
                .fp-play-btn svg { width: 30px; height: 30px; fill: white; margin-left: 4px; }
                .fp-play-btn.hidden { opacity: 0; pointer-events: none; }

                /* Text Overlay Layer */
                #fp-text-layer {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    pointer-events: none; overflow: hidden; z-index: 15;
                }
                .fp-text-element {
                    position: absolute; pointer-events: auto;
                    font-weight: 800; text-shadow: 2px 2px 8px rgba(0,0,0,0.8);
                    cursor: grab; padding: 10px; user-select: none;
                    transform: translate(-50%, -50%); 
                    white-space: pre-wrap; text-align: center; line-height: 1.2;
                    border: 1px dashed transparent; transition: border 0.2s;
                }
                .fp-text-element:hover { border: 1px dashed rgba(255,255,255,0.5); }
                .fp-text-element:active { cursor: grabbing; border: 1px dashed white; }

                /* --- Bottom Toolbar (Sleek Dark Mode) --- */
                .fp-toolbar {
                    position: absolute; bottom: 0; left: 0; width: 100%;
                    background: rgba(10,10,10,0.85); padding: 20px 15px 35px 15px;
                    box-sizing: border-box; border-top: 1px solid rgba(255,255,255,0.08);
                    display: flex; flex-direction: column; gap: 20px; z-index: 50;
                    backdrop-filter: blur(20px); border-radius: 24px 24px 0 0;
                }
                
                /* Main Tool Tabs */
                .fp-tools-menu {
                    display: flex; justify-content: space-around; align-items: center; width: 100%;
                }
                .fp-tool-btn {
                    background: transparent; border: none; color: var(--fp-subtext);
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    font-size: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s;
                }
                .fp-tool-btn svg { width: 24px; height: 24px; fill: var(--fp-subtext); transition: fill 0.2s; }
                .fp-tool-btn.active { color: var(--fp-accent); transform: translateY(-2px); }
                .fp-tool-btn.active svg { fill: var(--fp-accent); }

                /* --- Tool Panels (Drawers) --- */
                .fp-panel { display: none; width: 100%; padding: 0 5px; box-sizing: border-box; animation: slideUp 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
                .fp-panel.active { display: block; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

                /* Trimmer Panel */
                .fp-trim-info { display: flex; justify-content: space-between; color: white; font-size: 13px; margin-bottom: 15px; font-weight: 600; font-variant-numeric: tabular-nums; padding: 0 5px;}
                .fp-trim-track { position: relative; height: 44px; background: rgba(255,255,255,0.1); border-radius: 8px; margin: 0 10px;}
                .fp-trim-fill { position: absolute; height: 100%; background: rgba(255, 255, 255, 0.15); border-left: 4px solid var(--fp-accent); border-right: 4px solid var(--fp-accent); pointer-events: none; border-radius: 4px;}
                .fp-range-input { position: absolute; top: 0; width: 100%; height: 100%; appearance: none; background: transparent; pointer-events: none; margin:0; left:0;}
                .fp-range-input::-webkit-slider-thumb { pointer-events: auto; appearance: none; width: 24px; height: 48px; background: white; border-radius: 6px; cursor: ew-resize; box-shadow: 0 0 15px rgba(0,0,0,0.8); }

                /* Adjustments Panel (Sliders) */
                .fp-adjust-group { display: flex; flex-direction: column; gap: 15px; }
                .fp-slider-row { display: flex; align-items: center; gap: 15px; }
                .fp-slider-label { color: white; font-size: 12px; width: 30px; display: flex; justify-content: center;}
                .fp-slider-label svg { width: 18px; height: 18px; fill: #aaa; }
                .fp-adjust-slider { flex: 1; appearance: none; height: 4px; background: #333; border-radius: 2px; outline: none; }
                .fp-adjust-slider::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: white; cursor: pointer; }

                /* Filters Panel */
                .fp-filter-scroll { display: flex; overflow-x: auto; gap: 15px; padding-bottom: 10px; scrollbar-width: none; }
                .fp-filter-scroll::-webkit-scrollbar { display: none; }
                .fp-filter-item { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; }
                .fp-filter-thumb { width: 64px; height: 76px; border-radius: 12px; background: #222; overflow: hidden; position: relative; border: 2px solid transparent; transition: all 0.2s;}
                .fp-filter-item.active .fp-filter-thumb { border-color: var(--fp-accent); transform: scale(1.05);}
                .fp-filter-name { color: var(--fp-subtext); font-size: 11px; font-weight: 600; letter-spacing: 0.5px;}
                .fp-filter-item.active .fp-filter-name { color: white; }

                /* Text Panel */
                .fp-text-controls { display: flex; flex-direction: column; gap: 15px; }
                .fp-text-input-wrap { display: flex; gap: 10px; }
                .fp-text-input { flex: 1; background: #222; border: 1px solid #333; color: white; padding: 14px 16px; border-radius: 12px; font-size: 15px; outline: none; transition: border 0.3s;}
                .fp-text-input:focus { border-color: var(--fp-accent-blue); }
                .fp-add-text-btn { background: white; color: black; border: none; border-radius: 12px; padding: 0 20px; font-weight: 700; cursor: pointer; transition: transform 0.1s;}
                .fp-add-text-btn:active { transform: scale(0.95); }
                
                .fp-text-options { display: flex; gap: 15px; align-items: center; }
                .fp-font-select { background: #222; color: white; border: none; padding: 10px; border-radius: 8px; outline: none; font-size: 13px; font-weight: 600;}
                .fp-size-slider { flex: 1; appearance: none; height: 4px; background: #333; border-radius: 2px; outline: none; }
                .fp-size-slider::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; border-radius: 50%; background: white; cursor: pointer; }
                
                .fp-color-picker { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none;}
                .fp-color-picker::-webkit-scrollbar { display: none; }
                .fp-color-dot { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.5);}
                .fp-color-dot.active { border-color: white; transform: scale(1.15); }

                /* ==========================================
                   🎬 EXPORT SCREEN (SCREENSHOT STYLE)
                   ========================================== */
                #fp-export-screen {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: var(--fp-bg); z-index: 20000;
                    display: none; flex-direction: column; align-items: center;
                }
                #fp-export-screen.active { display: flex; }
                
                .fp-export-header {
                    margin-top: 80px; display: flex; flex-direction: column; align-items: center; text-align: center;
                }
                .fp-export-pct { font-size: 42px; font-weight: 800; color: white; margin-bottom: 12px; font-variant-numeric: tabular-nums; letter-spacing: -1px;}
                .fp-export-sub { color: #aaaaaa; font-size: 15px; max-width: 300px; line-height: 1.5; font-weight: 500;}

                /* SVG Border Container */
                .fp-export-visual {
                    position: relative; margin-top: 50px; 
                    width: 75vw; max-width: 340px; aspect-ratio: 9/16;
                    display: flex; align-items: center; justify-content: center;
                }
                
                #fp-export-video {
                    position: absolute; width: calc(100% - 16px); height: calc(100% - 16px);
                    object-fit: cover; border-radius: 20px; background: #0a0a0a; z-index: 2;
                }

                .fp-svg-border {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 3;
                    pointer-events: none;
                }
                
                .fp-svg-rect-bg {
                    fill: none; stroke: #1a1a1a; stroke-width: 8; rx: 28; ry: 28;
                }
                .fp-svg-rect-fg {
                    fill: none; stroke: url(#exportGradient); stroke-width: 8; rx: 28; ry: 28;
                    stroke-linecap: round;
                    transition: stroke-dashoffset 0.1s linear;
                    filter: drop-shadow(0 0 12px rgba(0, 242, 254, 0.4));
                }

                /* Hidden elements for processing */
                #fp-hidden-canvas { display: none; }
                #fp-file-input { display: none; }
            </style>

            <input type="file" id="fp-file-input" accept="video/*,image/*,.pdf,audio/*">
            <canvas id="fp-hidden-canvas"></canvas>

            <div id="fp-overlay">
                
                <div class="fp-nav">
                    <button class="fp-nav-btn" id="fp-btn-close">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                    <button class="fp-nav-btn fp-nav-send" id="fp-btn-send">
                        Send
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>

                <div class="fp-workspace" id="fp-workspace">
                    <div class="fp-preview-container" id="fp-preview-wrap">
                        <video id="fp-video-preview" playsinline loop></video>
                        <div class="fp-play-btn" id="fp-play-btn">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                        <div id="fp-text-layer"></div>
                    </div>
                </div>

                <div class="fp-toolbar" id="fp-toolbar">
                    
                    <div class="fp-panel active" id="panel-trim">
                        <div class="fp-trim-info">
                            <span>Trim Video</span>
                            <span id="fp-trim-text">0:00 - 0:00</span>
                        </div>
                        <div class="fp-trim-track">
                            <div class="fp-trim-fill" id="fp-trim-fill"></div>
                            <input type="range" class="fp-range-input" id="fp-trim-start" min="0" max="100" value="0" step="0.1">
                            <input type="range" class="fp-range-input" id="fp-trim-end" min="0" max="100" value="100" step="0.1">
                        </div>
                    </div>

                    <div class="fp-panel" id="panel-adjust">
                        <div class="fp-adjust-group">
                            <div class="fp-slider-row">
                                <div class="fp-slider-label"><svg viewBox="0 0 24 24"><path d="M20 15.31L23.31 12 20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg></div>
                                <input type="range" class="fp-adjust-slider" id="fp-adj-brightness" min="50" max="150" value="100">
                            </div>
                            <div class="fp-slider-row">
                                <div class="fp-slider-label"><svg viewBox="0 0 24 24"><path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm1-17.93c3.94.49 7 3.85 7 7.93s-3.05 7.44-7 7.93V4.07z"/></svg></div>
                                <input type="range" class="fp-adjust-slider" id="fp-adj-contrast" min="50" max="150" value="100">
                            </div>
                            <div class="fp-slider-row">
                                <div class="fp-slider-label"><svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.41 2.26-4.39C12.91 3.04 12.46 3 12 3z"/></svg></div>
                                <input type="range" class="fp-adjust-slider" id="fp-adj-saturation" min="0" max="200" value="100">
                            </div>
                        </div>
                    </div>

                    <div class="fp-panel" id="panel-filter">
                        <div class="fp-filter-scroll" id="fp-filter-list">
                            </div>
                    </div>

                    <div class="fp-panel" id="panel-text">
                        <div class="fp-text-controls">
                            <div class="fp-text-input-wrap">
                                <input type="text" class="fp-text-input" id="fp-text-input" placeholder="Type something..." autocomplete="off">
                                <button class="fp-add-text-btn" id="fp-btn-add-text">Add</button>
                            </div>
                            <div class="fp-text-options">
                                <select class="fp-font-select" id="fp-font-select">
                                    <option value="system-ui">Classic</option>
                                    <option value="Impact">Impact</option>
                                    <option value="Courier New">Mono</option>
                                    <option value="Georgia">Typewriter</option>
                                    <option value="Comic Sans MS">Comic</option>
                                </select>
                                <input type="range" class="fp-size-slider" id="fp-text-size" min="20" max="100" value="40">
                            </div>
                            <div class="fp-color-picker" id="fp-color-picker">
                                </div>
                        </div>
                    </div>

                    <div class="fp-tools-menu">
                        <button class="fp-tool-btn active" data-panel="panel-trim">
                            <svg viewBox="0 0 24 24"><path d="M9 3L5 6.99h3V14h2V6.99h3L9 3zm7 14.01V10h-2v7.01h-3L15 21l4-3.99h-3z"/></svg>
                            Trim
                        </button>
                        <button class="fp-tool-btn" data-panel="panel-adjust">
                            <svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>
                            Adjust
                        </button>
                        <button class="fp-tool-btn" data-panel="panel-filter">
                            <svg viewBox="0 0 24 24"><path d="M19.03 7.39l1.42-1.42c-.45-.51-.9-.97-1.41-1.41L17.62 6c-1.55-1.26-3.5-2-5.62-2-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10c0-2.12-.74-4.07-2-5.62zM12 22c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>
                            Effects
                        </button>
                        <button class="fp-tool-btn" data-panel="panel-text">
                            <svg viewBox="0 0 24 24"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>
                            Text
                        </button>
                    </div>
                </div>

                <div id="fp-export-screen">
                    <div class="fp-export-header">
                        <div class="fp-export-pct" id="fp-export-pct">0.0%</div>
                        <div class="fp-export-sub">Please don't close the app. You can choose where to share your video next.</div>
                    </div>
                    
                    <div class="fp-export-visual">
                        <svg class="fp-svg-border" width="100%" height="100%" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="exportGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#ff0050" />
                                    <stop offset="50%" stop-color="#8a2387" />
                                    <stop offset="100%" stop-color="#00f2fe" />
                                </linearGradient>
                            </defs>
                            <rect class="fp-svg-rect-bg" width="100%" height="100%" />
                            <rect class="fp-svg-rect-fg" id="fp-progress-rect" width="100%" height="100%" />
                        </svg>
                        <video id="fp-export-video" muted playsinline></video>
                    </div>
                </div>

            </div>
            `;
        }

        // ==========================================
        // 🎛️ EVENT LISTENERS & SETUP
        // ==========================================
        setupEvents() {
            const input = this.querySelector('#fp-file-input');
            const closeBtn = this.querySelector('#fp-btn-close');
            const sendBtn = this.querySelector('#fp-btn-send');
            
            input.addEventListener('change', (e) => {
                if (e.target.files.length > 0) this.handleFileSelect(e.target.files[0]);
            });

            closeBtn.addEventListener('click', () => {
                if (this.mode !== 'closed') history.back();
            });

            window.addEventListener('popstate', () => {
                if (this.mode !== 'closed') this.hideUI();
            });

            sendBtn.addEventListener('click', () => this.startPipeline());

            // Initialize Advanced Filters
            const filters = [
                { name: 'Original', value: 'none' },
                { name: 'Mono', value: 'grayscale(100%)' },
                { name: 'Noir', value: 'grayscale(100%) contrast(150%) brightness(80%)' },
                { name: 'Sepia', value: 'sepia(100%)' },
                { name: 'Vintage', value: 'sepia(80%) contrast(120%) saturate(110%)' },
                { name: 'Cool', value: 'hue-rotate(180deg) saturate(150%)' },
                { name: 'Warm', value: 'sepia(30%) saturate(200%) hue-rotate(-20deg)' },
                { name: 'Pop', value: 'contrast(130%) saturate(150%)' },
                { name: 'Cinematic', value: 'contrast(110%) saturate(80%) brightness(90%)' },
                { name: 'Invert', value: 'invert(100%)' }
            ];
            
            const filterList = this.querySelector('#fp-filter-list');
            filters.forEach((f, i) => {
                const el = document.createElement('div');
                el.className = `fp-filter-item ${i===0 ? 'active' : ''}`;
                // Small preview of the filter applied to a grey box
                el.innerHTML = `<div class="fp-filter-thumb" style="filter: ${f.value}; background: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23888%22/><circle cx=%2250%25%22 cy=%2250%25%22 r=%2230%25%22 fill=%22%23fff%22/></svg>') center/cover;"></div><div class="fp-filter-name">${f.name}</div>`;
                el.onclick = () => {
                    this.querySelectorAll('.fp-filter-item').forEach(e => e.classList.remove('active'));
                    el.classList.add('active');
                    this.selectedFilterPreset = f.value;
                    this.updateVideoFilter();
                };
                filterList.appendChild(el);
            });

            // Initialize Colors for Text
            const colors = ['#ffffff', '#000000', '#ff3b30', '#ff9500', '#34c759', '#0095f6', '#5856d6', '#ff2d55', '#e4e4e6'];
            const colorPicker = this.querySelector('#fp-color-picker');
            let activeColor = '#ffffff';
            colors.forEach((c, i) => {
                const el = document.createElement('div');
                el.className = `fp-color-dot ${i===0 ? 'active' : ''}`;
                el.style.backgroundColor = c;
                el.onclick = () => {
                    this.querySelectorAll('.fp-color-dot').forEach(e => e.classList.remove('active'));
                    el.classList.add('active');
                    activeColor = c;
                };
                colorPicker.appendChild(el);
            });

            // Text Tool Logic
            this.querySelector('#fp-btn-add-text').addEventListener('click', () => {
                const input = this.querySelector('#fp-text-input');
                const fontSelect = this.querySelector('#fp-font-select');
                const sizeSlider = this.querySelector('#fp-text-size');
                
                if(input.value.trim() === '') return;
                
                this.addTextOverlay({
                    id: Date.now(),
                    text: input.value,
                    color: activeColor,
                    font: fontSelect.value,
                    size: parseInt(sizeSlider.value),
                    xPct: 50, 
                    yPct: 50
                });
                input.value = '';
            });

            // Panel Toggles (Tabs)
            this.querySelectorAll('.fp-tool-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.querySelectorAll('.fp-tool-btn').forEach(b => b.classList.remove('active'));
                    this.querySelectorAll('.fp-panel').forEach(p => p.classList.remove('active'));
                    
                    const panelId = btn.currentTarget.getAttribute('data-panel');
                    btn.currentTarget.classList.add('active');
                    this.querySelector(`#${panelId}`).classList.add('active');
                });
            });
        }

        setupAdjustments() {
            const bSlider = this.querySelector('#fp-adj-brightness');
            const cSlider = this.querySelector('#fp-adj-contrast');
            const sSlider = this.querySelector('#fp-adj-saturation');

            const update = () => {
                this.adjustments.brightness = bSlider.value;
                this.adjustments.contrast = cSlider.value;
                this.adjustments.saturation = sSlider.value;
                this.updateVideoFilter();
            };

            bSlider.addEventListener('input', update);
            cSlider.addEventListener('input', update);
            sSlider.addEventListener('input', update);
        }

        updateVideoFilter() {
            const video = this.querySelector('#fp-video-preview');
            video.style.filter = this.getFinalFilter();
        }

        // ==========================================
        // 🎬 PLAYBACK & THUMBNAIL LOGIC
        // ==========================================
        setupEditorEvents() {
            const video = this.querySelector('#fp-video-preview');
            const playBtn = this.querySelector('#fp-play-btn');
            const startRange = this.querySelector('#fp-trim-start');
            const endRange = this.querySelector('#fp-trim-end');

            video.addEventListener('loadedmetadata', () => {
                if(this.fileType !== 'video') return;
                this.videoDuration = video.duration;
                this.trimStart = 0;
                this.trimEnd = video.duration;
                
                startRange.max = video.duration;
                endRange.max = video.duration;
                startRange.value = 0;
                endRange.value = video.duration;
                
                this.updateTrimmerUI();
                
                // 🛑 Force Thumbnail: Jump to 0.1s and pause
                video.currentTime = 0.1;
                video.pause();
                this.isPlaying = false;
                playBtn.classList.remove('hidden');
            });

            // Play/Pause Toggle
            playBtn.addEventListener('click', () => {
                video.play();
                this.isPlaying = true;
                playBtn.classList.add('hidden');
            });

            video.addEventListener('click', () => {
                if (this.isPlaying) {
                    video.pause();
                    this.isPlaying = false;
                    playBtn.classList.remove('hidden');
                }
            });

            // Loop playback within trim range
            video.addEventListener('timeupdate', () => {
                if (this.isPlaying && video.currentTime >= this.trimEnd) {
                    video.currentTime = this.trimStart;
                }
            });

            const handleTrim = (isStart) => {
                let s = parseFloat(startRange.value);
                let e = parseFloat(endRange.value);
                
                // Maintain 1 second minimum
                if (s > e - 1) {
                    if (isStart) { startRange.value = e - 1; s = e - 1; }
                    else { endRange.value = s + 1; e = s + 1; }
                }
                
                this.trimStart = s;
                this.trimEnd = e;
                
                // When dragging sliders, pause video and seek to frame
                video.pause();
                this.isPlaying = false;
                playBtn.classList.remove('hidden');
                video.currentTime = isStart ? this.trimStart : this.trimEnd;
                
                this.updateTrimmerUI();
            };

            startRange.addEventListener('input', () => handleTrim(true));
            endRange.addEventListener('input', () => handleTrim(false));
        }

        updateTrimmerUI() {
            const fill = this.querySelector('#fp-trim-fill');
            const display = this.querySelector('#fp-trim-text');
            const duration = this.videoDuration || 100;
            
            const leftPct = (this.trimStart / duration) * 100;
            const widthPct = ((this.trimEnd - this.trimStart) / duration) * 100;

            fill.style.left = leftPct + '%';
            fill.style.width = widthPct + '%';
            display.innerText = `${this.formatTime(this.trimStart)} - ${this.formatTime(this.trimEnd)}`;
        }

        formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${m}:${s < 10 ? '0'+s : s}`;
        }

        // ==========================================
        // ✍️ DRAGGABLE TEXT LOGIC
        // ==========================================
        addTextOverlay(textObj) {
            this.textOverlays.push(textObj);
            this.renderTextOverlays();
        }

        renderTextOverlays() {
            const layer = this.querySelector('#fp-text-layer');
            layer.innerHTML = '';
            
            this.textOverlays.forEach(t => {
                const el = document.createElement('div');
                el.className = 'fp-text-element';
                el.innerText = t.text;
                el.style.color = t.color;
                el.style.fontSize = `${t.size}px`;
                el.style.fontFamily = t.font;
                el.style.left = `${t.xPct}%`;
                el.style.top = `${t.yPct}%`;
                el.setAttribute('data-id', t.id);
                layer.appendChild(el);
            });
        }

        setupDragEvents() {
            const layer = this.querySelector('#fp-text-layer');
            
            const getCoords = (e) => {
                if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                return { x: e.clientX, y: e.clientY };
            };

            const startDrag = (e) => {
                if (e.target.classList.contains('fp-text-element')) {
                    this.activeDragElement = e.target;
                    const coords = getCoords(e);
                    
                    this.dragStartX = coords.x;
                    this.dragStartY = coords.y;
                }
            };

            const doDrag = (e) => {
                if (!this.activeDragElement) return;
                e.preventDefault(); // Prevent scrolling while dragging
                
                const coords = getCoords(e);
                const rect = layer.getBoundingClientRect();
                
                const dx = coords.x - this.dragStartX;
                const dy = coords.y - this.dragStartY;
                
                const id = parseInt(this.activeDragElement.getAttribute('data-id'));
                const textObj = this.textOverlays.find(t => t.id === id);
                
                // Convert delta to percentage of container
                const pctX = (dx / rect.width) * 100;
                const pctY = (dy / rect.height) * 100;
                
                let newXPct = textObj.xPct + pctX;
                let newYPct = textObj.yPct + pctY;
                
                // Clamp to screen boundaries
                newXPct = Math.max(5, Math.min(95, newXPct));
                newYPct = Math.max(5, Math.min(95, newYPct));
                
                this.activeDragElement.style.left = `${newXPct}%`;
                this.activeDragElement.style.top = `${newYPct}%`;
                
                this.dragStartX = coords.x;
                this.dragStartY = coords.y;
                
                textObj.xPct = newXPct;
                textObj.yPct = newYPct;
            };

            const stopDrag = () => {
                this.activeDragElement = null;
            };

            layer.addEventListener('mousedown', startDrag);
            layer.addEventListener('touchstart', startDrag, {passive: false});
            
            document.addEventListener('mousemove', doDrag);
            document.addEventListener('touchmove', doDrag, {passive: false});
            
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);
        }

        // ==========================================
        // 📁 FILE HANDLING
        // ==========================================
        handleFileSelect(file) {
            this.originalFile = file;
            this.originalSizeMB = file.size / (1024 * 1024);
            const mime = file.type;

            this.isOpen = true;
            this.mode = 'editor';
            this.querySelector('#fp-overlay').classList.add('open');
            window.history.pushState({ fpEditorOpen: true }, "");

            if (mime.startsWith('video/')) {
                this.fileType = 'video';
                
                // Setup Video Preview
                const video = this.querySelector('#fp-video-preview');
                const url = URL.createObjectURL(file);
                video.src = url;
                
                // Ensure Toolbar shows
                this.querySelector('#fp-toolbar').style.display = 'flex';
                this.querySelector('.fp-tool-btn[data-panel="panel-trim"]').click();
            } else {
                // If it's an image or doc, skip editor and go straight to upload logic
                this.fileType = 'file';
                this.querySelector('#fp-workspace').innerHTML = `<div style="color:white; font-size:5rem; margin-bottom:20px;">📄</div><div style="color:white; font-weight:600;">${file.name}</div>`;
                this.querySelector('#fp-toolbar').style.display = 'none';
            }
        }

        // ==========================================
        // 📉 DYNAMIC COMPRESSION (THE CORE)
        // ==========================================
        async startPipeline() {
            if (!this.originalFile) return;

            // Non-video files go straight to upload
            if (this.fileType !== 'video') {
                return this.uploadFile(this.originalFile);
            }

            // Pause preview player
            this.querySelector('#fp-video-preview').pause();
            this.isPlaying = false;

            // Show Screenshot-Style Export Screen
            this.mode = 'exporting';
            this.querySelector('#fp-toolbar').style.display = 'none';
            this.querySelector('#fp-workspace').style.display = 'none';
            this.querySelector('.fp-nav-send').style.display = 'none'; // Hide send button
            
            const exportScreen = this.querySelector('#fp-export-screen');
            exportScreen.classList.add('active');
            
            // Setup Export Video Preview (Silent Playback during compression)
            const exportVideo = this.querySelector('#fp-export-video');
            exportVideo.src = URL.createObjectURL(this.originalFile);
            exportVideo.style.filter = this.getFinalFilter();
            exportVideo.currentTime = this.trimStart;
            exportVideo.muted = true; // Crucial: Never play audio out loud here
            await exportVideo.play();

            // Setup SVG Border Length calculation
            const rectFg = this.querySelector('#fp-progress-rect');
            
            // Give DOM layout a tick to calculate dimensions accurately
            setTimeout(async () => {
                const rectLength = rectFg.getTotalLength() || 1500;
                rectFg.style.strokeDasharray = rectLength;
                rectFg.style.strokeDashoffset = rectLength;
                
                try {
                    const compressedFile = await this.executeCanvasCompression(exportVideo, rectFg, rectLength);
                    this.uploadFile(compressedFile);
                } catch (e) {
                    console.error("Pipeline Error:", e);
                    alert("Compression couldn't complete. We will upload the original file.");
                    this.uploadFile(this.originalFile);
                }
            }, 100);
        }

        async executeCanvasCompression(exportVideo, rectFg, rectLength) {
            return new Promise((resolve, reject) => {
                
                // 1. Dynamic Bitrate Calculation (Relative Quality)
                // Ratio: 60MB targets ~2MB. 120MB targets ~4MB.
                const ratio = Math.max((this.originalSizeMB / 60), 0.5); 
                const targetSizeMB = Math.max(ratio * 2, 1); 
                const exportDuration = this.trimEnd - this.trimStart;
                
                // Bitrate = (Megabytes * 8 bits * 1024 * 1024) / Seconds
                let calculatedBitrate = Math.floor((targetSizeMB * 8388608) / exportDuration);
                
                // Hard Caps so we don't destroy quality or make it massive
                const MIN_BITRATE = 300000;  // 300kbps (Absolute lowest acceptable)
                const MAX_BITRATE = 3000000; // 3.0Mbps (Highest necessary for web mobile)
                calculatedBitrate = Math.max(MIN_BITRATE, Math.min(MAX_BITRATE, calculatedBitrate));

                // 2. Setup Canvas
                const canvas = this.querySelector('#fp-hidden-canvas');
                const ctx = canvas.getContext('2d');
                
                // Restrict resolution to save memory (e.g. 480p-720p equivalent)
                const MAX_DIMENSION = 720;
                let w = exportVideo.videoWidth;
                let h = exportVideo.videoHeight;
                if (Math.max(w, h) > MAX_DIMENSION) {
                    const scale = MAX_DIMENSION / Math.max(w, h);
                    w = Math.floor(w * scale);
                    h = Math.floor(h * scale);
                }
                canvas.width = w;
                canvas.height = h;

                // 3. Audio Extraction via Web Audio API
                // This routes the audio into the recording stream, but prevents it from playing on the phone speakers
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioCtx.createMediaElementSource(exportVideo);
                const dest = audioCtx.createMediaStreamDestination();
                source.connect(dest); 

                // 4. Capture Stream & Initialize Recorder
                const videoStream = canvas.captureStream(24); // Force 24 FPS for cinematic look + data saving
                const audioStream = dest.stream;
                
                const combinedStream = new MediaStream([
                    ...videoStream.getVideoTracks(),
                    ...audioStream.getAudioTracks()
                ]);

                const recorder = new MediaRecorder(combinedStream, {
                    videoBitsPerSecond: calculatedBitrate,
                    audioBitsPerSecond: 64000 // 64kbps is perfect for clear voice
                });

                const chunks = [];
                recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/mp4' });
                    const file = new File([blob], `quantum_optimized_${Date.now()}.mp4`, { type: 'video/mp4' });
                    audioCtx.close();
                    resolve(file);
                };

                recorder.start();

                // 5. Render Loop (Drawing to Canvas)
                const pctText = this.querySelector('#fp-export-pct');
                const finalFilter = this.getFinalFilter();
                
                const drawFrame = () => {
                    // Check if we hit the user's trim point
                    if (exportVideo.currentTime >= this.trimEnd || exportVideo.paused || exportVideo.ended) {
                        if(recorder.state === "recording") recorder.stop();
                        exportVideo.pause();
                        pctText.innerText = "100%";
                        rectFg.style.strokeDashoffset = 0; // Close the SVG loop
                        return;
                    }

                    // A. Draw Video with combined filters (Brightness/Contrast + Preset)
                    ctx.filter = finalFilter;
                    ctx.drawImage(exportVideo, 0, 0, w, h);
                    
                    // B. Draw Draggable Text Overlays
                    ctx.filter = 'none'; // reset filter so text isn't affected
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    this.textOverlays.forEach(t => {
                        // Scale font size relative to canvas dimension vs screen dimension
                        // Rough estimate: canvas is 'w' wide, screen is usually ~350px wide. 
                        const scaleFactor = w / 350; 
                        ctx.font = `800 ${t.size * scaleFactor}px ${t.font}`;
                        ctx.fillStyle = t.color;
                        ctx.shadowColor = 'rgba(0,0,0,0.9)';
                        ctx.shadowBlur = 12 * scaleFactor;
                        
                        const x = w * (t.xPct / 100);
                        const y = h * (t.yPct / 100);
                        ctx.fillText(t.text, x, y);
                    });

                    // C. Update Progress UI
                    const progress = (exportVideo.currentTime - this.trimStart) / exportDuration;
                    const safeProgress = Math.max(0, Math.min(1, progress));
                    
                    pctText.innerText = (safeProgress * 100).toFixed(1) + "%";
                    // Animate SVG Border line length
                    rectFg.style.strokeDashoffset = rectLength - (rectLength * safeProgress);

                    requestAnimationFrame(drawFrame);
                };
                
                drawFrame();
                
                // Fallback in case of weird video end events
                exportVideo.onended = () => {
                    if(recorder.state === "recording") recorder.stop();
                };

            });
        }

        // ==========================================
        // ☁️ UPLOAD TO SUPABASE
        // ==========================================
        async uploadFile(finalFile) {
            if (!this.sbClient) {
                this.initSupabaseClient();
            }

            const pctText = this.querySelector('#fp-export-pct');
            const subText = this.querySelector('.fp-export-sub');
            const rectFg = this.querySelector('#fp-progress-rect');
            const rectLength = rectFg.getTotalLength() || 1500;
            
            // Re-purpose the UI for Final Upload Progress
            pctText.innerText = "Sending...";
            const sizeInMB = (finalFile.size / (1024*1024)).toFixed(2);
            subText.innerText = `Final Size: ${sizeInMB} MB. Uploading to secure cloud.`;
            
            rectFg.style.strokeDashoffset = rectLength; // reset border
            rectFg.style.stroke = "#34c759"; // change border to success green for upload phase

            const fileName = `${Date.now()}_${finalFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

            try {
                // Simulate Upload Progress for smooth UI feel
                let simProgress = 0;
                const uploadInterval = setInterval(() => {
                    if(simProgress < 0.9) {
                        simProgress += 0.08;
                        rectFg.style.strokeDashoffset = rectLength - (rectLength * simProgress);
                    }
                }, 300);

                const { data, error } = await this.sbClient.storage.from(STORAGE_BUCKET).upload(fileName, finalFile, { cacheControl: '3600', upsert: false });

                clearInterval(uploadInterval);
                if (error) throw error;

                rectFg.style.strokeDashoffset = 0; // 100% complete

                const { data: publicData } = this.sbClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
                
                // Dispatch event so your main app can catch the URL
                this.dispatchEvent(new CustomEvent('file-uploaded', {
                    detail: { 
                        url: publicData.publicUrl, 
                        metadata: {
                            name: finalFile.name,
                            size: finalFile.size,
                            type: this.fileType,
                            trimStart: this.trimStart,
                            trimEnd: this.trimEnd,
                            filter: this.selectedFilterPreset,
                            textOverlays: this.textOverlays.length
                        } 
                    },
                    bubbles: true, composed: true
                }));

                setTimeout(() => { if(this.isOpen) history.back(); }, 600);

            } catch (error) {
                console.error(error);
                alert("Upload Failed. Please check your network connection.");
                this.hideUI();
            }
        }

        openPicker() {
            this.querySelector('#fp-file-input').click();
        }

        hideUI() {
            this.isOpen = false;
            this.mode = 'closed';
            this.querySelector('#fp-overlay').classList.remove('open');
            this.querySelector('#fp-export-screen').classList.remove('active');
            
            const prev = this.querySelector('#fp-video-preview');
            const exp = this.querySelector('#fp-export-video');
            prev.pause(); prev.src = "";
            exp.pause(); exp.src = "";
            
            this.selectedFile = null;
            this.originalFile = null;
            this.textOverlays = [];
            this.querySelector('#fp-text-layer').innerHTML = '';
            
            // Reset Adjustments
            this.adjustments = { brightness: 100, contrast: 100, saturation: 100 };
            this.querySelector('#fp-adj-brightness').value = 100;
            this.querySelector('#fp-adj-contrast').value = 100;
            this.querySelector('#fp-adj-saturation').value = 100;
            
            this.querySelector('.fp-nav-send').style.display = 'flex';
        }
    }

    if(!customElements.get('file-picker')) {
        customElements.define('file-picker', FilePicker);
    }
})();
