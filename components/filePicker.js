// Wrap in a closure to prevent variable conflicts
(function() {

    // ==========================================
    // ⚙️ CONFIGURATION
    // ==========================================
    const SUPABASE_URL = "https://ekgsgltykakwopcfyxqu.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ3NnbHR5a2Frd29wY2Z5eHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNzY3NDcsImV4cCI6MjA4NTg1Mjc0N30.gsh7Zb6JEJcDx_CzVbrPsfcaiyDvl8ws-gUNsQQFWLc";
    const THEME_COLOR = "#0095f6"; // Messenger Blue
    const STORAGE_BUCKET = "public-files"; 
    // ==========================================

    class FilePicker extends HTMLElement {
        constructor() {
            super();
            this.supabaseUrl = SUPABASE_URL;
            this.supabaseKey = SUPABASE_KEY;
            this.selectedFile = null;
            this.fileType = null;
            this.isUploading = false;
            this.videoDuration = 0;
            this.trimStart = 0;
            this.trimEnd = 0;
            this.sbClient = null;
            this.isOpen = false; // Internal state tracking
        }

        connectedCallback() {
            if (!this.querySelector('#fp-file-input')) {
                this.ensureSupabase();
                this.render();
                this.setupEvents();
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

        render() {
            this.innerHTML = `
            <style>
                :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: block; }
                
                /* --- Overlay & Animation (Image Picker Style) --- */
                #fp-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: #000000; z-index: 10000;
                    display: none; flex-direction: column;
                    opacity: 0; transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                #fp-overlay.open { display: flex; opacity: 1; }

                /* --- IG STORY STYLE PROGRESS BAR --- */
                .fp-progress-container {
                    position: absolute; top: 0; left: 0; width: 100%; height: 4px;
                    background: rgba(255,255,255,0.2); z-index: 100;
                    display: none;
                }
                .fp-progress-bar {
                    height: 100%; width: 0%;
                    background: ${THEME_COLOR};
                    transition: width 0.2s ease-out;
                    box-shadow: 0 0 8px ${THEME_COLOR};
                }

                /* --- Main Card (Full Screen) --- */
                .fp-card {
                    width: 100%; height: 100%;
                    background: #0c0c0c;
                    display: flex; flex-direction: column; overflow: hidden;
                    position: relative;
                }

                /* --- Header --- */
                .fp-header {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 20px 20px; 
                    background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%);
                    position: absolute; top: 0; left: 0; width: 100%; z-index: 20;
                    box-sizing: border-box; margin-top: 4px; pointer-events: none;
                }
                .fp-header > * { pointer-events: auto; }
                
                .fp-close-btn { 
                    background: rgba(255,255,255,0.1); border: none; color: white; 
                    width: 44px; height: 44px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; backdrop-filter: blur(12px);
                    transition: all 0.2s ease;
                }
                .fp-close-btn:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
                .fp-close-btn:active { transform: scale(0.95); }
                .fp-close-btn svg { width: 24px; height: 24px; fill: white; }

                #fp-header-title { 
                    color: white; font-weight: 600; font-size: 1.1rem; 
                    letter-spacing: 0.5px; text-shadow: 0 2px 8px rgba(0,0,0,0.8);
                }

                /* --- Send Button (Icon only, Image Picker style) --- */
                .fp-btn-send { 
                    background: ${THEME_COLOR}; color: white; border: none; 
                    width: 44px; height: 44px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; box-shadow: 0 4px 15px rgba(0, 149, 246, 0.4);
                    transition: all 0.2s ease;
                }
                .fp-btn-send svg { width: 20px; height: 20px; fill: white; margin-left: 2px; }
                .fp-btn-send:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0, 149, 246, 0.6); }
                .fp-btn-send:active:not(:disabled) { transform: scale(0.95); filter: brightness(0.9); }
                .fp-btn-send:disabled { background: #333; box-shadow: none; cursor: not-allowed; opacity: 0.5; }

                #fp-send-text { display: none; }

                /* --- Preview Area --- */
                .fp-preview-container {
                    flex: 1; padding: 80px 20px 120px 20px; overflow-y: auto;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 20px; background: #000;
                }

                /* Video Preview */
                .fp-video-wrapper { 
                    width: 100%; max-height: 55vh; border-radius: 20px; overflow: hidden; 
                    background: #000; display:none; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                }
                video { width: 100%; height: 100%; object-fit: contain; }

                /* File Icon Preview */
                .fp-file-icon-wrapper {
                    width: 140px; height: 140px; background: rgba(255,255,255,0.05); border-radius: 30px;
                    display: none; align-items: center; justify-content: center;
                    font-size: 4rem; color: #fff; border: 1px solid rgba(255,255,255,0.1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }
                
                /* File Meta Info */
                .fp-file-info-box { text-align: center; width: 100%; padding: 0 10px; margin-bottom: 20px; }
                .fp-file-name { color: white; font-weight: 600; margin-bottom: 8px; word-break: break-word; font-size: 1.1rem; line-height: 1.4; text-shadow: 0 2px 4px rgba(0,0,0,0.5);}
                .fp-file-meta { color: #a0a0a0; font-size: 0.85rem; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;}

                /* --- Trimmer UI (Glassmorphic) --- */
                .fp-trimmer-box {
                    width: 95%; max-width: 500px; padding: 20px; 
                    background: rgba(20, 20, 20, 0.85); border-radius: 25px;
                    display: none; border: 1px solid rgba(255,255,255,0.1); 
                    backdrop-filter: blur(15px); box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .fp-trim-label { font-size: 0.8rem; color: #ccc; margin-bottom: 15px; display: flex; justify-content: space-between; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                .fp-range-wrapper { position: relative; height: 36px; padding: 0 10px; }
                input[type=range] {
                    position: absolute; pointer-events: none; -webkit-appearance: none;
                    width: calc(100% - 20px); height: 4px; background: transparent; top: 16px; z-index: 5;
                }
                input[type=range]::-webkit-slider-thumb {
                    pointer-events: auto; -webkit-appearance: none;
                    width: 16px; height: 16px; background: #fff; 
                    border-radius: 50%; cursor: ew-resize; 
                    box-shadow: 0 2px 6px rgba(0,0,0,0.8);
                    transform: translateY(-6px);
                }
                .fp-track-bg {
                    position: absolute; top: 16px; height: 4px; width: calc(100% - 20px); 
                    background: rgba(255,255,255,0.1); border-radius: 2px;
                }
                .fp-track-fill {
                    position: absolute; top: 16px; height: 4px; background: ${THEME_COLOR}; z-index: 2; border-radius: 2px;
                }

                /* --- Caption Input (Matches Toolbar) --- */
                .fp-caption-box { 
                    position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);
                    width: 95%; max-width: 500px; z-index: 20; padding: 0;
                }
                .fp-caption-input {
                    width: 100%; background: rgba(20, 20, 20, 0.85); border: 1px solid rgba(255,255,255,0.1); color: white;
                    padding: 16px 24px; border-radius: 30px; font-size: 1rem; outline: none; transition: all 0.3s;
                    box-sizing: border-box; backdrop-filter: blur(15px); box-shadow: 0 10px 30px rgba(0,0,0,0.7);
                }
                .fp-caption-input:focus { border-color: ${THEME_COLOR}; background: rgba(30, 30, 30, 0.95); }

                /* --- Loading Spinner --- */
                .fp-loading {
                    position: absolute; top:0; left:0; width:100%; height:100%;
                    background: rgba(0,0,0,0.8); display: none; z-index: 50;
                    justify-content: center; align-items: center; flex-direction: column; color: white;
                    backdrop-filter: blur(8px);
                }
                .fp-spinner {
                    width: 45px; height: 45px; border: 4px solid rgba(255,255,255,0.1);
                    border-top: 4px solid ${THEME_COLOR}; border-radius: 50%;
                    animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite; margin-bottom: 20px;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .fp-loading-text { font-weight: 600; font-size: 1rem; letter-spacing: 1px; color: #ddd; text-align: center; padding: 0 20px; white-space: pre-wrap;}

                /* --- Toast Notification --- */
                .fp-toast {
                    position: absolute; top: 90px; left: 50%; transform: translateX(-50%) translateY(-10px);
                    background: rgba(20, 20, 20, 0.95); color: white; padding: 12px 24px;
                    border-radius: 30px; font-size: 0.9rem; pointer-events: none;
                    opacity: 0; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); 
                    border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 8px; z-index: 100;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.5); font-weight: 500;
                }
                .fp-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

                #fp-file-input { display: none; }
                .fp-btn-cancel { display: none; } /* Hidden in this UI layout */
            </style>

            <input type="file" id="fp-file-input" style="display:none !important">

            <div id="fp-overlay">
                
                <div class="fp-progress-container" id="fp-progress-container">
                    <div class="fp-progress-bar" id="fp-bar"></div>
                </div>

                <div class="fp-card">
                    
                    <div class="fp-header">
                        <button class="fp-close-btn" id="fp-close">
                            <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                        </button>
                        <span id="fp-header-title">Studio</span>
                        <button class="fp-btn-send" id="fp-send">
                            <span id="fp-send-text">Send</span>
                            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                        <button class="fp-btn fp-btn-cancel" id="fp-cancel" style="display:none;">Cancel</button>
                    </div>

                    <div class="fp-toast" id="fp-toast"><span></span></div>

                    <div class="fp-preview-container">
                        <div class="fp-video-wrapper" id="fp-vid-wrap">
                            <video id="fp-video-el" controls playsinline></video>
                        </div>
                        <div class="fp-file-icon-wrapper" id="fp-icon-wrap">
                            <span id="fp-type-emoji">📄</span>
                        </div>
                        <div class="fp-file-info-box" id="fp-info-text"></div>

                        <div class="fp-trimmer-box" id="fp-trimmer">
                            <div class="fp-trim-label">
                                <span style="display:flex; align-items:center; gap:6px;">✂️ Trim Video</span>
                                <span id="fp-time-display" style="font-family:monospace; color:white;">00:00 - 00:00</span>
                            </div>
                            <div class="fp-range-wrapper">
                                <div class="fp-track-bg"></div>
                                <div class="fp-track-fill" id="fp-fill"></div>
                                <input type="range" id="fp-start-range" min="0" value="0" step="0.1">
                                <input type="range" id="fp-end-range" min="0" value="100" step="0.1">
                            </div>
                        </div>
                    </div>

                    <div class="fp-caption-box">
                        <input type="text" class="fp-caption-input" id="fp-caption" placeholder="Add a caption..." autocomplete="off">
                    </div>

                    <div class="fp-loading" id="fp-loading">
                        <div class="fp-spinner"></div>
                        <span class="fp-loading-text" id="fp-loading-text">Optimizing Video...</span>
                    </div>

                </div>
            </div>
            `;
        }

        setupEvents() {
            const input = this.querySelector('#fp-file-input');
            const overlay = this.querySelector('#fp-overlay');
            const closeBtn = this.querySelector('#fp-close');
            const cancelBtn = this.querySelector('#fp-cancel');
            const sendBtn = this.querySelector('#fp-send');
            
            if(input) {
                input.addEventListener('change', async (e) => {
                    if (e.target.files.length > 0) await this.handleFileSelect(e.target.files[0]);
                });
            }

            const triggerBack = () => {
                if (this.isOpen) {
                    history.back(); 
                } else {
                    this.hideUI(); 
                }
            };

            closeBtn.addEventListener('click', triggerBack);
            cancelBtn.addEventListener('click', triggerBack);

            window.addEventListener('popstate', (event) => {
                if (this.isOpen) {
                    this.hideUI();
                }
            });

            sendBtn.addEventListener('click', () => this.uploadFile());

            // Video Trimmer Logic
            const startRange = this.querySelector('#fp-start-range');
            const endRange = this.querySelector('#fp-end-range');
            const video = this.querySelector('#fp-video-el');

            video.addEventListener('loadedmetadata', () => {
                if(this.fileType !== 'video') return;
                this.videoDuration = video.duration;
                this.trimStart = 0;
                this.trimEnd = video.duration;
                startRange.max = video.duration;
                endRange.max = video.duration;
                endRange.value = video.duration;
                startRange.value = 0;
                this.updateTrimmerUI();
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
                video.currentTime = isStart ? this.trimStart : this.trimEnd;
                this.updateTrimmerUI();
            };

            startRange.addEventListener('input', () => handleTrim(true));
            endRange.addEventListener('input', () => handleTrim(false));
        }

        updateTrimmerUI() {
            const fill = this.querySelector('#fp-fill');
            const display = this.querySelector('#fp-time-display');
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
        // 📉 THE FREE "SILENT CANVAS" COMPRESSION
        // ==========================================
        async compressVideo(file, loadingTextEl) {
            return new Promise((resolve) => {
                const video = document.createElement('video');
                video.src = URL.createObjectURL(file);
                video.crossOrigin = "anonymous";
                video.playsInline = true; 
                
                video.onloadedmetadata = () => {
                    // Start the Web Audio Context to silently route audio
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const source = audioCtx.createMediaElementSource(video);
                    const dest = audioCtx.createMediaStreamDestination();
                    
                    // Connect the video's audio to our destination, but NOT to the device speakers
                    source.connect(dest);

                    video.play().then(() => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Crush resolution to 360p max for extreme size savings
                        const MAX_HEIGHT = 360;
                        let w = video.videoWidth;
                        let h = video.videoHeight;
                        if (h > MAX_HEIGHT) {
                            w = Math.floor(w * (MAX_HEIGHT / h));
                            h = MAX_HEIGHT;
                        }
                        canvas.width = w; 
                        canvas.height = h;

                        // Capture 24 frames per second
                        const videoStream = canvas.captureStream(24);
                        const audioStream = dest.stream;
                        
                        // Merge the Canvas Video and Web Audio tracks together
                        const combinedStream = new MediaStream([
                            ...videoStream.getVideoTracks(),
                            ...audioStream.getAudioTracks()
                        ]);

                        // Record at 250kbps to guarantee hitting ~2MB
                        const recorder = new MediaRecorder(combinedStream, { 
                            videoBitsPerSecond: 250000,
                            audioBitsPerSecond: 32000
                        });
                        
                        const chunks = [];
                        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                        
                        recorder.onstop = () => {
                            // By leaving the Blob type blank, we let the browser package it natively
                            const blob = new Blob(chunks);
                            // It's technically a webm or mp4 depending on the browser, standardizing to .mp4 extension
                            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_compressed.mp4", { type: blob.type || 'video/mp4' });
                            
                            audioCtx.close();
                            resolve(compressedFile);
                        };
                        
                        recorder.start();
                        
                        // Continuously draw the hidden video to the hidden canvas
                        const drawFrame = () => {
                            if (video.paused || video.ended) {
                                if(recorder.state === "recording") recorder.stop();
                                return;
                            }
                            ctx.drawImage(video, 0, 0, w, h);
                            
                            // Update UI text with real-time countdown
                            if (loadingTextEl) {
                                const remaining = Math.max(0, Math.ceil(video.duration - video.currentTime));
                                loadingTextEl.innerText = `Compressing Video...\n(This will take ${remaining} seconds)`;
                            }
                            
                            requestAnimationFrame(drawFrame);
                        };
                        drawFrame();
                        
                        video.onended = () => {
                            if(recorder.state === "recording") recorder.stop();
                        };
                    }).catch((e) => {
                        console.error("Autoplay/Audio block prevented compression", e);
                        resolve(file); // Failsafe fallback
                    });
                };
            });
        }

        async handleFileSelect(file) {
            this.selectedFile = file;
            const overlay = this.querySelector('#fp-overlay');
            const title = this.querySelector('#fp-header-title');
            const infoText = this.querySelector('#fp-info-text');
            
            // Reset UI
            this.querySelector('#fp-vid-wrap').style.display = 'none';
            this.querySelector('#fp-icon-wrap').style.display = 'none';
            this.querySelector('#fp-trimmer').style.display = 'none';
            this.querySelector('#fp-video-el').src = '';
            this.querySelector('#fp-progress-container').style.display = 'none';

            this.isOpen = true;
            overlay.classList.add('open');
            window.history.pushState({ filePickerOpen: true }, "");

            const mime = file.type;
            
            const setMeta = (targetFile, type) => {
                const sizeStr = (targetFile.size / (1024*1024)).toFixed(2) + " MB";
                infoText.innerHTML = `<div class="fp-file-name">${targetFile.name}</div><div class="fp-file-meta">${type} • ${sizeStr}</div>`;
            };

            if (mime.startsWith('video/')) {
                this.fileType = 'video';
                title.innerText = 'Send Video';
                
                let finalFile = file;
                const sizeInMB = file.size / (1024 * 1024);
                
                // Trigger the silent Canvas compression if >= 3MB
                if (sizeInMB >= 3) {
                    const loadingScreen = this.querySelector('#fp-loading');
                    const loadingText = this.querySelector('#fp-loading-text');
                    const sendBtn = this.querySelector('#fp-send');
                    
                    sendBtn.disabled = true;
                    loadingText.innerText = "Starting Compression...\n(Please don't close the app)";
                    loadingScreen.style.display = "flex";
                    
                    try {
                        finalFile = await this.compressVideo(file, loadingText);
                    } catch (e) {
                        console.warn("Compression failed natively, using original", e);
                        finalFile = file; // Graceful fallback
                    }
                    
                    loadingScreen.style.display = "none";
                    sendBtn.disabled = false;
                }

                this.selectedFile = finalFile;
                
                // Render the UI
                const vidWrap = this.querySelector('#fp-vid-wrap');
                const video = this.querySelector('#fp-video-el');
                const trimmer = this.querySelector('#fp-trimmer');
                vidWrap.style.display = 'block';
                trimmer.style.display = 'block';
                video.src = URL.createObjectURL(finalFile);
                setMeta(finalFile, 'Video');
                
            } else if (mime === 'application/pdf') {
                this.fileType = 'pdf';
                title.innerText = 'Send PDF';
                this.showIcon('📄', '#ff3b30');
                setMeta(file, 'PDF');
            } else if (mime.startsWith('audio/')) {
                this.fileType = 'audio';
                title.innerText = 'Send Audio';
                this.showIcon('🎵', '#00e676');
                setMeta(file, 'Audio');
            } else if (mime.startsWith('image/')) {
                this.fileType = 'image';
                title.innerText = 'Send Image';
                this.showIcon('🖼️', '#ff6600');
                setMeta(file, 'Image');
            } else {
                this.fileType = 'file';
                title.innerText = 'Send File';
                this.showIcon('📁', '#0095f6');
                setMeta(file, 'File');
            }
        }

        showIcon(emoji, color) {
            const wrap = this.querySelector('#fp-icon-wrap');
            const icon = this.querySelector('#fp-type-emoji');
            wrap.style.display = 'flex';
            wrap.style.borderColor = color;
            wrap.style.boxShadow = `0 10px 30px ${color}30`; 
            icon.innerText = emoji;
        }

        showToast(message) {
            const toast = this.querySelector('#fp-toast');
            toast.querySelector('span').textContent = message;
            toast.classList.add('show');
            if(this.toastTimeout) clearTimeout(this.toastTimeout);
            this.toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3000);
        }

        async uploadFile() {
            if (!this.selectedFile || this.isUploading) return;
            
            if (!this.sbClient) {
                this.initSupabaseClient();
                if(!this.sbClient) {
                    this.showToast("API Config Error");
                    return;
                }
            }

            this.isUploading = true;
            const sendBtn = this.querySelector('#fp-send');
            const loadingScreen = this.querySelector('#fp-loading');
            const loadingText = this.querySelector('#fp-loading-text');
            const progressContainer = this.querySelector('#fp-progress-container');
            const bar = this.querySelector('#fp-bar');
            
            sendBtn.disabled = true;
            loadingScreen.style.display = "flex";
            progressContainer.style.display = "block";
            bar.style.width = "5%"; 

            // Grab the file (it was already compressed during the handleFileSelect phase)
            const fileToUpload = this.selectedFile;

            loadingText.innerText = "Uploading to Cloud...";
            bar.style.width = "40%"; 

            const cleanName = fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `${Date.now()}_${cleanName}`;

            try {
                let simulatedProgress = 40;
                const progressInterval = setInterval(() => {
                    if (simulatedProgress < 90) {
                        simulatedProgress += 5;
                        bar.style.width = simulatedProgress + "%";
                    }
                }, 300);

                const { data, error } = await this.sbClient.storage.from(STORAGE_BUCKET).upload(fileName, fileToUpload, { cacheControl: '3600', upsert: false });

                clearInterval(progressInterval);

                if (error) throw error;
                bar.style.width = "100%";

                const { data: publicData } = this.sbClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
                const downloadUrl = publicData.publicUrl;
                const caption = this.querySelector('#fp-caption').value;

                let metadata = {
                    name: fileToUpload.name,
                    size: fileToUpload.size,
                    type: this.fileType,
                    caption: caption
                };

                if (this.fileType === 'video') {
                    metadata.trimStart = this.trimStart;
                    metadata.trimEnd = this.trimEnd;
                    metadata.duration = this.videoDuration;
                }

                this.dispatchEvent(new CustomEvent('file-uploaded', {
                    detail: { url: downloadUrl, metadata: metadata },
                    bubbles: true, composed: true
                }));

                setTimeout(() => { 
                    if(this.isOpen) history.back(); 
                }, 400);

            } catch (error) {
                console.error('Upload error:', error);
                this.showToast("Upload failed");
                bar.style.width = "0%";
                sendBtn.disabled = false;
            } finally {
                loadingScreen.style.display = "none";
                if(!sendBtn.disabled) this.isUploading = false;
            }
        }

        openPicker() {
            const fileInput = this.querySelector('#fp-file-input');
            if(fileInput) fileInput.click();
        }

        hideUI() {
            this.isOpen = false;
            this.querySelector('#fp-overlay').classList.remove('open');
            this.querySelector('#fp-file-input').value = '';
            this.querySelector('#fp-caption').value = '';
            this.querySelector('#fp-bar').style.width = '0%';
            this.querySelector('#fp-progress-container').style.display = 'none';
            this.selectedFile = null;
            this.isUploading = false;
            this.querySelector('#fp-send').disabled = false;
            const video = this.querySelector('#fp-video-el');
            video.pause();
            video.src = "";
        }
    }

    if(!customElements.get('file-picker')) {
        customElements.define('file-picker', FilePicker);
    }
})();
