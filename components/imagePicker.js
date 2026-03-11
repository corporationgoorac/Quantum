// Wrap in a closure to prevent variable conflicts
(function() {

    // ==========================================
    // ⚙️ SYSTEM CONFIGURATION & CONSTANTS
    // ==========================================
    const IMGBB_API_KEY = "d19129d9da57ced728f293be219f67ef"; 
    const THEME_COLOR = "#000000"; 
    const ACCENT_COLOR = "#0095f6"; 
    // ==========================================

    class ImagePicker extends HTMLElement {
        constructor() {
            super();
            
            // Network & File State
            this.apiKey = IMGBB_API_KEY;
            this.originalFile = null;
            this.previewUrl = null;
            this.originalImgElement = new Image();
            
            // Editor Visual State
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
            
            // Text Engine State
            this.textOverlays = []; 
            this.activeDragElement = null;
            this.dragStartX = 0;
            this.dragStartY = 0;

            // App State
            this.isOpen = false;
            this.mode = 'closed'; 
            this.cropper = null;
        }

        connectedCallback() {
            if (!this.querySelector('#ip-file-input')) {
                this.loadCropperResources();
                this.render();
                this.setupEvents();
                this.setupDragEvents();
                this.setupAdjustments();
                this.setupTransforms();
            }
        }

        loadCropperResources() {
            if (!document.getElementById('cropper-css')) {
                const link = document.createElement('link');
                link.id = 'cropper-css';
                link.rel = 'stylesheet';
                link.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
                document.head.appendChild(link);
            }
            if (!window.Cropper) {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
                document.head.appendChild(script);
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
                image-picker { 
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                    display: block; 
                    --ip-bg: #000000;
                    --ip-panel: #111111;
                    --ip-border: #222222;
                    --ip-text: #ffffff;
                    --ip-subtext: #8e8e93;
                    --ip-accent: ${ACCENT_COLOR};
                    --ip-ease: cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                
                #ip-overlay {
                    position: fixed !important; top: 0 !important; left: 0 !important; 
                    width: 100vw !important; height: 100vh !important;
                    background-color: var(--ip-bg) !important; z-index: 999999 !important;
                    display: none; flex-direction: column; overflow: hidden;
                    opacity: 0; transition: opacity 0.3s var(--ip-ease);
                    touch-action: none; 
                }
                #ip-overlay.open { display: flex; opacity: 1; }

                .ip-nav {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 40px 20px 15px 20px; z-index: 100;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%);
                    position: absolute; top: 0; left: 0; width: 100%; box-sizing: border-box;
                    pointer-events: none;
                }
                .ip-nav > * { pointer-events: auto; }
                
                .ip-nav-btn {
                    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.05); 
                    color: white; width: 44px; height: 44px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; backdrop-filter: blur(20px); transition: all 0.2s var(--ip-ease);
                }
                .ip-nav-btn:active { transform: scale(0.9); }
                .ip-nav-btn svg { width: 22px; height: 22px; fill: white; }
                
                .ip-nav-send {
                    background: var(--ip-accent); border: none;
                    width: 46px; height: 46px; border-radius: 50%; 
                    box-shadow: 0 4px 20px rgba(0, 149, 246, 0.5);
                    display: flex; align-items: center; justify-content: center;
                    transition: transform 0.2s, opacity 0.2s;
                }
                .ip-nav-send:active { transform: scale(0.9); }
                .ip-nav-send svg { width: 20px; height: 20px; fill: white; margin-left: 3px; margin-top: 1px;}
                .ip-nav-send:disabled { opacity: 0.5; box-shadow: none; filter: grayscale(1); pointer-events: none; }

                .ip-workspace {
                    position: absolute; top: 80px; bottom: 230px; left: 0; right: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: var(--ip-bg); z-index: 10; padding: 0 10px;
                }
                .ip-preview-container {
                    position: relative; max-width: 100%; max-height: 100%;
                    border-radius: 16px; overflow: hidden;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.8);
                    display: flex; align-items: center; justify-content: center;
                    background: #050505;
                }
                #ip-image-preview {
                    display: block; width: auto; height: auto;
                    max-width: 100%; max-height: 100%;
                    object-fit: contain; transition: filter 0.1s ease-out, transform 0.3s var(--ip-ease);
                }

                #ip-text-layer {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    pointer-events: none; overflow: hidden; z-index: 15;
                }
                .ip-text-element {
                    position: absolute; pointer-events: auto;
                    font-weight: 800; text-shadow: 0 2px 8px rgba(0,0,0,0.9);
                    cursor: grab; padding: 8px 14px; user-select: none;
                    transform: translate(-50%, -50%); 
                    white-space: pre-wrap; text-align: center; line-height: 1.2;
                    border: 1.5px dashed transparent; transition: border 0.2s;
                    border-radius: 10px;
                }
                .ip-text-element.has-bg {
                    box-shadow: 0 4px 20px rgba(0,0,0,0.6); text-shadow: none;
                }
                .ip-text-element:active { cursor: grabbing; border: 1.5px dashed rgba(255,255,255,0.8); }

                #ip-crop-ui {
                    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
                    z-index: 200; display: none; gap: 15px;
                }
                #ip-crop-ui.active { display: flex; }
                .ip-pill-btn {
                    background: rgba(30,30,30,0.95); color: white; border: 1px solid rgba(255,255,255,0.2);
                    padding: 12px 24px; border-radius: 30px; font-weight: 700; cursor: pointer;
                    backdrop-filter: blur(10px); font-size: 14px; transition: all 0.2s;
                }
                .ip-pill-btn.confirm { background: white; color: black; }
                .ip-pill-btn:active { transform: scale(0.95); }
                .ip-pill-btn:disabled { opacity: 0.5; pointer-events: none; }

                .ip-toolbar {
                    position: absolute; bottom: 0; left: 0; width: 100%;
                    background: rgba(15,15,15,0.95); padding: 20px 10px 30px 10px;
                    padding-bottom: env(safe-area-inset-bottom, 30px);
                    box-sizing: border-box; border-top: 1px solid var(--ip-border);
                    display: flex; flex-direction: column; gap: 20px; z-index: 50;
                    backdrop-filter: blur(25px); border-radius: 24px 24px 0 0;
                    pointer-events: auto;
                }
                
                .ip-tools-menu {
                    display: flex; justify-content: space-between; align-items: center; 
                    width: 100%; overflow-x: auto; padding: 5px 5px; scrollbar-width: none;
                }
                .ip-tools-menu::-webkit-scrollbar { display: none; }
                .ip-tool-btn {
                    background: transparent; border: none; color: var(--ip-subtext);
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                    font-size: 11px; cursor: pointer; font-weight: 600; transition: all 0.2s;
                    min-width: 65px; flex-shrink: 0; position: relative;
                }
                .ip-tool-btn svg { width: 22px; height: 22px; fill: var(--ip-subtext); transition: fill 0.2s; }
                .ip-tool-btn.active { color: white; transform: translateY(-2px); }
                .ip-tool-btn.active svg { fill: white; }
                .ip-tool-btn.active::after {
                    content: ''; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
                    width: 4px; height: 4px; border-radius: 50%; background: white;
                }

                .ip-panel { display: none; width: 100%; padding: 0 10px; box-sizing: border-box; animation: fadeIn 0.3s var(--ip-ease); }
                .ip-panel.active { display: block; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }

                .ip-adjust-group { display: flex; flex-direction: column; gap: 20px; padding: 5px 0;}
                .ip-slider-row { display: flex; align-items: center; gap: 15px; }
                .ip-slider-label { color: white; font-size: 12px; width: 30px; display: flex; justify-content: center;}
                .ip-slider-label svg { width: 18px; height: 18px; fill: white; }
                .ip-adjust-slider { flex: 1; appearance: none; height: 4px; background: #333; border-radius: 2px; outline: none; }
                .ip-adjust-slider::-webkit-slider-thumb { appearance: none; width: 22px; height: 22px; border-radius: 50%; background: white; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.8); }

                .ip-transform-grid { display: flex; justify-content: space-around; padding: 10px 0; gap: 10px;}
                .ip-trans-btn { background: #222; border: 1px solid #333; border-radius: 12px; flex: 1; height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: white; font-size: 11px; cursor: pointer; font-weight: 600; transition: all 0.2s;}
                .ip-trans-btn svg { width: 22px; height: 22px; fill: white; }
                .ip-trans-btn:active { transform: scale(0.92); background: #333; }
                .ip-trans-btn.highlight { background: white; color: black; border: none; }
                .ip-trans-btn.highlight svg { fill: black; }

                .ip-filter-scroll { display: flex; overflow-x: auto; gap: 12px; padding-bottom: 5px; scrollbar-width: none; }
                .ip-filter-scroll::-webkit-scrollbar { display: none; }
                .ip-filter-item { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; }
                .ip-filter-thumb { width: 64px; height: 84px; border-radius: 10px; background: #222; overflow: hidden; position: relative; border: 2px solid transparent; transition: all 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.5);}
                .ip-filter-item.active .ip-filter-thumb { border-color: white; transform: scale(1.05);}
                .ip-filter-name { color: var(--ip-subtext); font-size: 11px; font-weight: 600;}
                .ip-filter-item.active .ip-filter-name { color: white; }

                .ip-text-controls { display: flex; flex-direction: column; gap: 15px; }
                .ip-text-input-wrap { display: flex; gap: 10px; }
                .ip-text-input { flex: 1; background: #222; border: 1px solid #333; color: white; padding: 14px 16px; border-radius: 12px; font-size: 15px; outline: none; transition: border 0.3s;}
                .ip-text-input:focus { border-color: white; }
                .ip-add-text-btn { background: white; color: black; border: none; border-radius: 12px; padding: 0 20px; font-weight: 800; cursor: pointer; transition: transform 0.1s;}
                .ip-add-text-btn:active { transform: scale(0.95); }
                
                .ip-text-options { display: flex; gap: 15px; align-items: center; }
                .ip-font-select { background: #222; color: white; border: 1px solid #333; padding: 10px 12px; border-radius: 8px; outline: none; font-size: 13px; font-weight: 600;}
                .ip-toggle-bg-btn { background: #222; border: 1px solid #333; color: white; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 800; cursor: pointer;}
                .ip-toggle-bg-btn.active { background: white; color: black;}
                
                .ip-color-picker { display: flex; gap: 14px; overflow-x: auto; padding: 5px 0; scrollbar-width: none;}
                .ip-color-picker::-webkit-scrollbar { display: none; }
                .ip-color-dot { width: 30px; height: 30px; border-radius: 50%; cursor: pointer; border: 2px solid rgba(255,255,255,0.2); flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.8); transition: transform 0.2s;}
                .ip-color-dot.active { border-color: white; transform: scale(1.2); }

                #ip-export-screen {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: var(--ip-bg); z-index: 200000;
                    display: none; flex-direction: column; align-items: center;
                }
                #ip-export-screen.active { display: flex; }
                
                .ip-export-header {
                    margin-top: 100px; display: flex; flex-direction: column; align-items: center; text-align: center; z-index: 10;
                }
                .ip-export-pct { font-size: 52px; font-weight: 800; color: white; margin-bottom: 10px; font-variant-numeric: tabular-nums; letter-spacing: -2px;}
                .ip-export-sub { color: #aaaaaa; font-size: 15px; max-width: 280px; line-height: 1.5; font-weight: 500;}

                .ip-export-visual {
                    position: relative; margin-top: 50px; 
                    width: 75vw; max-width: 320px; aspect-ratio: 9/16;
                    display: flex; align-items: center; justify-content: center;
                }
                
                #ip-export-thumbnail {
                    position: absolute; width: calc(100% - 16px); height: calc(100% - 16px);
                    object-fit: contain; border-radius: 20px; background: #0a0a0a; z-index: 2;
                    box-shadow: 0 0 40px rgba(0,0,0,0.8);
                }

                .ip-svg-border {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 3;
                    pointer-events: none;
                }
                .ip-svg-rect-bg { fill: none; stroke: #1a1a1a; stroke-width: 8; rx: 28; ry: 28; }
                .ip-svg-rect-fg {
                    fill: none; stroke: url(#ipExportGradient); stroke-width: 8; rx: 28; ry: 28;
                    stroke-linecap: round; transition: stroke-dashoffset 0.1s linear;
                    filter: drop-shadow(0 0 15px rgba(0, 242, 254, 0.5));
                }

                #ip-file-input { display: none; }
                .cropper-view-box, .cropper-face { border-radius: 0; }
                .cropper-modal { background-color: rgba(0, 0, 0, 0.85); }
                .cropper-bg { background-image: none !important; background-color: #050505; }
            </style>

            <input type="file" id="ip-file-input" accept="image/*">

            <div id="ip-overlay">
                
                <div class="ip-nav">
                    <button class="ip-nav-btn" id="ip-btn-close">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                    <button class="ip-nav-send" id="ip-btn-send">
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>

                <div class="ip-workspace" id="ip-workspace">
                    <div class="ip-preview-container" id="ip-preview-wrap">
                        <img id="ip-image-preview" src="">
                        <div id="ip-text-layer"></div>
                    </div>
                </div>

                <div id="ip-crop-ui">
                    <button class="ip-pill-btn" id="ip-btn-crop-cancel">Cancel</button>
                    <button class="ip-pill-btn confirm" id="ip-btn-crop-save">Save Crop</button>
                </div>

                <div class="ip-toolbar" id="ip-toolbar">
                    
                    <div class="ip-panel active" id="ip-panel-adjust">
                        <div class="ip-adjust-group">
                            <div class="ip-slider-row">
                                <div class="ip-slider-label"><svg viewBox="0 0 24 24"><path d="M20 15.31L23.31 12 20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg></div>
                                <input type="range" class="ip-adjust-slider" id="ip-adj-brightness" min="50" max="150" value="100">
                            </div>
                            <div class="ip-slider-row">
                                <div class="ip-slider-label"><svg viewBox="0 0 24 24"><path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm1-17.93c3.94.49 7 3.85 7 7.93s-3.05 7.44-7 7.93V4.07z"/></svg></div>
                                <input type="range" class="ip-adjust-slider" id="ip-adj-contrast" min="50" max="150" value="100">
                            </div>
                            <div class="ip-slider-row">
                                <div class="ip-slider-label"><svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.41 2.26-4.39C12.91 3.04 12.46 3 12 3z"/></svg></div>
                                <input type="range" class="ip-adjust-slider" id="ip-adj-saturation" min="0" max="200" value="100">
                            </div>
                        </div>
                    </div>

                    <div class="ip-panel" id="ip-panel-transform">
                        <div class="ip-transform-grid">
                            <button class="ip-trans-btn highlight" id="ip-btn-crop">
                                <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17 7l-5 5-5-5-1.41 1.41L10.59 12 5.59 17 7 18.41 12 13.41 17 18.41 18.41 17 13.41 12 18.41 7z"/></svg>
                                Crop Edges
                            </button>
                            <button class="ip-trans-btn" id="ip-btn-rot">
                                <svg viewBox="0 0 24 24"><path d="M15.55 5.55L11 1v3C7.06 4 4 7.06 4 11s3.06 7 7 7c1.53 0 2.95-.49 4.1-1.32l-1.48-1.48C12.87 15.71 12.01 16 11 16c-2.76 0-5-2.24-5-5s2.24-5 5-5v3l4.55-4.45zM19.93 11c-.17-1.39-.72-2.67-1.55-3.72l-1.42 1.42c.55.72.93 1.59 1.05 2.53l1.92-.23zM18.33 16.72c.83-1.05 1.38-2.33 1.55-3.72l-1.92-.23c-.12.94-.5 1.81-1.05 2.53l1.42 1.42z"/></svg>
                                Rotate
                            </button>
                            <button class="ip-trans-btn" id="ip-btn-fliph">
                                <svg viewBox="0 0 24 24"><path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z"/></svg>
                                Flip H
                            </button>
                        </div>
                    </div>

                    <div class="ip-panel" id="ip-panel-filter">
                        <div class="ip-filter-scroll" id="ip-filter-list"></div>
                    </div>

                    <div class="ip-panel" id="ip-panel-text">
                        <div class="ip-text-controls">
                            <div class="ip-text-input-wrap">
                                <input type="text" class="ip-text-input" id="ip-text-input" placeholder="Add text or watermark..." autocomplete="off">
                                <button class="ip-add-text-btn" id="ip-btn-add-text">Add</button>
                            </div>
                            <div class="ip-text-options">
                                <select class="ip-font-select" id="ip-font-select">
                                    <option value="system-ui">Classic</option>
                                    <option value="Impact">Bold</option>
                                    <option value="Courier New">Mono</option>
                                    <option value="Georgia">Serif</option>
                                    <option value="Comic Sans MS">Comic</option>
                                </select>
                                <button class="ip-toggle-bg-btn" id="ip-btn-text-bg">A</button>
                            </div>
                            <div class="ip-color-picker" id="ip-color-picker"></div>
                        </div>
                    </div>

                    <div class="ip-tools-menu">
                        <button class="ip-tool-btn active" data-panel="ip-panel-adjust">
                            <svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>
                            Adjust
                        </button>
                        <button class="ip-tool-btn" data-panel="ip-panel-filter">
                            <svg viewBox="0 0 24 24"><path d="M19.03 7.39l1.42-1.42c-.45-.51-.9-.97-1.41-1.41L17.62 6c-1.55-1.26-3.5-2-5.62-2-5.62 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10c0-2.12-.74-4.07-2-5.62zM12 22c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>
                            Filters
                        </button>
                        <button class="ip-tool-btn" data-panel="ip-panel-transform">
                            <svg viewBox="0 0 24 24"><path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/></svg>
                            Crop & Flip
                        </button>
                        <button class="ip-tool-btn" data-panel="ip-panel-text">
                            <svg viewBox="0 0 24 24"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>
                            Text
                        </button>
                    </div>
                </div>

                <div id="ip-export-screen">
                    <div class="ip-export-header">
                        <div class="ip-export-pct" id="ip-export-pct">0.0%</div>
                        <div class="ip-export-sub">Processing image. You can choose where to share it next.</div>
                    </div>
                    
                    <div class="ip-export-visual">
                        <svg class="ip-svg-border" width="100%" height="100%" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="ipExportGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#ff0050" />
                                    <stop offset="50%" stop-color="#8a2387" />
                                    <stop offset="100%" stop-color="#00f2fe" />
                                </linearGradient>
                            </defs>
                            <rect class="ip-svg-rect-bg" width="100%" height="100%" />
                            <rect class="ip-svg-rect-fg" id="ip-progress-rect" width="100%" height="100%" />
                        </svg>
                        
                        <img id="ip-export-thumbnail" src="" />
                    </div>
                </div>

            </div>
            `;
        }

        // ==========================================
        // 🎛️ EVENT LISTENERS & SETUP
        // ==========================================
        setupEvents() {
            const input = this.querySelector('#ip-file-input');
            const closeBtn = this.querySelector('#ip-btn-close');
            const sendBtn = this.querySelector('#ip-btn-send');
            
            input.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0]);
                }
                // --- FIX 1: Clear the input so selecting the exact same file works the second time
                e.target.value = ''; 
            });

            closeBtn.addEventListener('click', () => {
                if (this.mode !== 'closed') {
                    if (this.cropper) {
                        this.destroyCropper();
                    } else {
                        this.hideUI();
                        history.back();
                    }
                }
            });

            window.addEventListener('popstate', () => {
                if (this.mode !== 'closed') this.hideUI();
            });

            sendBtn.addEventListener('click', () => {
                // Prevent multi-clicks
                if (this.mode !== 'exporting') {
                    sendBtn.disabled = true;
                    this.startPipeline();
                }
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
            
            const filterList = this.querySelector('#ip-filter-list');
            filters.forEach((f, i) => {
                const el = document.createElement('div');
                el.className = `ip-filter-item ${i===0 ? 'active' : ''}`;
                el.innerHTML = `<div class="ip-filter-thumb" style="filter: ${f.value}; background: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%25%22 height=%22100%25%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23333%22/><circle cx=%2250%25%22 cy=%2250%25%22 r=%2230%25%22 fill=%22%23fff%22/></svg>') center/cover;"></div><div class="ip-filter-name">${f.name}</div>`;
                el.onclick = () => {
                    this.querySelectorAll('.ip-filter-item').forEach(e => e.classList.remove('active'));
                    el.classList.add('active');
                    this.selectedFilterPreset = f.value;
                    this.updateImageVisuals();
                };
                filterList.appendChild(el);
            });

            // Initialize Colors
            const colors = ['#ffffff', '#000000', '#ff453a', '#ff9f0a', '#32d74b', '#0a84ff', '#bf5af2', '#ff375f', '#e5e5ea'];
            const colorPicker = this.querySelector('#ip-color-picker');
            let activeColor = '#ffffff';
            let activeBg = false;

            colors.forEach((c, i) => {
                const el = document.createElement('div');
                el.className = `ip-color-dot ${i===0 ? 'active' : ''}`;
                el.style.backgroundColor = c;
                el.onclick = () => {
                    this.querySelectorAll('.ip-color-dot').forEach(e => e.classList.remove('active'));
                    el.classList.add('active');
                    activeColor = c;
                };
                colorPicker.appendChild(el);
            });

            // Text Engine Toggle
            const bgToggle = this.querySelector('#ip-btn-text-bg');
            bgToggle.addEventListener('click', () => {
                activeBg = !activeBg;
                bgToggle.classList.toggle('active', activeBg);
            });

            this.querySelector('#ip-btn-add-text').addEventListener('click', () => {
                const textInput = this.querySelector('#ip-text-input');
                const fontSelect = this.querySelector('#ip-font-select');
                
                if(textInput.value.trim() === '') return;
                
                this.addTextOverlay({
                    id: Date.now(),
                    text: textInput.value,
                    color: activeColor,
                    font: fontSelect.value,
                    size: 36, 
                    hasBg: activeBg,
                    xPct: 50, 
                    yPct: 50
                });
                textInput.value = '';
            });

            // Tool Tab Switching
            this.querySelectorAll('.ip-tool-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetBtn = e.target.closest('.ip-tool-btn');
                    if (!targetBtn) return;

                    this.querySelectorAll('.ip-tool-btn').forEach(b => b.classList.remove('active'));
                    this.querySelectorAll('.ip-panel').forEach(p => p.classList.remove('active'));
                    
                    const panelId = targetBtn.getAttribute('data-panel');
                    targetBtn.classList.add('active');
                    const panel = this.querySelector(`#${panelId}`);
                    if (panel) panel.classList.add('active');
                });
            });

            // Cropper overlay buttons
            this.querySelector('#ip-btn-crop-cancel').addEventListener('click', () => {
                this.destroyCropper();
            });
            this.querySelector('#ip-btn-crop-save').addEventListener('click', async () => {
                const btn = this.querySelector('#ip-btn-crop-save');
                btn.innerText = "Saving...";
                btn.disabled = true;
                await this.commitCrop();
                btn.innerText = "Save Crop";
                btn.disabled = false;
            });
        }

        setupAdjustments() {
            const bSlider = this.querySelector('#ip-adj-brightness');
            const cSlider = this.querySelector('#ip-adj-contrast');
            const sSlider = this.querySelector('#ip-adj-saturation');

            const update = () => {
                this.adjustments.brightness = bSlider.value;
                this.adjustments.contrast = cSlider.value;
                this.adjustments.saturation = sSlider.value;
                this.updateImageVisuals();
            };

            bSlider.addEventListener('input', update);
            cSlider.addEventListener('input', update);
            sSlider.addEventListener('input', update);
        }

        setupTransforms() {
            const rotBtn = this.querySelector('#ip-btn-rot');
            const flipHBtn = this.querySelector('#ip-btn-fliph');
            const cropBtn = this.querySelector('#ip-btn-crop');

            rotBtn.addEventListener('click', () => {
                this.transforms.rotate = (this.transforms.rotate + 90) % 360;
                this.updateImageVisuals();
            });

            flipHBtn.addEventListener('click', () => {
                this.transforms.flipH = !this.transforms.flipH;
                this.updateImageVisuals();
            });

            cropBtn.addEventListener('click', () => {
                if (!this.cropper && window.Cropper) {
                    this.initCropper();
                }
            });
        }

        initCropper() {
            const img = this.querySelector('#ip-image-preview');
            
            // Hide normal toolbars, show crop UI overlay
            this.querySelector('#ip-toolbar').style.display = 'none';
            this.querySelector('#ip-crop-ui').classList.add('active');
            this.querySelector('.ip-nav-send').style.display = 'none';
            this.querySelector('#ip-text-layer').style.display = 'none';

            // Temporarily remove CSS transforms for accurate crop mapping
            img.style.transform = 'none'; 
            
            let scaleXVal = this.transforms.flipH ? -1 : 1;

            this.cropper = new Cropper(img, {
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.9,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                rotatable: true,
                data: { 
                    rotate: this.transforms.rotate,
                    scaleX: scaleXVal 
                }
            });
        }

        destroyCropper() {
            if (this.cropper) {
                this.cropper.destroy();
                this.cropper = null;
            }
            this.querySelector('#ip-toolbar').style.display = 'flex';
            this.querySelector('#ip-crop-ui').classList.remove('active');
            this.querySelector('.ip-nav-send').style.display = 'flex';
            this.querySelector('#ip-text-layer').style.display = 'block';
            
            this.updateImageVisuals();
        }

        async commitCrop() {
            return new Promise((resolve) => {
                if (!this.cropper) return resolve();
                
                const canvas = this.cropper.getCroppedCanvas();
                this.previewUrl = canvas.toDataURL('image/jpeg', 0.9);
                
                const img = this.querySelector('#ip-image-preview');
                let loadedCount = 0;
                
                const onImgLoad = () => {
                    loadedCount++;
                    if (loadedCount === 2) {
                        this.transforms.rotate = 0;
                        this.transforms.flipH = false;
                        this.transforms.flipV = false;
                        
                        this.destroyCropper();
                        resolve();
                    }
                };

                img.onload = onImgLoad;
                this.originalImgElement.onload = onImgLoad;
                
                img.src = this.previewUrl;
                this.originalImgElement.src = this.previewUrl;
            });
        }

        updateImageVisuals() {
            const img = this.querySelector('#ip-image-preview');
            if(!this.cropper) {
                img.style.filter = this.getFinalFilter();
                img.style.transform = this.getFinalTransform();
            }
        }

        // ==========================================
        // ✍️ DRAGGABLE TEXT LOGIC
        // ==========================================
        addTextOverlay(textObj) {
            this.textOverlays.push(textObj);
            this.renderTextOverlays();
        }

        renderTextOverlays() {
            const layer = this.querySelector('#ip-text-layer');
            layer.innerHTML = '';
            
            this.textOverlays.forEach(t => {
                const el = document.createElement('div');
                el.className = `ip-text-element ${t.hasBg ? 'has-bg' : ''}`;
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
            const layer = this.querySelector('#ip-text-layer');
            
            const getCoords = (e) => {
                if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                return { x: e.clientX, y: e.clientY };
            };

            const startDrag = (e) => {
                if (e.target.classList.contains('ip-text-element')) {
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
        // 📁 FILE HANDLING
        // ==========================================
        handleFileSelect(file) {
            this.originalFile = file;
            
            this.isOpen = true;
            this.mode = 'editor';
            this.querySelector('#ip-overlay').classList.add('open');
            window.history.pushState({ ipEditorOpen: true }, "");

            // --- FIX 3: Ensure UI components are set back to visible on new file select
            this.querySelector('#ip-workspace').style.display = 'flex';
            this.querySelector('#ip-toolbar').style.display = 'flex';
            this.querySelector('.ip-nav-send').style.display = 'flex';
            this.querySelector('.ip-nav-send').disabled = false;

            const reader = new FileReader();
            reader.onload = (evt) => {
                this.previewUrl = evt.target.result;
                const img = this.querySelector('#ip-image-preview');
                
                let loadedCount = 0;
                const onImgLoad = () => {
                    loadedCount++;
                    if (loadedCount === 2) {
                        // Reset State once images safely loaded into memory
                        this.adjustments = { brightness: 100, contrast: 100, saturation: 100 };
                        this.transforms = { rotate: 0, flipH: false, flipV: false };
                        this.selectedFilterPreset = 'none';
                        this.textOverlays = [];
                        this.renderTextOverlays();
                        
                        this.querySelector('#ip-adj-brightness').value = 100;
                        this.querySelector('#ip-adj-contrast').value = 100;
                        this.querySelector('#ip-adj-saturation').value = 100;
                        this.querySelectorAll('.ip-filter-item').forEach(e => e.classList.remove('active'));
                        this.querySelector('.ip-filter-item').classList.add('active'); // Original
                        
                        this.updateImageVisuals();
                    }
                };

                img.onload = onImgLoad;
                this.originalImgElement.onload = onImgLoad;

                img.src = this.previewUrl;
                this.originalImgElement.src = this.previewUrl;
            };
            reader.readAsDataURL(file);
        }

        captureStaticThumbnail() {
            const previewImg = this.querySelector('#ip-image-preview');
            const canvas = document.createElement('canvas');
            
            const isRotated = this.transforms.rotate === 90 || this.transforms.rotate === 270;
            canvas.width = isRotated ? previewImg.naturalHeight : previewImg.naturalWidth;
            canvas.height = isRotated ? previewImg.naturalWidth : previewImg.naturalHeight;

            const ctx = canvas.getContext('2d');
            
            ctx.save();
            ctx.filter = this.getFinalFilter();
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.rotate(this.transforms.rotate * Math.PI / 180);
            ctx.scale(this.transforms.flipH ? -1 : 1, this.transforms.flipV ? -1 : 1);
            
            const drawW = isRotated ? canvas.height : canvas.width;
            const drawH = isRotated ? canvas.width : canvas.height;
            ctx.drawImage(previewImg, -drawW/2, -drawH/2, drawW, drawH);
            ctx.restore();

            return canvas.toDataURL('image/jpeg', 0.85);
        }

        // ==========================================
        // 📉 EXPORT & UPLOAD PIPELINE
        // ==========================================
        async startPipeline() {
            if (!this.previewUrl) return;

            this.mode = 'exporting';

            // --- FIX 2: Swap the UI *Instantly* before hitting heavy main-thread JS actions
            this.querySelector('#ip-toolbar').style.display = 'none';
            this.querySelector('#ip-workspace').style.display = 'none';
            this.querySelector('.ip-nav-send').style.display = 'none'; 
            
            const exportScreen = this.querySelector('#ip-export-screen');
            exportScreen.classList.add('active');

            const pctText = this.querySelector('#ip-export-pct');
            const rectFg = this.querySelector('#ip-progress-rect');
            const rectLength = rectFg.getTotalLength() || 1500;
            
            // Set Initial Visual Load State Instantly
            rectFg.style.strokeDasharray = rectLength;
            rectFg.style.strokeDashoffset = rectLength;
            pctText.innerText = "0%";
            
            // Force the browser to render the UI updates before freezing the thread with canvas operations
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            try {
                // Commit crop if open & await completion
                if (this.cropper) {
                    await this.commitCrop();
                }

                // Set Static Image visually on the export page
                const thumbnailEl = this.querySelector('#ip-export-thumbnail');
                thumbnailEl.src = this.captureStaticThumbnail();

                // Heavy Lifting Canvas Build
                const finalBlob = await this.executeCanvasExport();
                this.uploadToImgBB(finalBlob, rectFg, rectLength, pctText);
            } catch (e) {
                console.error("Export Error:", e);
                alert("Processing failed. Could not format image.");
                this.hideUI();
            }
        }

        async executeCanvasExport() {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Max resolution to ensure safety and speed
                const MAX_DIM = 1920;
                let w = this.originalImgElement.naturalWidth;
                let h = this.originalImgElement.naturalHeight;
                
                if (Math.max(w, h) > MAX_DIM) {
                    const scale = MAX_DIM / Math.max(w, h);
                    w = Math.floor(w * scale);
                    h = Math.floor(h * scale);
                }

                const isRotated = this.transforms.rotate === 90 || this.transforms.rotate === 270;
                canvas.width = isRotated ? h : w;
                canvas.height = isRotated ? w : h;

                // 1. Draw Image with CSS Filters applied directly to Canvas Context
                ctx.save();
                ctx.filter = this.getFinalFilter();
                ctx.translate(canvas.width/2, canvas.height/2);
                ctx.rotate(this.transforms.rotate * Math.PI / 180);
                ctx.scale(this.transforms.flipH ? -1 : 1, this.transforms.flipV ? -1 : 1);
                
                const drawW = isRotated ? canvas.height : canvas.width;
                const drawH = isRotated ? canvas.width : canvas.height;
                ctx.drawImage(this.originalImgElement, -drawW/2, -drawH/2, drawW, drawH);
                ctx.restore();

                // 2. Draw Text Overlays
                ctx.filter = 'none'; 
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                this.textOverlays.forEach(t => {
                    const scaleFactor = canvas.width / 350; // Reference 350px preview width
                    const pxSize = t.size * scaleFactor;
                    ctx.font = `800 ${pxSize}px ${t.font}`;
                    
                    const x = canvas.width * (t.xPct / 100);
                    const y = canvas.height * (t.yPct / 100);

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

                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
            });
        }

        async uploadToImgBB(blob, rectFg, rectLength, pctText) {
            if (!this.apiKey) {
                alert("Missing ImgBB API Key");
                this.hideUI();
                return;
            }

            const subText = this.querySelector('.ip-export-sub');
            const formData = new FormData();
            formData.append('image', blob);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `https://api.imgbb.com/1/upload?key=${this.apiKey}`);
            
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total);
                    pctText.innerText = (percentComplete * 100).toFixed(0) + "%";
                    rectFg.style.strokeDashoffset = rectLength - (rectLength * percentComplete);
                    
                    if(percentComplete > 0.95) {
                        subText.innerText = "Finalizing upload to secure cloud...";
                    }
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const json = JSON.parse(xhr.responseText);
                        if(json.success) {
                            rectFg.style.strokeDashoffset = 0;
                            pctText.innerText = "100%";
                            
                            setTimeout(() => {
                                this.dispatchEvent(new CustomEvent('image-uploaded', { 
                                    detail: { 
                                        url: json.data.url,
                                        delete_url: json.data.delete_url
                                    },
                                    bubbles: true, 
                                    composed: true 
                                }));
                                this.hideUI();
                                if(history.state && history.state.ipEditorOpen) history.back();
                            }, 400);

                        } else {
                            throw new Error(json.error ? json.error.message : "Upload error");
                        }
                    } catch(err) {
                        console.error(err);
                        alert("Upload completed but got invalid response.");
                        this.hideUI();
                    }
                } else {
                    alert(`Upload failed: ${xhr.status}`);
                    this.hideUI();
                }
            };
            
            xhr.onerror = () => {
                alert("Network Error occurred during upload");
                this.hideUI();
            };

            xhr.send(formData);
        }

        openPicker() {
            this.querySelector('#ip-file-input').click();
        }

        hideUI() {
            this.isOpen = false;
            this.mode = 'closed';
            this.querySelector('#ip-overlay').classList.remove('open');
            this.querySelector('#ip-export-screen').classList.remove('active');
            
            // Allow selecting the exact same file after closing out of the modal
            this.querySelector('#ip-file-input').value = ''; 
            
            this.originalFile = null;
            this.previewUrl = null;
            this.textOverlays = [];
            this.querySelector('#ip-text-layer').innerHTML = '';
            
            // --- FIX 3 (part 2): Re-enable all default states so the editor isn't blank next open
            this.querySelector('#ip-toolbar').style.display = 'flex';
            this.querySelector('.ip-nav-send').style.display = 'flex';
            this.querySelector('.ip-nav-send').disabled = false;
            this.querySelector('#ip-workspace').style.display = 'flex'; 
            this.querySelector('#ip-image-preview').src = ''; 
            
            this.destroyCropper();
        }
    }

    if(!customElements.get('image-picker')) {
        customElements.define('image-picker', ImagePicker);
    }
})();
