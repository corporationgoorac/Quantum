// ==========================================
// ⚙️ CONFIGURATION (EDIT HERE)
// ==========================================
const IMGBB_API_KEY = "d19129d9da57ced728f293be219f67ef"; 
const THEME_COLOR = "#ff6600"; // Orange
// ==========================================

class ImagePicker extends HTMLElement {
    constructor() {
        super();
        
        this.apiKey = IMGBB_API_KEY;
        this.selectedFile = null;
        this.previewUrl = null;
        this.isUploading = false;
        
        // Editor State
        this.currentRotation = 0;
        this.isGrayscale = false;
        this.isFlipped = false; 
        this.cropper = null; 
    }

    connectedCallback() {
        this.loadCropperResources();
        this.render();
        this.setupEvents();
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

    render() {
        this.innerHTML = `
        <style>
            :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            
            /* --- OVERLAY & ANIMATION --- */
            .ip-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: #000000; z-index: 10000;
                display: none; flex-direction: column;
                opacity: 0; transition: opacity 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            .ip-overlay.open { display: flex; opacity: 1; }

            /* --- IG STORY STYLE PROGRESS BAR --- */
            .ip-progress-container {
                position: absolute; top: 0; left: 0; width: 100%; height: 4px;
                background: rgba(255,255,255,0.2); z-index: 100;
                display: none;
            }
            .ip-progress-bar {
                height: 100%; width: 0%;
                background: ${THEME_COLOR};
                transition: width 0.1s linear;
                box-shadow: 0 0 8px ${THEME_COLOR};
            }

            /* --- HEADER --- */
            .ip-header {
                display: flex; justify-content: space-between; align-items: center;
                padding: 20px 20px; 
                background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%);
                position: absolute; top: 0; left: 0; width: 100%; z-index: 20;
                box-sizing: border-box; pointer-events: none;
                margin-top: 4px; /* Space for progress bar */
            }
            .ip-header > * { pointer-events: auto; }
            
            .ip-btn-icon {
                background: rgba(255,255,255,0.1); border: none; color: white; 
                width: 44px; height: 44px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; backdrop-filter: blur(12px);
                transition: all 0.2s ease;
            }
            .ip-btn-icon:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
            .ip-btn-icon:active { transform: scale(0.95); }
            .ip-btn-icon svg { width: 24px; height: 24px; fill: white; }

            .ip-title { 
                color: white; font-weight: 600; font-size: 1.1rem; 
                letter-spacing: 0.5px;
                text-shadow: 0 2px 8px rgba(0,0,0,0.8);
            }

            /* Redesigned Send Button */
            .ip-send-btn { 
                background: ${THEME_COLOR}; color: white; border: none; 
                width: 44px; height: 44px; border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                cursor: pointer; box-shadow: 0 4px 15px rgba(255, 102, 0, 0.5);
                transition: all 0.2s ease;
            }
            .ip-send-btn svg { width: 20px; height: 20px; fill: white; margin-left: 2px; }
            .ip-send-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(255, 102, 0, 0.7); }
            .ip-send-btn:active { transform: scale(0.95); filter: brightness(0.9); }

            /* --- PREVIEW AREA --- */
            .ip-preview-container {
                flex: 1; display: flex; justify-content: center; align-items: center;
                overflow: hidden; position: relative; background: #0c0c0c;
                width: 100%; height: 100%;
            }
            
            .ip-image {
                max-width: 100%; max-height: 75vh; 
                object-fit: contain;
                display: block; 
                transition: filter 0.3s ease, transform 0.3s ease;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            }

            /* --- TEXT OVERLAY INPUT --- */
            .ip-text-overlay {
                position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                z-index: 25; display: none; width: 90%; text-align: center;
            }
            .ip-text-overlay.active { display: block; }
            .ip-text-input {
                background: transparent; border: none; color: white;
                font-size: 2rem; font-weight: bold; text-align: center; width: 100%;
                text-shadow: 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000;
                outline: none; font-family: Impact, sans-serif;
            }
            .ip-text-input::placeholder { color: rgba(255,255,255,0.6); text-shadow: none; font-weight: normal; }

            /* --- TOOLBAR REDESIGN --- */
            .ip-toolbar-wrapper {
                position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
                width: 95%; max-width: 500px;
                background: rgba(20, 20, 20, 0.85);
                backdrop-filter: blur(15px);
                border-radius: 25px; padding: 10px 5px;
                border: 1px solid rgba(255,255,255,0.1);
                box-shadow: 0 10px 30px rgba(0,0,0,0.7);
                padding-bottom: max(10px, env(safe-area-inset-bottom));
                z-index: 20;
            }

            .ip-toolbar {
                display: flex; justify-content: space-around; align-items: center;
                width: 100%;
            }

            .ip-tool {
                display: flex; flex-direction: column; align-items: center; gap: 4px;
                color: #a0a0a0; background: none; border: none; font-size: 0.65rem; font-weight: 600; cursor: pointer;
                transition: all 0.2s; width: 60px; padding: 8px 0; border-radius: 15px;
            }
            .ip-tool svg { width: 24px; height: 24px; fill: currentColor; transition: transform 0.2s; }
            .ip-tool:hover { background: rgba(255,255,255,0.05); color: #fff; }
            .ip-tool.active { color: ${THEME_COLOR}; background: rgba(255, 102, 0, 0.1); }
            .ip-tool:active svg { transform: scale(0.8); }
            
            /* --- CROP ACTIONS --- */
            .ip-crop-actions {
                position: absolute; bottom: 120px; left: 0; width: 100%;
                display: flex; justify-content: center; gap: 15px;
                z-index: 30; pointer-events: none; opacity: 0; transition: opacity 0.3s;
            }
            .ip-crop-actions.visible { opacity: 1; pointer-events: auto; }
            
            .ip-pill-btn {
                background: rgba(30,30,30,0.9); color: white; border: 1px solid rgba(255,255,255,0.1);
                padding: 10px 24px; border-radius: 30px; font-weight: 600; cursor: pointer;
                backdrop-filter: blur(10px); transition: all 0.2s; font-size: 0.9rem;
            }
            .ip-pill-btn:hover { background: rgba(50,50,50,0.9); }
            .ip-pill-btn.confirm { background: ${THEME_COLOR}; border-color: ${THEME_COLOR}; box-shadow: 0 4px 15px rgba(255, 102, 0, 0.4); }
            .ip-pill-btn.confirm:hover { filter: brightness(1.1); }
            
            /* --- LOADING OVERLAY --- */
            .ip-loading {
                position: absolute; top:0; left:0; width:100%; height:100%;
                background: rgba(0,0,0,0.7); display: none; z-index: 50;
                justify-content: center; align-items: center; flex-direction: column; color: white;
                backdrop-filter: blur(8px);
            }
            .ip-spinner {
                width: 45px; height: 45px; border: 4px solid rgba(255,255,255,0.1);
                border-top: 4px solid ${THEME_COLOR}; border-radius: 50%;
                animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite; margin-bottom: 20px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .ip-loading-text { font-weight: 600; font-size: 1rem; letter-spacing: 1px; color: #ddd; }

            /* --- TOAST NOTIFICATION --- */
            .ip-toast {
                position: absolute; top: 90px; left: 50%; transform: translateX(-50%) translateY(-10px);
                background: rgba(20, 20, 20, 0.95); color: white; padding: 12px 24px;
                border-radius: 30px; font-size: 0.9rem; font-weight: 500; pointer-events: none;
                opacity: 0; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); 
                border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 8px; z-index: 60;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
            .ip-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

            #ip-file-input { display: none; }
            .cropper-view-box, .cropper-face { border-radius: 0; }
            .cropper-modal { background-color: rgba(0, 0, 0, 0.85); }
        </style>

        <div class="ip-overlay" id="ip-overlay">
            
            <div class="ip-progress-container" id="ip-progress-container">
                <div class="ip-progress-bar" id="ip-progress-bar"></div>
            </div>

            <div class="ip-header">
                <button class="ip-btn-icon" id="ip-back">
                    <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </button>
                <span class="ip-title">Studio</span>
                <button class="ip-send-btn" id="ip-upload-btn">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>

            <div class="ip-toast" id="ip-toast">
                <span></span>
            </div>

            <div class="ip-preview-container">
                <img id="ip-preview-img" class="ip-image" src="" alt="Preview">
                
                <div class="ip-text-overlay" id="ip-text-overlay">
                    <input type="text" class="ip-text-input" id="ip-text-input" placeholder="Type text here..." autocomplete="off">
                </div>
                
                <div class="ip-crop-actions" id="ip-crop-actions">
                    <button class="ip-pill-btn" id="ip-cancel-crop">Cancel</button>
                    <button class="ip-pill-btn confirm" id="ip-apply-crop">Save Crop</button>
                </div>

                <div class="ip-loading" id="ip-loading">
                    <div class="ip-spinner"></div>
                    <span class="ip-loading-text" id="ip-loading-text">Optimizing...</span>
                </div>
            </div>

            <div class="ip-toolbar-wrapper" id="ip-main-toolbar">
                <div class="ip-toolbar">
                    <button class="ip-tool" id="btn-text">
                        <svg viewBox="0 0 24 24"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>
                        <span>Text</span>
                    </button>
                    
                    <button class="ip-tool" id="btn-rotate">
                        <svg viewBox="0 0 24 24"><path d="M7.11 8.53L5.7 7.11C4.8 8.27 4.24 9.61 4.07 11h2.02c.14-.87.49-1.72 1.02-2.47zM6.09 13H4.07c.17 1.39.72 2.73 1.62 3.89l1.41-1.42c-.52-.75-.87-1.59-1.01-2.47zm1.01 5.32c1.16.9 2.51 1.44 3.9 1.61V17.9c-.87-.15-1.71-.49-2.46-1.03L7.1 18.32zM13 4.07V1L8.45 5.55 13 10V6.09c2.84.48 5 2.94 5 5.91s-2.16 5.43-5 5.91v2.02c3.95-.49 7-3.85 7-7.93s-3.05-7.44-7-7.93z"/></svg>
                        <span>Rotate</span>
                    </button>

                    <button class="ip-tool" id="btn-flip">
                        <svg viewBox="0 0 24 24"><path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z"/></svg>
                        <span>Flip</span>
                    </button>
                    
                    <button class="ip-tool" id="btn-filter">
                       <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span>B&W</span>
                    </button>

                     <button class="ip-tool" id="btn-crop">
                        <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17 7l-5 5-5-5-1.41 1.41L10.59 12 5.59 17 7 18.41 12 13.41 17 18.41 18.41 17 13.41 12 18.41 7z"/></svg>
                        <span>Crop</span>
                    </button>

                    <button class="ip-tool" id="btn-reset">
                        <svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
                        <span>Reset</span>
                    </button>
                </div>
            </div>
        </div>

        <input type="file" id="ip-file-input" accept="image/*">
        `;
    }

    setupEvents() {
        const overlay = this.querySelector('#ip-overlay');
        const fileInput = this.querySelector('#ip-file-input');
        const backBtn = this.querySelector('#ip-back');
        const uploadBtn = this.querySelector('#ip-upload-btn');
        const rotateBtn = this.querySelector('#btn-rotate');
        const flipBtn = this.querySelector('#btn-flip'); 
        const filterBtn = this.querySelector('#btn-filter');
        const cropBtn = this.querySelector('#btn-crop');
        const resetBtn = this.querySelector('#btn-reset');
        const textBtn = this.querySelector('#btn-text');
        const applyCropBtn = this.querySelector('#ip-apply-crop');
        const cancelCropBtn = this.querySelector('#ip-cancel-crop');
        const textOverlay = this.querySelector('#ip-text-overlay');
        const textInput = this.querySelector('#ip-text-input');

        // --- Back / Close Logic ---
        backBtn.onclick = () => {
            if (this.cropper) {
                this.destroyCropper();
            } else {
                this.close();
            }
        };

        window.addEventListener('popstate', (event) => {
            if (overlay.classList.contains('open')) {
                this.close(true); 
            }
        });

        // --- File Selection ---
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.selectedFile = file;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    this.previewUrl = evt.target.result;
                    const img = this.querySelector('#ip-preview-img');
                    img.src = this.previewUrl;
                    
                    // Reset State
                    this.resetEditorState();
                    
                    // Open Overlay
                    overlay.classList.add('open');
                    window.history.pushState({ imagePickerOpen: true }, document.title);
                };
                reader.readAsDataURL(file);
            }
        };

        // --- Editor Tools ---
        
        textBtn.onclick = () => {
            const isActive = textOverlay.classList.contains('active');
            if (isActive) {
                textOverlay.classList.remove('active');
                textBtn.classList.remove('active');
            } else {
                textOverlay.classList.add('active');
                textBtn.classList.add('active');
                textInput.focus();
                this.showToast("Type to add text");
            }
        };

        rotateBtn.onclick = () => {
            if (this.cropper) {
                this.cropper.rotate(90);
            } else {
                this.currentRotation = (this.currentRotation + 90) % 360;
                this.updateImageVisuals();
            }
            if(navigator.vibrate) navigator.vibrate(10);
        };

        flipBtn.onclick = () => {
             if (this.cropper) {
                const data = this.cropper.getData();
                this.cropper.scaleX(data.scaleX === -1 ? 1 : -1);
            } else {
                this.isFlipped = !this.isFlipped;
                this.updateImageVisuals();
            }
            if(navigator.vibrate) navigator.vibrate(10);
        };

        filterBtn.onclick = () => {
            this.isGrayscale = !this.isGrayscale;
            this.updateImageVisuals();
            filterBtn.classList.toggle('active', this.isGrayscale);
            if(navigator.vibrate) navigator.vibrate(10);
            if(this.isGrayscale) this.showToast("B&W Filter Applied");
        };

        cropBtn.onclick = () => {
            if (!this.cropper && window.Cropper) {
                this.initCropper();
            }
        };

        resetBtn.onclick = () => {
            this.resetEditorState();
            this.showToast("Changes reset");
        };

        applyCropBtn.onclick = () => {
            if (!this.cropper) return;
            const canvas = this.cropper.getCroppedCanvas();
            this.previewUrl = canvas.toDataURL('image/jpeg');
            this.querySelector('#ip-preview-img').src = this.previewUrl;
            
            this.currentRotation = 0; 
            this.isFlipped = false; 
            
            this.destroyCropper();
            this.updateImageVisuals();
            this.showToast("Crop saved");
        };

        cancelCropBtn.onclick = () => {
            this.destroyCropper();
            this.updateImageVisuals();
        };

        uploadBtn.onclick = () => this.processAndUpload();
    }

    resetEditorState() {
        this.currentRotation = 0;
        this.isGrayscale = false;
        this.isFlipped = false;
        this.destroyCropper();
        this.updateImageVisuals();
        
        // Reset buttons UI
        this.querySelector('#btn-filter').classList.remove('active');
        this.querySelector('#btn-text').classList.remove('active');
        this.querySelector('#ip-text-overlay').classList.remove('active');
        this.querySelector('#ip-text-input').value = "";
    }

    initCropper() {
        const img = this.querySelector('#ip-preview-img');
        
        this.querySelector('#ip-main-toolbar').style.display = 'none';
        this.querySelector('#ip-crop-actions').classList.add('visible');
        this.querySelector('#ip-upload-btn').style.display = 'none';
        this.querySelector('#ip-text-overlay').style.display = 'none';

        img.style.transform = 'none'; 
        
        let scaleXVal = this.isFlipped ? -1 : 1;

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
            initialAspectRatio: NaN,
            rotatable: true,
            data: { 
                rotate: this.currentRotation,
                scaleX: scaleXVal 
            }
        });
    }

    destroyCropper() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
        this.querySelector('#ip-main-toolbar').style.display = 'block';
        this.querySelector('#ip-crop-actions').classList.remove('visible');
        this.querySelector('#ip-upload-btn').style.display = 'flex';
        
        if(this.querySelector('#btn-text').classList.contains('active')) {
             this.querySelector('#ip-text-overlay').style.display = 'block';
        }
        
        this.updateImageVisuals();
    }

    updateImageVisuals() {
        const img = this.querySelector('#ip-preview-img');
        const filterVal = this.isGrayscale ? 'grayscale(100%)' : 'none';
        
        if (!this.cropper) {
            const flipTransform = this.isFlipped ? 'scaleX(-1)' : '';
            const rotateTransform = `rotate(${this.currentRotation}deg)`;
            img.style.transform = `${rotateTransform} ${flipTransform}`;
        }
        img.style.filter = filterVal;
    }

    showToast(message) {
        const toast = this.querySelector('#ip-toast');
        toast.querySelector('span').textContent = message;
        toast.classList.add('show');
        
        if(this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    async processAndUpload() {
        if (!this.previewUrl || this.isUploading) return;
        
        // Auto-apply crop if pending
        if (this.cropper) {
             const canvas = this.cropper.getCroppedCanvas();
             this.previewUrl = canvas.toDataURL('image/jpeg');
             this.currentRotation = 0; 
             this.isFlipped = false;
             this.destroyCropper();
        }

        if (!this.apiKey) {
            this.showToast("Missing API Key");
            return;
        }

        this.isUploading = true;
        this.querySelector('#ip-loading').style.display = 'flex';
        this.querySelector('#ip-loading-text').textContent = "Optimizing Image...";
        this.querySelector('#ip-progress-container').style.display = 'block';
        const progressBar = this.querySelector('#ip-progress-bar');
        progressBar.style.width = '0%';

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.src = this.previewUrl;
            await new Promise(r => img.onload = r);

            // ==========================================
            // 🔥 MASSIVE COMPRESSION ALGORITHM
            // Target: Make 10MB file -> < 1MB
            // ==========================================
            const MAX_DIMENSION = 1600; 
            const COMPRESSION_QUALITY = 0.5; // Quality factor (0.0 - 1.0)
            
            let targetWidth = img.width;
            let targetHeight = img.height;

            // Calculate new dimensions (Maintain Aspect Ratio)
            if (Math.max(targetWidth, targetHeight) > MAX_DIMENSION) {
                const ratio = MAX_DIMENSION / Math.max(targetWidth, targetHeight);
                targetWidth = Math.round(targetWidth * ratio);
                targetHeight = Math.round(targetHeight * ratio);
            }

            // Handle Rotation Dimensions for Canvas
            if (this.currentRotation === 90 || this.currentRotation === 270) {
                canvas.width = targetHeight;
                canvas.height = targetWidth;
            } else {
                canvas.width = targetWidth;
                canvas.height = targetHeight;
            }

            // Apply Transformations (Translate -> Rotate -> Scale)
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(this.currentRotation * Math.PI / 180);
            
            // Handle Flip
            if (this.isFlipped) {
                 ctx.scale(-1, 1);
            }

            if (this.isGrayscale) {
                ctx.filter = 'grayscale(100%)';
            }
            
            // Draw the SCALED image
            ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);

            // ==========================================
            // 🎨 RENDER TEXT ONTO CANVAS
            // ==========================================
            const textVal = this.querySelector('#ip-text-input').value.trim();
            if (textVal && this.querySelector('#btn-text').classList.contains('active')) {
                // Reset transform/filter specifically for text so it draws normally relative to the rotated image
                ctx.filter = 'none'; 
                
                // Meme text style
                const fontSize = Math.max(targetWidth, targetHeight) * 0.08;
                ctx.font = `bold ${fontSize}px Impact, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "white";
                ctx.strokeStyle = "black";
                ctx.lineWidth = fontSize * 0.05;

                // Center coordinates
                const textX = 0; // Since canvas is translated to center
                const textY = 0; 
                
                ctx.strokeText(textVal, textX, textY);
                ctx.fillText(textVal, textX, textY);
            }

            // Generate Compressed Blob
            const processedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', COMPRESSION_QUALITY));
            const formData = new FormData();
            formData.append('image', processedBlob);

            this.querySelector('#ip-loading-text').textContent = "Uploading...";

            // ==========================================
            // 🚀 UPLOAD WITH PROGRESS TRACKING (XHR)
            // ==========================================
            const result = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `https://api.imgbb.com/1/upload?key=${this.apiKey}`);
                
                // Instagram style progress bar update
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        progressBar.style.width = percentComplete + '%';
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const json = JSON.parse(xhr.responseText);
                            resolve(json);
                        } catch(err) {
                            reject(new Error("Invalid JSON response"));
                        }
                    } else {
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                };
                
                xhr.onerror = () => reject(new Error("Network Error occurred"));
                xhr.send(formData);
            });

            if (result.success) {
                progressBar.style.width = '100%';
                setTimeout(() => { // slight delay for visual completion
                    this.dispatchEvent(new CustomEvent('image-uploaded', { 
                        detail: { url: result.data.url },
                        bubbles: true, 
                        composed: true 
                    }));
                    this.close();
                }, 300);
            } else {
                throw new Error(result.error ? result.error.message : "Upload error");
            }

        } catch (error) {
            console.error(error);
            this.showToast("Error: " + error.message);
            this.querySelector('#ip-progress-container').style.display = 'none';
        } finally {
            this.isUploading = false;
            this.querySelector('#ip-loading').style.display = 'none';
        }
    }

    openPicker() {
        this.querySelector('#ip-file-input').click();
    }

    close(fromHistory = false) {
        this.querySelector('#ip-overlay').classList.remove('open');
        this.querySelector('#ip-file-input').value = ''; 
        this.selectedFile = null;
        this.isUploading = false;
        this.querySelector('#ip-loading').style.display = 'none';
        this.querySelector('#ip-progress-container').style.display = 'none';
        this.querySelector('#ip-progress-bar').style.width = '0%';
        this.destroyCropper();
        
        if (!fromHistory) {
             if (history.state && history.state.imagePickerOpen) {
                 history.back();
             }
        }
        
        this.querySelector('#btn-filter').classList.remove('active');
        this.querySelector('#btn-text').classList.remove('active');
        this.querySelector('#ip-text-overlay').classList.remove('active');
    }
}

customElements.define('image-picker', ImagePicker);
