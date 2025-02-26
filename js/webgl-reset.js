// Enhanced WebGL Enemy Renderer with proper cleanup and resource management
class EnhancedEnemyRenderer {
    constructor(gameArea) {
      this.gameArea = gameArea;
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'enemy-canvas-' + Date.now(); // Unique ID to avoid conflicts
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
      this.canvas.style.zIndex = '5'; // Above the grid but below UI elements
      
      // Register in global resources registry for cleanup
      if (!window.webGLResources) {
        window.webGLResources = { canvases: [], renderers: [], textures: [] };
      }
      window.webGLResources.canvases.push(this.canvas);
      window.webGLResources.renderers.push(this);
      
      // Add canvas to game area
      this.gameArea.appendChild(this.canvas);
      
      // Initialize WebGL with better error handling
      this.gl = this.initWebGL(this.canvas);
      if (!this.gl) {
        console.warn('WebGL not supported or failed to initialize, falling back to canvas renderer');
        this.fallbackToCanvas();
        return;
      }
      
      // Set canvas dimensions - Ensure we don't resize to 0x0
      this.resizeCanvas();
      this.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          if (entry.target === this.gameArea) {
            this.resizeCanvas();
          }
        }
      });
      this.resizeObserver.observe(this.gameArea);
      
      // Initialize shaders
      if (!this.initShaders()) {
        console.warn('Failed to initialize WebGL shaders, falling back to canvas renderer');
        this.fallbackToCanvas();
        return;
      }
      
      // Load soldier model
      this.loadSoldierModel();
      
      // Animation properties
      this.lastFrame = 0;
      this.enemyInstances = {};
      this.enemyCount = 0;
      
      // Start render loop
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
      
      console.log('Enhanced WebGL Enemy Renderer initialized successfully');
    }
  
    // Dispose method for cleanup
    dispose() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      
      // Clean up WebGL resources
      if (this.gl) {
        // Delete textures
        for (const type in this.soldierModel) {
          if (this.soldierModel[type].texture) {
            this.gl.deleteTexture(this.soldierModel[type].texture);
          }
        }
        
        // Delete buffers
        for (const type in this.soldierModel) {
          if (this.soldierModel[type].buffers) {
            this.gl.deleteBuffer(this.soldierModel[type].buffers.position);
            this.gl.deleteBuffer(this.soldierModel[type].buffers.normal);
            this.gl.deleteBuffer(this.soldierModel[type].buffers.textureCoord);
            this.gl.deleteBuffer(this.soldierModel[type].buffers.indices);
          }
        }
        
        // Delete shaders and program
        if (this.shaderProgram) {
          this.gl.deleteProgram(this.shaderProgram);
        }
      }
      
      // Clear all enemy instances
      this.enemyInstances = {};
      
      console.log('WebGL Enemy Renderer disposed');
    }
  
    initWebGL(canvas) {
      let gl = null;
      try {
        // Try to grab the standard context. If it fails, fallback to experimental.
        gl = canvas.getContext('webgl', { 
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: false
        }) || canvas.getContext('experimental-webgl');
      } catch(e) {
        console.error('Error initializing WebGL: ' + e.message);
        return null;
      }
      
      // If we don't have a GL context, give up now
      if (!gl) {
        console.error('Unable to initialize WebGL. Your browser may not support it.');
        return null;
      }
      
      return gl;
    }
    
    resizeCanvas() {
      // Get the dimensions of the game area
      const rect = this.gameArea.getBoundingClientRect();
      
      // Ensure minimum dimensions to avoid WebGL errors
      const width = Math.max(rect.width, 1);
      const height = Math.max(rect.height, 1);
      
      // Set canvas size to match game area
      this.canvas.width = width;
      this.canvas.height = height;
      
      // Also update WebGL viewport if GL context exists
      if (this.gl) {
        this.gl.viewport(0, 0, width, height);
      }
      
      console.log(`Canvas resized to ${this.canvas.width}x${this.canvas.height}`);
    }
  
    // The rest of the EnemyRenderer methods remain the same, except for loadTexture
    // which we'll modify to use the texture cache:
    
    loadTexture(type) {
      try {
        // Check if this texture is already cached
        if (window.textureCache && window.textureCache[type]) {
          return window.textureCache[type];
        }
        
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // Add to resources registry for cleanup
        if (window.webGLResources) {
          window.webGLResources.textures.push(texture);
        }
        
        // Fill with a placeholder color until the image is loaded
        let color;
        if (type === 'red') {
          // Red enemy - dark red color
          color = new Uint8Array([200, 50, 50, 255]);
        } else {
          // Green enemy - dark green color
          color = new Uint8Array([50, 200, 50, 255]);
        }
        
        this.gl.texImage2D(
          this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, 
          this.gl.UNSIGNED_BYTE, color
        );
        
        // Set texture parameters to handle non-power-of-2 textures
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        
        // Try to load actual texture
        const image = new Image();
        
        // Set up proper error handling for the image
        image.onerror = (e) => {
          console.warn(`Failed to load enemy texture for ${type} enemy, using color fallback`, e);
          // The fallback solid color is already set above
        };
        
        image.onload = () => {
          try {
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.texImage2D(
              this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, 
              this.gl.UNSIGNED_BYTE, image
            );
            
            // WebGL1 has different requirements for power-of-2 vs. non-power-of-2 images
            if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
              this.gl.generateMipmap(this.gl.TEXTURE_2D);
            } else {
              this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
              this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
              this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            }
            console.log(`Successfully loaded texture for ${type} enemy`);
          } catch (err) {
            console.error(`Error applying texture for ${type} enemy:`, err);
          }
        };
        
        // Try to load the image from the most reliable path
        const basePath = window.location.href.includes('file:') ? '' : '/';
        image.src = `${basePath}assets/images/enemy_${type}.png`;
        
        // Cache this texture
        if (window.textureCache) {
          window.textureCache[type] = texture;
        }
        
        return texture;
      } catch (error) {
        console.error('Error creating texture:', error);
        return null;
      }
    }
  
    // Modified animation method to store animation frame ID for cleanup
    animate(timestamp) {
      if (!this.lastFrame) {
        this.lastFrame = timestamp;
      }
      const deltaTime = timestamp - this.lastFrame;
      this.lastFrame = timestamp;
      
      this.updateAnimations(deltaTime);
      this.render();
      
      this.animationFrameId = requestAnimationFrame((ts) => this.animate(ts));
    }
  }
  
  // Override original EnemyRenderer with our enhanced version
  window.EnemyRenderer = EnhancedEnemyRenderer;