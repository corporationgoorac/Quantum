// Wrap in a closure to prevent variable conflicts
(function() {

    // ==========================================
    // ⚙️ SYSTEM CONFIGURATION & CONSTANTS
    // ==========================================
    const SUPABASE_URL = "https://ekgsgltykakwopcfyxqu.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3NnbHR5a2Frd29wY2Z5eHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzY3NDcsImV4cCI6MjA4NTg1Mjc0N30.gsh7Zb6JEJcDx_CzVbrPsfcaiyDvl8ws-gUNsQQFWLc";
    const THEME_COLOR = "#000000"; 
    const ACCENT_COLOR = "#0095f6"; 
    const STORAGE_BUCKET = "public-files"; 
    
    // Audio Context reference must be global to the class to bypass mobile autoplay policies
    window.SharedQuantumAudioCtx = null;
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
            this.thumbnailDataUrl = null; 

            // Editor Core State
            this.videoDuration = 0;
            this.trimStart = 0;
            this.trimEnd = 0;
            this.isPlaying = false;
            
            // Advanced Visual State
            this.selectedFilterPreset = 'none'; 
            this.adjustments = {
                brightness: 100,
                contrast: 100,
                saturation: 100
            };
            this.transforms = {
                rotate: 0, 
                flipH: false,
                flipV: false
            };
            this.playbackSpeed = 1.0; 
            
            // Text Engine
            this.textOverlays = []; 
            this.activeDragElement = null;
            this.dragStartX = 0;
            this.dragStartY = 0;

            // App State
            this.isOpen = false;
            this.mode = 'closed'; 
        }

        connectedCallback() {
            if (!this.querySelector('#fp-file-input')) {
                this.ensureSupabase();
                this.render();
                this.setupEvents();
                this.setupEditorEvents();
                this.setupDragEvents();
                this.setupAdjustments();
                this.setupTransforms();
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

        getFinalFilter() {
            return `brightness(${this.adjustments.brightness}%) contrast(${this.adjustments.contrast}%) saturate(${this.adjustments.saturation}%) ${this.selectedFilterPreset}`;
        }
        
        getFinalTransform() {
            let scaleX = this.transforms.flipH ? -1 : 1;
            let scaleY = this.transforms.flipV ? -1 : 1;
            return `rotate(${this.transforms.rotate}deg) scale(${scaleX}, ${scaleY})`;
        }

        // ==========================================
        // 🎨 PRO UI & CSS DEFINITION (PURE BLACK)
        // ==========================================
        render() {
            this.innerHTML = `
            <style>
                file-picker { 
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                    display: block; 
                    --fp-bg: #000000;
                    --fp-panel: #111111;
                    --fp-border: #222222;
                    --fp-text: #ffffff;
                    --fp-subtext: #8e8e93;
                    --fp-accent: #0095f6;
                    --fp-ease: cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                
                /* --- Base Overlay (Forced Black & Fullscreen) --- */
                #fp-overlay {
                    position: fixed !important; top: 0 !important; left: 0 !important; 
                    width: 100vw !important; height: 100vh !important;
                    background-color: var(--fp-bg) !important; z-index: 999999 !important;
                    display: none; flex-direction: column; overflow: hidden;
                    opacity: 0; transition: opacity 0.3s var(--fp-ease);
                    touch-action: none; 
                }
                #fp-overlay.open { display: flex; opacity: 1; }

                /* --- Top Navigation --- */
                .fp-nav {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: max(40px, env(safe-area-inset-top)) 20px 15px 20px; z-index: 100;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%);
                    position: absolute; top: 0; left: 0; width: 100%; box-sizing: border-box;
                    pointer-events: none; /* Let clicks pass through empty space */
                }
                .fp-nav > * { pointer-events: auto; } /* Re-enable clicks on buttons */
                
                .fp-nav-btn {
                    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.05); 
                    color: white; width: 44px; height: 44px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; backdrop-filter: blur(20px); transition: all 0.2s var(--fp-ease);
                }
                .fp-nav-btn:active { transform: scale(0.9); }
                .fp-nav-btn svg { width: 22px; height: 22px; fill: white; }
                
                /* SLEEK SEND ICON */
                .fp-nav-send {
                    background: var(--fp-accent); border: none;
                    width: 46px; height: 46px; border-radius: 50%; 
                    box-shadow: 0 4px 20px rgba(0, 149, 246, 0.5);
                    display: flex; align-items: center; justify-content: center;
                }
                .fp-nav-send svg { width: 20px; height: 20px; fill: white; margin-left: 3px; margin-top: 1px;}
                .fp-nav-send:disabled { opacity: 0.5; box-shadow: none; filter: grayscale(1); }

                /* --- Editor Preview Area --- */
                .fp-workspace {
                    position: absolute; top: 80px; bottom: 230px; left: 0; right: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: var(--fp-bg); z-index: 10; padding: 0 10px;
                    transition: bottom 0.3s var(--fp-ease);
                }
                .fp-preview-container {
                    position: relative; width: 100%; height: 100%; max-width: 100%; max-height: 100%;
                    border-radius: 16px; overflow: hidden;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.8);
                    display: flex; align-items: center; justify-content: center;
                    background: #050505;
                }
                #fp-video-preview {
                    display: block; width: auto; height: auto;
                    max-width: 100%; max-height: 100%;
                    object-fit: contain; transition: filter 0.1s ease-out, transform 0.3s var(--fp-ease);
                }
                
                /* Play/Pause Overlay */
                .fp-play-btn {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 64px; height: 64px; background: rgba(0,0,0,0.5);
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(10px); cursor: pointer; z-index: 20;
                    border: 1px solid rgba(255,255,255,0.2); transition: all 0.3s var(--fp-ease);
                    pointer-events: auto;
                }
                .fp-play-btn svg { width: 28px; height: 28px; fill: white; margin-left: 4px; }
                .fp-play-btn.hidden { opacity: 0; pointer-events: none; transform: translate(-50%, -50%) scale(1.3); }

                /* Text Overlay Layer */
                #fp-text-layer {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    pointer-events: none; overflow: hidden; z-index: 15;
                }
                .fp-text-element {
                    position: absolute; pointer-events: auto;
                    font-weight: 800; text-shadow: 0 2px 8px rgba(0,0,0,0.9);
                    cursor: grab; padding: 8px 14px; user-select: none;
                    transform: translate(-50%, -50%); 
                    white-space: pre-wrap; text-align: center; line-height: 1.2;
                    border: 1.5px dashed transparent; transition: border 0.2s;
                    border-radius: 10px;
                }
                .fp-text-element.has-bg {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.6); text-shadow: none;
                }
                .fp-text-element:active { cursor: grabbing; border: 1.5px dashed rgba(255,255,255,0.8); }

                /* Generic File UI Layer */
                #fp-generic-file-preview {
                    display: none; flex-direction: column; align-items: center; justify-content: center; 
                    width: 100%; height: 100%; padding: 30px; box-sizing: border-box; text-align: center; 
                    background: #0a0a0a; border-radius: 16px;
                }
                #fp-file-icon {
                    font-size: 5rem; margin-bottom: 20px; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
                }
                #fp-file-name {
                    color: white; font-size: 18px; font-weight: 600; word-break: break-word; line-height: 1.4; 
                    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; max-width: 100%;
                }
                #fp-file-size {
                    color: #8e8e93; font-size: 14px; margin-top: 12px; font-weight: 500;
                }

                /* --- Bottom Toolbar (Absolute Positioned for safety) --- */
                .fp-toolbar {
                    position: absolute; bottom: 0; left: 0; width: 100%;
                    background: rgba(15,15,15,0.95); padding: 20px 10px 30px 10px;
                    padding-bottom: env(safe-area-inset-bottom, 30px);
                    box-sizing: border-box; border-top: 1px solid var(--fp-border);
                    display: flex; flex-direction: column; gap: 20px; z-index: 50;
                    backdrop-filter: blur(25px); border-radius: 24px 24px 0 0;
                    pointer-events: auto;
                }
                
                /* Main Tool Tabs */
                .fp-tools-menu {
                    display: flex; justify-content: space-between; align-items: center; 
                    width: 100%; overflow-x: auto; padding: 5px 5px; scrollbar-width: none;
                }
                .fp-tools-menu::-webkit-scrollbar { display: none; }
                .fp-tool-btn {
                    background: transparent; border: none; color: var(--fp-subtext);
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    font-size: 11px; cursor: pointer; font-weight: 600; transition: all 0.2s;
                    min-width: 60px; flex-shrink: 0; position: relative;
                }
                .fp-tool-btn svg { width: 22px; height: 22px; fill: var(--fp-subtext); transition: fill 0.2s; }
                .fp-tool-btn.active { color: white; transform: translateY(-2px); }
                .fp-tool-btn.active svg { fill: white; }
                .fp-tool-btn.active::after {
                    content: ''; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
                    width: 4px; height: 4px; border-radius: 50%; background: white;
                }

                /* --- Tool Panels --- */
                .fp-panel { display: none; width: 100%; padding: 0 10px; box-sizing: border-box; animation: fadeIn 0.3s var(--fp-ease); }
                .fp-panel.active { display: block; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }

                /* Trimmer Panel */
                .fp-trim-info { display: flex; justify-content: space-between; color: white; font-size: 12px; margin-bottom: 12px; font-weight: 700; font-variant-numeric: tabular-nums;}
                .fp-trim-track { position: relative; height: 48px; background: #222; border-radius: 8px; margin: 0 5px; box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);}
                .fp-trim-fill { position: absolute; height: 100%; background: rgba(255, 255, 255, 0.15); border-left: 4px solid white; border-right: 4px solid white; pointer-events: none; border-radius: 6px;}
                .fp-range-input { position: absolute; top: 0; width: 100%; height: 100%; appearance: none; background: transparent; pointer-events: none; margin:0; left:0;}
                .fp-range-input::-webkit-slider-thumb { pointer-events: auto; appearance: none; width: 28px; height: 52px; background: white; border-radius: 6px; cursor: ew-resize; box-shadow: 0 2px 10px rgba(0,0,0,0.8); }

                /* Adjustments Panel */
                .fp-adjust-group { display: flex; flex-direction: column; gap: 20px; padding: 5px 0;}
                .fp-slider-row { display: flex; align-items: center; gap: 15px; }
                .fp-slider-label { color: white; font-size: 12px; width: 30px; display: flex; justify-content: center;}
                .fp-slider-label svg { width: 18px; height: 18px; fill: white; }
                .fp-adjust-slider { flex: 1; appearance: none; height: 4px; background: #333; border-radius: 2px; outline: none; }
                .fp-adjust-slider::-webkit-slider-thumb { appearance: none; width: 22px; height: 22px; border-radius: 50%; background: white; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.8); }

                /* Transform Panel */
                .fp-transform-grid { display: flex; justify-content: space-around; padding: 10px 0;}
                .fp-trans-btn { background: #222; border: 1px solid #333; border-radius: 12px; width: 64px; height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: white; font-size: 11px; cursor: pointer; font-weight: 600; transition: all 0.2s;}
                .fp-trans-btn svg { width: 22px; height: 22px; fill: white; }
                .fp-trans-btn:active { transform: scale(0.92); background: #333; }

                /* Speed Panel */
                .fp-speed-row { display: flex; justify-content: space-between; padding: 10px 0; gap: 12px;}
                .fp-speed-btn { flex: 1; background: #222; border: 1px solid #333; border-radius: 10px; padding: 14px 0; color: white; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;}
                .fp-speed-btn.active { background: white; color: black;}

                /* Filters Panel */
                .fp-filter-scroll { display: flex; overflow-x: auto; gap: 12px; padding-bottom: 5px; scrollbar-width: none; }
                .fp-filter-scroll::-webkit-scrollbar { display: none; }
                .fp-filter-item { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; }
                .fp-filter-thumb { width: 64px; height: 84px; border-radius: 10px; background: #222; overflow: hidden; position: relative; border: 2px solid transparent; transition: all 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.5);}
                .fp-filter-item.active .fp-filter-thumb { border-color: white; transform: scale(1.05);}
                .fp-filter-name { color: var(--fp-subtext); font-size: 11px; font-weight: 600;}
                .fp-filter-item.active .fp-filter-name { color: white; }

                /* Text Panel */
                .fp-text-controls { display: flex; flex-direction: column; gap: 15px; }
                .fp-text-input-wrap { display: flex; gap: 10px; }
                .fp-text-input { flex: 1; background: #222; border: 1px solid #333; color: white; padding: 14px 16px; border-radius: 12px; font-size: 15px; outline: none; transition: border 0.3s;}
                .fp-text-input:focus { border-color: white; }
                .fp-add-text-btn { background: white; color: black; border: none; border-radius: 12px; padding: 0 20px; font-weight: 800; cursor: pointer; transition: transform 0.1s;}
                .fp-add-text-btn:active { transform: scale(0.95); }
                
                .fp-text-options { display: flex; gap: 15px; align-items: center; }
                .fp-font-select { background: #222; color: white; border: 1px solid #333; padding: 10px 12px; border-radius: 8px; outline: none; font-size: 13px; font-weight: 600;}
                .fp-toggle-bg-btn { background: #222; border: 1px solid #333; color: white; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 800; cursor: pointer;}
                .fp-toggle-bg-btn.active { background: white; color: black;}
                
                .fp-color-picker { display: flex; gap: 14px; overflow-x: auto; padding: 5px 0; scrollbar-width: none;}
                .fp-color-picker::-webkit-scrollbar { display: none; }
                .fp-color-dot { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 2px solid rgba(255,255,255,0.2); flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.8); transition: transform 0.2s;}
                .fp-color-dot.active { border-color: white; transform: scale(1.2); }

                /* ==========================================
                   🎬 EXPORT SCREEN (STATIC THUMBNAIL + SVG)
                   ========================================== */
                #fp-export-screen {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: var(--fp-bg); z-index: 200000;
                    display: none; flex-direction: column; align-items: center;
                }
                #fp-export-screen.active { display: flex; }
                
                .fp-export-header {
                    margin-top: 100px; display: flex; flex-direction: column; align-items: center; text-align: center; z-index: 10;
                }
                .fp-export-pct { font-size: 52px; font-weight: 800; color: white; margin-bottom: 10px; font-variant-numeric: tabular-nums; letter-spacing: -2px;}
                .fp-export-sub { color: #aaaaaa; font-size: 15px; max-width: 280px; line-height: 1.5; font-weight: 500;}

                /* SVG Border Container */
                .fp-export-visual {
                    position: relative; margin-top: 50px; 
                    width: 75vw; max-width: 320px; aspect-ratio: 9/16;
                    display: flex; align-items: center; justify-content: center;
                }
                
                /* THE STATIC THUMBNAIL */
                #fp-export-thumbnail {
                    position: absolute; width: calc(100% - 16px); height: calc(100% - 16px);
                    object-fit: cover; border-radius: 20px; background: #0a0a0a; z-index: 2;
                    box-shadow: 0 0 40px rgba(0,0,0,0.8);
                }

                /* Completely invisible processing elements */
                #fp-hidden-process-video { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; z-index: -1; }
                #fp-hidden-canvas { display: none; }
                #fp-file-input { display: none; }

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
                    filter: drop-shadow(0 0 15px rgba(0, 242, 254, 0.5));
                }
            </style>

            <input type="file" id="fp-file-input" accept="video/*,image/*,.pdf,audio/*">
            <canvas id="fp-hidden-canvas"></canvas>
            <video id="fp-hidden-process-video" playsinline crossOrigin="anonymous"></video>

            <div id="fp-overlay">
                
                <div class="fp-nav">
                    <button class="fp-nav-btn" id="fp-btn-close">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                    <button class="fp-nav-send" id="fp-btn-send">
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
                        
                        <div id="fp-generic-file-preview">
                            <div id="fp-file-icon">📄</div>
                            <div id="fp-file-name"></div>
                            <div id="fp-file-size"></div>
                        </div>
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

                    <div class="fp-panel" id="panel-transform">
                        <div class="fp-transform-grid">
                            <button class="fp-trans-btn" id="fp-btn-rot">
                                <svg viewBox="0 0 24 24"><path d="M15.55 5.55L11 1v3C7.06 4 4 7.06 4 11s3.06 7 7 7c1.53 0 2.95-.49 4.1-1.32l-1.48-1.48C12.87 15.71 12.01 16 11 16c-2.76 0-5-2.24-5-5s2.24-5 5-5v3l4.55-4.45zM19.93 11c-.17-1.39-.72-2.67-1.55-3.72l-1.42 1.42c.55.72.93 1.59 1.05 2.53l1.92-.23zM18.33 16.72c.83-1.05 1.38-2.33 1.55-3.72l-1.92-.23c-.12.94-.5 1.81-1.05 2.53l1.42 1.42z"/></svg>
                                Rotate
                            </button>
                            <button class="fp-trans-btn" id="fp-btn-fliph">
                                <svg viewBox="0 0 24 24"><path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z"/></svg>
                                Flip H
                            </button>
                            <button class="fp-trans-btn" id="fp-btn-flipv">
                                <svg viewBox="0 0 24 24" transform="rotate(90)"><path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z"/></svg>
                                Flip V
                            </button>
                        </div>
                    </div>

                    <div class="fp-panel" id="panel-speed">
                        <div class="fp-speed-row">
                            <button class="fp-speed-btn" data-speed="0.5">0.5x</button>
                            <button class="fp-speed-btn active" data-speed="1.0">1.0x</button>
                            <button class="fp-speed-btn" data-speed="1.5">1.5x</button>
                            <button class="fp-speed-btn" data-speed="2.0">2.0x</button>
                        </div>
                    </div>

                    <div class="fp-panel" id="panel-filter">
                        <div class="fp-filter-scroll" id="fp-filter-list"></div>
                    </div>

                    <div class="fp-panel" id="panel-text">
                        <div class="fp-text-controls">
                            <div class="fp-text-input-wrap">
                                <input type="text" class="fp-text-input" id="fp-text-input" placeholder="Add text or watermark..." autocomplete="off">
                                <button class="fp-add-text-btn" id="fp-btn-add-text">Add</button>
                            </div>
                            <div class="fp-text-options">
                                <select class="fp-font-select" id="fp-font-select">
                                    <option value="system-ui">Classic</option>
                                    <option value="Impact">Bold</option>
                                    <option value="Courier New">Mono</option>
                                    <option value="Georgia">Serif</option>
                                    <option value="Comic Sans MS">Comic</option>
                                </select>
                                <button class="fp-toggle-bg-btn" id="fp-btn-text-bg">A</button>
                            </div>
                            <div class="fp-color-picker" id="fp-color-picker"></div>
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
                            Filters
                        </button>
                        <button class="fp-tool-btn" data-panel="panel-transform">
                            <svg viewBox="0 0 24 24"><path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/></svg>
                            Crop
                        </button>
                        <button class="fp-tool-btn" data-panel="panel-speed">
                            <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            Speed
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
                        
                        <img id="fp-export-thumbnail" src="" />
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

            // ⚠️ FIX: AudioContext initialized safely on user click
            sendBtn.addEventListener('click', () => {
                if (!window.SharedQuantumAudioCtx) {
                    window.SharedQuantumAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (window.SharedQuantumAudioCtx.state === 'suspended') {
                    window.SharedQuantumAudioCtx.resume();
                }
                this.startPipeline();
            });

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
                { name: 'Cinema', value: 'contrast(110%) saturate(80%) brightness(90%)' },
                { name: 'Invert', value: 'invert(100%)' }
            ];
            
            const filterList = this.querySelector('#fp-filter-list');
            filters.forEach((f, i) => {
                const el = document.createElement('div');
                el.className = `fp-filter-item ${i===0 ? 'active' : ''}`;
                el.innerHTML = `<div class="fp-filter-thumb" style="filter: ${f.value}; background: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23333%22/><circle cx=%2250%25%22 cy=%2250%25%22 r=%2230%25%22 fill=%22%23fff%22/></svg>') center/cover;"></div><div class="fp-filter-name">${f.name}</div>`;
                el.onclick = () => {
                    this.querySelectorAll('.fp-filter-item').forEach(e => e.classList.remove('active'));
                    el.classList.add('active');
                    this.selectedFilterPreset = f.value;
                    this.updateVideoVisuals();
                };
                filterList.appendChild(el);
            });

            // Initialize Colors
            const colors = ['#ffffff', '#000000', '#ff453a', '#ff9f0a', '#32d74b', '#0a84ff', '#bf5af2', '#ff375f', '#e5e5ea'];
            const colorPicker = this.querySelector('#fp-color-picker');
            let activeColor = '#ffffff';
            let activeBg = false;

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

            // Text Engine Toggle
            const bgToggle = this.querySelector('#fp-btn-text-bg');
            bgToggle.addEventListener('click', () => {
                activeBg = !activeBg;
                bgToggle.classList.toggle('active', activeBg);
            });

            this.querySelector('#fp-btn-add-text').addEventListener('click', () => {
                const input = this.querySelector('#fp-text-input');
                const fontSelect = this.querySelector('#fp-font-select');
                
                if(input.value.trim() === '') return;
                
                this.addTextOverlay({
                    id: Date.now(),
                    text: input.value,
                    color: activeColor,
                    font: fontSelect.value,
                    size: 36, 
                    hasBg: activeBg,
                    xPct: 50, 
                    yPct: 50
                });
                input.value = '';
            });

            // ⚠️ FIX: Bulletproof tab switching using .closest()
            this.querySelectorAll('.fp-tool-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetBtn = e.target.closest('.fp-tool-btn');
                    if (!targetBtn) return;

                    this.querySelectorAll('.fp-tool-btn').forEach(b => b.classList.remove('active'));
                    this.querySelectorAll('.fp-panel').forEach(p => p.classList.remove('active'));
                    
                    const panelId = targetBtn.getAttribute('data-panel');
                    targetBtn.classList.add('active');
                    const panel = this.querySelector(`#${panelId}`);
                    if (panel) panel.classList.add('active');
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
                this.updateVideoVisuals();
            };

            bSlider.addEventListener('input', update);
            cSlider.addEventListener('input', update);
            sSlider.addEventListener('input', update);
        }

        setupTransforms() {
            const rotBtn = this.querySelector('#fp-btn-rot');
            const flipHBtn = this.querySelector('#fp-btn-fliph');
            const flipVBtn = this.querySelector('#fp-btn-flipv');

            rotBtn.addEventListener('click', () => {
                this.transforms.rotate = (this.transforms.rotate + 90) % 360;
                this.updateVideoVisuals();
            });

            flipHBtn.addEventListener('click', () => {
                this.transforms.flipH = !this.transforms.flipH;
                this.updateVideoVisuals();
            });

            flipVBtn.addEventListener('click', () => {
                this.transforms.flipV = !this.transforms.flipV;
                this.updateVideoVisuals();
            });

            // Speed Control
            this.querySelectorAll('.fp-speed-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.querySelectorAll('.fp-speed-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.playbackSpeed = parseFloat(btn.getAttribute('data-speed'));
                    this.querySelector('#fp-video-preview').playbackRate = this.playbackSpeed;
                });
            });
        }

        updateVideoVisuals() {
            const video = this.querySelector('#fp-video-preview');
            video.style.filter = this.getFinalFilter();
            video.style.transform = this.getFinalTransform();
        }

        // ==========================================
        // 🎬 PLAYBACK & EDITOR LOGIC
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
                
                // Jump to 0.1s to grab thumbnail and pause
                video.currentTime = 0.1;
                video.pause();
                this.isPlaying = false;
                playBtn.classList.remove('hidden');
            });

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

            video.addEventListener('timeupdate', () => {
                if (this.isPlaying && video.currentTime >= this.trimEnd) {
                    video.currentTime = this.trimStart;
                }
            });

            const handleTrim = (isStart) => {
                let s = parseFloat(startRange.value);
                let e = parseFloat(endRange.value);
                
                if (s > e - 1) {
                    if (isStart) { startRange.value = e - 1; s = e - 1; }
                    else { endRange.value = s + 1; e = s + 1; }
                }
                
                this.trimStart = s;
                this.trimEnd = e;
                
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
                el.className = `fp-text-element ${t.hasBg ? 'has-bg' : ''}`;
                el.innerText = t.text;
                el.style.color = t.color;
                el.style.fontSize = `${t.size}px`;
                el.style.fontFamily = t.font;
                el.style.left = `${t.xPct}%`;
                el.style.top = `${t.yPct}%`;
                
                if (t.hasBg) {
                    const isDark = t.color === '#000000' || t.color === '#111111';
                    el.style.backgroundColor = isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.85)';
                }

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
                e.preventDefault(); 
                
                const coords = getCoords(e);
                const rect = layer.getBoundingClientRect();
                
                const dx = coords.x - this.dragStartX;
                const dy = coords.y - this.dragStartY;
                
                const id = parseInt(this.activeDragElement.getAttribute('data-id'));
                const textObj = this.textOverlays.find(t => t.id === id);
                
                const pctX = (dx / rect.width) * 100;
                const pctY = (dy / rect.height) * 100;
                
                let newXPct = textObj.xPct + pctX;
                let newYPct = textObj.yPct + pctY;
                
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
        // 📁 FILE HANDLING & STATIC THUMBNAIL
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
                
                // Show video UI, hide generic UI safely
                this.querySelector('#fp-generic-file-preview').style.display = 'none';
                this.querySelector('#fp-video-preview').style.display = 'block';
                this.querySelector('#fp-play-btn').style.display = 'flex';
                this.querySelector('#fp-text-layer').style.display = 'block';
                this.querySelector('#fp-workspace').style.bottom = '230px'; // Maintain space for toolbar

                const url = URL.createObjectURL(file);
                
                const video = this.querySelector('#fp-video-preview');
                video.src = url;
                
                const hiddenVideo = this.querySelector('#fp-hidden-process-video');
                hiddenVideo.src = url;

                this.querySelector('#fp-toolbar').style.display = 'flex';
                this.querySelector('.fp-tool-btn[data-panel="panel-trim"]').click();
            } else {
                this.fileType = 'file';
                
                // Hide video UI, show generic beautifully centered UI
                this.querySelector('#fp-video-preview').style.display = 'none';
                this.querySelector('#fp-play-btn').style.display = 'none';
                this.querySelector('#fp-text-layer').style.display = 'none';
                this.querySelector('#fp-toolbar').style.display = 'none';
                
                // Expand workspace to full screen to center perfectly
                this.querySelector('#fp-workspace').style.bottom = '0px';
                
                const genericPreview = this.querySelector('#fp-generic-file-preview');
                genericPreview.style.display = 'flex';
                
                // Dynamic File Type Icon
                let icon = '📄';
                if(mime.startsWith('image/')) icon = '🖼️';
                else if(mime.startsWith('audio/')) icon = '🎵';
                else if(mime === 'application/pdf') icon = '📕';
                else if(mime.startsWith('text/')) icon = '📝';
                else if(mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) icon = '🗜️';
                
                this.querySelector('#fp-file-icon').innerText = icon;
                this.querySelector('#fp-file-name').innerText = file.name;
                this.querySelector('#fp-file-size').innerText = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
            }
        }

        // Captures perfectly filtered/rotated thumbnail for Export Screen
        captureStaticThumbnail() {
            const video = this.querySelector('#fp-video-preview');
            const canvas = document.createElement('canvas');
            
            // Adjust dims based on rotation
            const isRotated = this.transforms.rotate === 90 || this.transforms.rotate === 270;
            canvas.width = isRotated ? video.videoHeight : video.videoWidth;
            canvas.height = isRotated ? video.videoWidth : video.videoHeight;
            
            // Fallback for metadata load failures
            if (!canvas.width) canvas.width = 640;
            if (!canvas.height) canvas.height = 360;

            const ctx = canvas.getContext('2d');
            
            ctx.save();
            ctx.filter = this.getFinalFilter();
            
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.rotate(this.transforms.rotate * Math.PI / 180);
            ctx.scale(this.transforms.flipH ? -1 : 1, this.transforms.flipV ? -1 : 1);
            
            const drawW = isRotated ? canvas.height : canvas.width;
            const drawH = isRotated ? canvas.width : canvas.height;
            ctx.drawImage(video, -drawW/2, -drawH/2, drawW, drawH);
            ctx.restore();

            return canvas.toDataURL('image/jpeg', 0.85);
        }

        // ==========================================
        // 📉 DYNAMIC COMPRESSION PIPELINE
        // ==========================================
        async startPipeline() {
            if (!this.originalFile) return;

            if (this.fileType !== 'video') {
                return this.uploadFile(this.originalFile);
            }

            // 1. Capture the Thumbnail
            this.thumbnailDataUrl = this.captureStaticThumbnail();

            // 2. Shut down UI player
            this.querySelector('#fp-video-preview').pause();
            this.isPlaying = false;

            // 3. Transition to Screenshot-Style Export Screen
            this.mode = 'exporting';
            this.querySelector('#fp-toolbar').style.display = 'none';
            this.querySelector('#fp-workspace').style.display = 'none';
            this.querySelector('.fp-nav-send').style.display = 'none'; 
            
            const exportScreen = this.querySelector('#fp-export-screen');
            exportScreen.classList.add('active');
            
            // Set STATIC image to thumbnail (No playing video here)
            const thumbnailEl = this.querySelector('#fp-export-thumbnail');
            thumbnailEl.src = this.thumbnailDataUrl;

            // 4. Setup hidden processing video
            const processVideo = this.querySelector('#fp-hidden-process-video');
            processVideo.currentTime = this.trimStart;
            processVideo.playbackRate = this.playbackSpeed;
            
            const rectFg = this.querySelector('#fp-progress-rect');
            
            setTimeout(async () => {
                const rectLength = rectFg.getTotalLength() || 1500;
                rectFg.style.strokeDasharray = rectLength;
                rectFg.style.strokeDashoffset = rectLength;
                
                try {
                    await processVideo.play();
                    const compressedFile = await this.executeCanvasCompression(processVideo, rectFg, rectLength);
                    this.uploadFile(compressedFile);
                } catch (e) {
                    console.error("Pipeline Error:", e);
                    alert("Compression couldn't complete. We will upload the original file.");
                    this.uploadFile(this.originalFile);
                }
            }, 100);
        }

        async executeCanvasCompression(processVideo, rectFg, rectLength) {
            return new Promise((resolve, reject) => {
                
                // Dynamic Bitrate: 60MB -> 2MB, 120MB -> 4MB
                const ratio = Math.max((this.originalSizeMB / 60), 0.5); 
                const targetSizeMB = Math.max(ratio * 2, 1.5); 
                const exportDuration = (this.trimEnd - this.trimStart) / this.playbackSpeed;
                
                let calculatedBitrate = Math.floor((targetSizeMB * 8388608) / exportDuration);
                const MIN_BITRATE = 400000;  
                const MAX_BITRATE = 3500000; 
                calculatedBitrate = Math.max(MIN_BITRATE, Math.min(MAX_BITRATE, calculatedBitrate));

                const canvas = this.querySelector('#fp-hidden-canvas');
                const ctx = canvas.getContext('2d');
                
                const isRotated = this.transforms.rotate === 90 || this.transforms.rotate === 270;
                let w = isRotated ? processVideo.videoHeight : processVideo.videoWidth;
                let h = isRotated ? processVideo.videoWidth : processVideo.videoHeight;
                
                // Restrict resolution
                const MAX_DIM = 720;
                if (Math.max(w, h) > MAX_DIM) {
                    const scale = MAX_DIM / Math.max(w, h);
                    w = Math.floor(w * scale);
                    h = Math.floor(h * scale);
                }
                canvas.width = w;
                canvas.height = h;

                // --- ADVANCED AUDIO ROUTING (Silent execution) ---
                const source = window.SharedQuantumAudioCtx.createMediaElementSource(processVideo);
                const dest = window.SharedQuantumAudioCtx.createMediaStreamDestination();
                
                // 1. Send full volume to recorder
                source.connect(dest);
                
                // 2. Send 0 volume to speakers
                const silentGain = window.SharedQuantumAudioCtx.createGain();
                silentGain.gain.value = 0;
                source.connect(silentGain);
                silentGain.connect(window.SharedQuantumAudioCtx.destination);

                // Initialize Recorder
                const videoStream = canvas.captureStream(30); 
                const audioStream = dest.stream;
                
                const combinedStream = new MediaStream([
                    ...videoStream.getVideoTracks(),
                    ...audioStream.getAudioTracks()
                ]);

                const recorder = new MediaRecorder(combinedStream, {
                    videoBitsPerSecond: calculatedBitrate,
                    audioBitsPerSecond: 64000 
                });

                const chunks = [];
                recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/mp4' });
                    const file = new File([blob], `quantum_optimized_${Date.now()}.mp4`, { type: 'video/mp4' });
                    resolve(file);
                };

                recorder.start();

                const pctText = this.querySelector('#fp-export-pct');
                const finalFilter = this.getFinalFilter();
                
                const drawFrame = () => {
                    if (processVideo.currentTime >= this.trimEnd || processVideo.paused || processVideo.ended) {
                        if(recorder.state === "recording") recorder.stop();
                        processVideo.pause();
                        pctText.innerText = "100%";
                        rectFg.style.strokeDashoffset = 0; 
                        return;
                    }

                    // Draw Frame
                    ctx.save();
                    ctx.clearRect(0, 0, w, h);
                    ctx.filter = finalFilter;
                    
                    ctx.translate(w/2, h/2);
                    ctx.rotate(this.transforms.rotate * Math.PI / 180);
                    ctx.scale(this.transforms.flipH ? -1 : 1, this.transforms.flipV ? -1 : 1);
                    
                    const drawW = isRotated ? h : w;
                    const drawH = isRotated ? w : h;
                    ctx.drawImage(processVideo, -drawW/2, -drawH/2, drawW, drawH);
                    ctx.restore();
                    
                    // Draw Text
                    ctx.filter = 'none'; 
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    this.textOverlays.forEach(t => {
                        const scaleFactor = w / 350; 
                        const pxSize = t.size * scaleFactor;
                        ctx.font = `800 ${pxSize}px ${t.font}`;
                        
                        const x = w * (t.xPct / 100);
                        const y = h * (t.yPct / 100);

                        if (t.hasBg) {
                            const metrics = ctx.measureText(t.text);
                            const pad = 12 * scaleFactor;
                            const bgW = metrics.width + (pad * 2);
                            const bgH = pxSize + (pad * 2);
                            
                            ctx.fillStyle = (t.color === '#000000' || t.color === '#111111') ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.85)';
                            ctx.shadowColor = 'transparent';
                            ctx.fillRect(x - bgW/2, y - bgH/2, bgW, bgH);
                        } else {
                            ctx.shadowColor = 'rgba(0,0,0,0.9)';
                            ctx.shadowBlur = 10 * scaleFactor;
                        }
                        
                        ctx.fillStyle = t.color;
                        ctx.fillText(t.text, x, y);
                    });

                    // Update UI
                    const progress = (processVideo.currentTime - this.trimStart) / (this.trimEnd - this.trimStart);
                    const safeProgress = Math.max(0, Math.min(1, progress));
                    
                    pctText.innerText = (safeProgress * 100).toFixed(1) + "%";
                    rectFg.style.strokeDashoffset = rectLength - (rectLength * safeProgress);

                    requestAnimationFrame(drawFrame);
                };
                
                drawFrame();
                
                processVideo.onended = () => {
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
            
            pctText.innerText = "Sending...";
            const sizeInMB = (finalFile.size / (1024*1024)).toFixed(2);
            subText.innerText = `Final Size: ${sizeInMB} MB. Uploading to secure cloud.`;
            
            rectFg.style.strokeDashoffset = rectLength; 
            rectFg.style.stroke = "url(#exportGradient)"; 

            const fileName = `${Date.now()}_${finalFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

            try {
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

                rectFg.style.strokeDashoffset = 0; 

                const { data: publicData } = this.sbClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
                
                this.dispatchEvent(new CustomEvent('file-uploaded', {
                    detail: { 
                        url: publicData.publicUrl, 
                        metadata: {
                            name: finalFile.name,
                            size: finalFile.size,
                            type: this.fileType,
                            trimStart: this.trimStart,
                            trimEnd: this.trimEnd,
                            filter: this.selectedFilterPreset
                        } 
                    },
                    bubbles: true, composed: true
                }));

                setTimeout(() => { if(this.isOpen) history.back(); }, 800);

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
            const hiddenProcess = this.querySelector('#fp-hidden-process-video');
            
            prev.pause(); prev.src = "";
            hiddenProcess.pause(); hiddenProcess.src = "";
            
            this.selectedFile = null;
            this.originalFile = null;
            this.textOverlays = [];
            this.querySelector('#fp-text-layer').innerHTML = '';
            
            this.adjustments = { brightness: 100, contrast: 100, saturation: 100 };
            this.transforms = { rotate: 0, flipH: false, flipV: false };
            this.playbackSpeed = 1.0;
            
            this.querySelector('#fp-adj-brightness').value = 100;
            this.querySelector('#fp-adj-contrast').value = 100;
            this.querySelector('#fp-adj-saturation').value = 100;
            
            this.querySelector('.fp-nav-send').style.display = 'flex';
            this.querySelector('#fp-workspace').style.display = 'flex';
            
            // Reset Views fully
            this.querySelector('#fp-workspace').style.bottom = '230px';
            this.querySelector('#fp-generic-file-preview').style.display = 'none';
            this.querySelector('#fp-video-preview').style.display = 'block';
            this.querySelector('#fp-play-btn').style.display = 'flex';
            this.querySelector('#fp-text-layer').style.display = 'block';
        }
    }

    if(!customElements.get('file-picker')) {
        customElements.define('file-picker', FilePicker);
    }
})();
