// Improved WebGL Enemy Renderer with better error handling and device compatibility
class EnemyRenderer {
  constructor(gameArea) {
    this.gameArea = gameArea;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'enemy-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
    this.canvas.style.zIndex = '5'; // Above the grid but below UI elements
    
    // Add canvas to game area
    this.gameArea.appendChild(this.canvas);
    
    // Initialize WebGL with better error handling
    this.gl = this.initWebGL(this.canvas);
    if (!this.gl) {
      console.warn('WebGL not supported or failed to initialize, falling back to canvas renderer');
      this.fallbackToCanvas();
      return;
    }
    
    // Set canvas dimensions
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
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
    this.animate();

    console.log('WebGL Enemy Renderer initialized successfully');
  }

  initWebGL(canvas) {
    let gl = null;
    try {
      // Try to grab the standard context. If it fails, fallback to experimental.
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
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
    
    // Set canvas size to match game area
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    // Also update WebGL viewport if GL context exists
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    
    console.log(`Canvas resized to ${this.canvas.width}x${this.canvas.height}`);
  }
  
  fallbackToCanvas() {
    // If WebGL is not supported, use Canvas 2D as fallback
    this.gl = null;
    this.ctx = this.canvas.getContext('2d');
    this.renderType = 'canvas';
    console.log('Using Canvas 2D fallback for enemy rendering');
  }
  
  initShaders() {
    try {
      // Vertex shader program - simplified for reliability
      const vsSource = `
        precision mediump float;

        attribute vec4 aVertexPosition;
        attribute vec3 aVertexNormal;
        attribute vec2 aTextureCoord;
        
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uNormalMatrix;
        
        varying highp vec2 vTextureCoord;
        varying highp vec3 vLighting;
        
        void main(void) {
          gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
          vTextureCoord = aTextureCoord;
          
          // Apply lighting effect
          highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
          highp vec3 directionalLightColor = vec3(1, 1, 1);
          highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));
          
          highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
          
          highp float directional = max(dot(transformedNormal.xyz, directionalVector), 0.0);
          vLighting = ambientLight + (directionalLightColor * directional);
        }
      `;
  
      // Fragment shader program - simplified for reliability
      const fsSource = `
        precision mediump float;

        varying highp vec2 vTextureCoord;
        varying highp vec3 vLighting;
        
        uniform sampler2D uSampler;
        uniform vec4 uColor;
        uniform float uEffectStrength;
        uniform int uEffectType; // 0: normal, 1: frozen, 2: fire
        
        void main(void) {
          highp vec4 texelColor = texture2D(uSampler, vTextureCoord) * uColor;
          
          // Apply effect based on type
          if (uEffectType == 1) {
            // Frozen effect - blue tint
            highp vec3 frozenColor = vec3(0.7, 0.8, 1.0);
            texelColor.rgb = mix(texelColor.rgb, frozenColor, uEffectStrength);
          } else if (uEffectType == 2) {
            // Fire effect - orange/red glow
            highp vec3 fireColor = vec3(1.0, 0.6, 0.2);
            texelColor.rgb = mix(texelColor.rgb, fireColor, uEffectStrength * 0.7);
            texelColor.rgb += fireColor * uEffectStrength * 0.3;
          }
          
          gl_FragColor = vec4(texelColor.rgb * vLighting, texelColor.a);
        }
      `;
  
      // Initialize shader program
      const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
      const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);
      
      if (!vertexShader || !fragmentShader) {
        console.error("Failed to compile shaders");
        return false;
      }
  
      // Create the shader program
      this.shaderProgram = this.gl.createProgram();
      this.gl.attachShader(this.shaderProgram, vertexShader);
      this.gl.attachShader(this.shaderProgram, fragmentShader);
      this.gl.linkProgram(this.shaderProgram);
  
      // Check if shader program was created successfully
      if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(this.shaderProgram));
        return false;
      }
  
      // Get shader program info
      this.programInfo = {
        program: this.shaderProgram,
        attribLocations: {
          vertexPosition: this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
          vertexNormal: this.gl.getAttribLocation(this.shaderProgram, 'aVertexNormal'),
          textureCoord: this.gl.getAttribLocation(this.shaderProgram, 'aTextureCoord'),
        },
        uniformLocations: {
          projectionMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix'),
          modelViewMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uModelViewMatrix'),
          normalMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uNormalMatrix'),
          uSampler: this.gl.getUniformLocation(this.shaderProgram, 'uSampler'),
          uColor: this.gl.getUniformLocation(this.shaderProgram, 'uColor'),
          uEffectStrength: this.gl.getUniformLocation(this.shaderProgram, 'uEffectStrength'),
          uEffectType: this.gl.getUniformLocation(this.shaderProgram, 'uEffectType'),
        },
      };
      
      return true;
    } catch (error) {
      console.error('Error initializing shaders:', error);
      return false;
    }
  }
  
  loadShader(type, source) {
    try {
      const shader = this.gl.createShader(type);
      this.gl.shaderSource(shader, source);
      this.gl.compileShader(shader);
  
      // Check if compilation was successful
      if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
        this.gl.deleteShader(shader);
        return null;
      }
  
      return shader;
    } catch (error) {
      console.error('Error loading shader:', error);
      return null;
    }
  }
  
  loadSoldierModel() {
    // Create simplified model for better compatibility
    this.soldierModel = {
      // Red enemy (basic soldier)
      red: {
        vertices: this.createSimpleSoldierVertices(1.0, 0.5, 0.5),
        texture: this.loadTexture('red'),
        animationFrames: 8,
      },
      // Green enemy (tougher soldier)
      green: {
        vertices: this.createSimpleSoldierVertices(0.5, 1.0, 0.5),
        texture: this.loadTexture('green'),
        animationFrames: 8,
      }
    };
    
    // Create buffers for the models
    this.createBuffers();
  }
  
  createSimpleSoldierVertices(r, g, b) {
    // Create a simplified soldier shape - just a simple box for reliability
    const vertices = [
      // Front face
      -0.5, -0.5,  0.5,
       0.5, -0.5,  0.5,
       0.5,  0.5,  0.5,
      -0.5,  0.5,  0.5,
      
      // Back face
      -0.5, -0.5, -0.5,
      -0.5,  0.5, -0.5,
       0.5,  0.5, -0.5,
       0.5, -0.5, -0.5,
      
      // Top face
      -0.5,  0.5, -0.5,
      -0.5,  0.5,  0.5,
       0.5,  0.5,  0.5,
       0.5,  0.5, -0.5,
      
      // Bottom face
      -0.5, -0.5, -0.5,
       0.5, -0.5, -0.5,
       0.5, -0.5,  0.5,
      -0.5, -0.5,  0.5,
      
      // Right face
       0.5, -0.5, -0.5,
       0.5,  0.5, -0.5,
       0.5,  0.5,  0.5,
       0.5, -0.5,  0.5,
      
      // Left face
      -0.5, -0.5, -0.5,
      -0.5, -0.5,  0.5,
      -0.5,  0.5,  0.5,
      -0.5,  0.5, -0.5,
    ];
    
    const indices = [
      0,  1,  2,      0,  2,  3,    // front
      4,  5,  6,      4,  6,  7,    // back
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // bottom
      16, 17, 18,     16, 18, 19,   // right
      20, 21, 22,     20, 22, 23,   // left
    ];
    
    // Simple normals for each face
    const normals = [
      // Front face
      0.0,  0.0,  1.0,
      0.0,  0.0,  1.0,
      0.0,  0.0,  1.0,
      0.0,  0.0,  1.0,
      
      // Back face
      0.0,  0.0, -1.0,
      0.0,  0.0, -1.0,
      0.0,  0.0, -1.0,
      0.0,  0.0, -1.0,
      
      // Top face
      0.0,  1.0,  0.0,
      0.0,  1.0,  0.0,
      0.0,  1.0,  0.0,
      0.0,  1.0,  0.0,
      
      // Bottom face
      0.0, -1.0,  0.0,
      0.0, -1.0,  0.0,
      0.0, -1.0,  0.0,
      0.0, -1.0,  0.0,
      
      // Right face
      1.0,  0.0,  0.0,
      1.0,  0.0,  0.0,
      1.0,  0.0,  0.0,
      1.0,  0.0,  0.0,
      
      // Left face
     -1.0,  0.0,  0.0,
     -1.0,  0.0,  0.0,
     -1.0,  0.0,  0.0,
     -1.0,  0.0,  0.0
    ];
    
    // Simple texture coordinates
    const textureCoordinates = [
      // Front
      0.0,  1.0,
      1.0,  1.0,
      1.0,  0.0,
      0.0,  0.0,
      // Back
      0.0,  1.0,
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      // Top
      0.0,  1.0,
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      // Bottom
      0.0,  1.0,
      1.0,  1.0,
      1.0,  0.0,
      0.0,  0.0,
      // Right
      0.0,  1.0,
      0.0,  0.0,
      1.0,  0.0,
      1.0,  1.0,
      // Left
      0.0,  1.0,
      1.0,  1.0,
      1.0,  0.0,
      0.0,  0.0
    ];
    
    return {
      position: vertices,
      normal: normals,
      textureCoord: textureCoordinates,
      indices: indices
    };
  }
  
  loadTexture(type) {
    try {
      const texture = this.gl.createTexture();
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      
      // Fill with a placeholder color until the image is loaded
      if (type === 'red') {
        // Red enemy - dark red color
        this.gl.texImage2D(
          this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, 
          this.gl.UNSIGNED_BYTE, new Uint8Array([200, 50, 50, 255])
        );
      } else {
        // Green enemy - dark green color
        this.gl.texImage2D(
          this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, 
          this.gl.UNSIGNED_BYTE, new Uint8Array([50, 200, 50, 255])
        );
      }
      
      // Try to load actual texture from multiple possible locations
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
      
      // Try to load the image from different possible paths
      const possiblePaths = [
        `assets/images/enemy_${type}.png`,
        `../assets/images/enemy_${type}.png`,
        `./assets/images/enemy_${type}.png`,
        `/assets/images/enemy_${type}.png`
      ];
      
      // We'll use an embedded data URL as fallback for reliability
      // Use a colored rectangle as fallback
      const colorData = type === 'red' ? 
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAApklEQVR42mNkGAWjIUCTENizZ0/0////ZzMyMgaTYhYjIyPj379/1Tk5Of6S4gB0y0dUCIyCUTAKRsEoGAWjYBSMglEwamvi5s2b2f/+/bv+9+/f/6TUbkxMTIxsbGwFJSUl9SQHwbFjx04DnVBPTsY2btw4DUhPJTkIyskNgv///2eSGgTEJkGyg2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYEQDAKbtK+u95A+EAAAAAElFTkSuQmCC' :
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAApklEQVR42mNkGAWjIUCTENizZ0/0////ZzMyMgaTYhYjIyPj379/1Tk5Of6S4gB0y0dUCIyCUTAKRsEoGAWjYBSMglEwamvi5s2b2f/+/bv+9+/f/6TUbkxMTIxsbGwFJSUl9SQHwbFjx04DnVBPTsY2btw4DUhPJTkIyskNgv///2eSGgTEJkGyg2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYEQDAKbtK+uZQ4RfAAAAAElFTkSuQmCC';
      
      image.src = type === 'red' ? colorData : colorData;
      
      // Try loading from possible paths
      for (const path of possiblePaths) {
        const tempImg = new Image();
        tempImg.onload = () => {
          // If this path works, use it for the actual texture
          image.src = path;
        };
        tempImg.src = path;
      }
      
      return texture;
    } catch (error) {
      console.error('Error creating texture:', error);
      return null;
    }
  }
  
  isPowerOf2(value) {
    return (value & (value - 1)) === 0;
  }
  
  createBuffers() {
    try {
      // Create buffers for each model
      for (const type in this.soldierModel) {
        const model = this.soldierModel[type];
        const modelData = model.vertices;
        
        // Create and bind position buffer
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(modelData.position), this.gl.STATIC_DRAW);
        
        // Create and bind normal buffer for lighting
        const normalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, normalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(modelData.normal), this.gl.STATIC_DRAW);
        
        // Create and bind texture coordinate buffer
        const textureCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(modelData.textureCoord), this.gl.STATIC_DRAW);
        
        // Create and bind indices buffer
        const indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(modelData.indices), this.gl.STATIC_DRAW);
        
        // Store buffers with the model
        this.soldierModel[type].buffers = {
          position: positionBuffer,
          normal: normalBuffer,
          textureCoord: textureCoordBuffer,
          indices: indexBuffer,
          count: modelData.indices.length,
        };
      }
    } catch (error) {
      console.error('Error creating buffers:', error);
    }
  }
  
  // Create a new enemy instance
  createEnemy(enemyObj) {
    const { type, x, y, id } = enemyObj;
    const modelType = type === 'red' ? 'red' : 'green';
    
    try {
      // Create animation data for this enemy
      this.enemyInstances[id] = {
        type: modelType,
        position: { x, y, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 0.5,
        animationFrame: 0,
        animationSpeed: 0.15,
        health: enemyObj.health,
        maxHealth: enemyObj.health,
        state: 'walking', // walking, hit, dying, dead
        stateTimer: 0,
        effects: {
          frozen: {
            active: false,
            strength: 0,
            timer: 0
          },
          fire: {
            active: false,
            strength: 0,
            timer: 0
          }
        }
      };
    } catch (error) {
      console.error('Error creating enemy:', error);
    }
    
    return id;
  }
  
  // Rest of the implementation with no significant changes
  // ...

  // Update enemy position
  updateEnemyPosition(id, x, y) {
    if (!this.enemyInstances[id]) return;
    
    // Store the exact game coordinates
    this.enemyInstances[id].position.x = x;
    this.enemyInstances[id].position.y = y;
    
    // Update animation frame for walking
    if (this.enemyInstances[id].state === 'walking') {
      this.enemyInstances[id].animationFrame += this.enemyInstances[id].animationSpeed;
      
      // Calculate direction of movement
      if (this.enemyInstances[id].lastPosition) {
        const dx = x - this.enemyInstances[id].lastPosition.x;
        const dy = y - this.enemyInstances[id].lastPosition.y;
        
        // Only update rotation if there's significant movement
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          this.enemyInstances[id].rotation = {
            x: 0,
            y: Math.atan2(dx, dy),
            z: 0
          };
        }
      }
    }
    
    // Store last position for movement direction calculation
    this.enemyInstances[id].lastPosition = { x, y };
  }
  
  // Apply hit effect to enemy
  hitEnemy(id, damage, towerType) {
    if (!this.enemyInstances[id]) return;
    
    const enemy = this.enemyInstances[id];
    
    // Update health
    enemy.health -= damage;
    
    // Apply hit state
    enemy.state = 'hit';
    enemy.stateTimer = 5; // frames in hit state
    
    // Apply effects based on tower type
    if (towerType === 'red') { // Fire tower
      enemy.effects.fire.active = true;
      enemy.effects.fire.strength = 1.0;
      enemy.effects.fire.timer = 20; // Duration of fire effect in frames
      
      // Remove frozen effect if hit by fire
      enemy.effects.frozen.active = false;
      enemy.effects.frozen.strength = 0;
      enemy.effects.frozen.timer = 0;
    } 
    else if (towerType === 'blue') { // Ice tower
      enemy.effects.frozen.active = true;
      enemy.effects.frozen.strength = 1.0;
      enemy.effects.frozen.timer = 20; // Duration of frozen effect in frames
      
      // Remove fire effect if hit by ice
      enemy.effects.fire.active = false;
      enemy.effects.fire.strength = 0;
      enemy.effects.fire.timer = 0;
    }
    
    // Check if enemy is dead
    if (enemy.health <= 0) {
      enemy.state = 'dying';
      enemy.stateTimer = 15; // dying animation frames
    }
  }
  
  // Remove enemy
  removeEnemy(id) {
    delete this.enemyInstances[id];
  }
  
  // Main animation loop
  animate(timestamp) {
    if (!this.lastFrame) {
      this.lastFrame = timestamp;
    }
    const deltaTime = timestamp - this.lastFrame;
    this.lastFrame = timestamp;
    
    this.updateAnimations(deltaTime);
    this.render();
    
    requestAnimationFrame((ts) => this.animate(ts));
  }
  
  updateAnimations(deltaTime) {
    // Process all enemy animations and states
    for (const id in this.enemyInstances) {
      const enemy = this.enemyInstances[id];
      
      // Update state timer
      if (enemy.stateTimer > 0) {
        enemy.stateTimer--;
        if (enemy.stateTimer === 0) {
          // State transition based on current state
          if (enemy.state === 'hit') {
            enemy.state = 'walking';
          } else if (enemy.state === 'dying') {
            enemy.state = 'dead';
          }
        }
      }
      
      // Update effects
      if (enemy.effects.frozen.active) {
        enemy.effects.frozen.timer--;
        if (enemy.effects.frozen.timer <= 0) {
          enemy.effects.frozen.active = false;
          enemy.effects.frozen.strength = 0;
        } else {
          // Fade out effect as timer decreases
          enemy.effects.frozen.strength = enemy.effects.frozen.timer / 20;
        }
      }
      
      if (enemy.effects.fire.active) {
        enemy.effects.fire.timer--;
        if (enemy.effects.fire.timer <= 0) {
          enemy.effects.fire.active = false;
          enemy.effects.fire.strength = 0;
        } else {
          // Fade out effect as timer decreases
          enemy.effects.fire.strength = enemy.effects.fire.timer / 20;
        }
      }
      
      // Remove dead enemies after animation
      if (enemy.state === 'dead') {
        // Add simple fade out for dead enemies
        enemy.fadeOut = (enemy.fadeOut || 1.0) - 0.05;
        if (enemy.fadeOut <= 0) {
          delete this.enemyInstances[id];
        }
      }
    }
  }
  
  render() {
    if (!this.gl) {
      this.renderFallback();
      return;
    }
    
    try {
      // Clear the canvas
      this.gl.clearColor(0.0, 0.0, 0.0, 0.0); // Transparent background
      this.gl.clearDepth(1.0);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.depthFunc(this.gl.LEQUAL);
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
      
      // Create perspective matrix
      const fieldOfView = 45 * Math.PI / 180;
      const aspect = this.canvas.width / this.canvas.height;
      const zNear = 0.1;
      const zFar = 100.0;
      const projectionMatrix = mat4.create();
      
      mat4.perspective(
        projectionMatrix,
        fieldOfView,
        aspect,
        zNear,
        zFar
      );
      
      // Render each enemy
      for (const id in this.enemyInstances) {
        this.renderEnemy(id, projectionMatrix);
      }
    } catch (error) {
      console.error('Error rendering WebGL scene:', error);
    }
  }
  
  renderEnemy(id, projectionMatrix) {
    try {
      const enemy = this.enemyInstances[id];
      const model = this.soldierModel[enemy.type];
      
      if (!model) return;
      
      // Set up model-view matrix
      const modelViewMatrix = mat4.create();
      
      // Position the model based on enemy data
      // Convert from game coordinates to WebGL space
      const gameAreaRect = this.gameArea.getBoundingClientRect();
      const x = (enemy.position.x / gameAreaRect.width) * 2 - 1;
      const y = -((enemy.position.y / gameAreaRect.height) * 2 - 1);
      
      mat4.translate(
        modelViewMatrix,
        modelViewMatrix,
        [x, y, -6.0] // Position in 3D space (z controls distance from camera)
      );
      
      // Apply rotation (facing direction of movement)
      mat4.rotateY(
        modelViewMatrix,
        modelViewMatrix,
        enemy.rotation.y
      );
      
      // Apply animation based on state
      let animationOffset = 0;
      
      if (enemy.state === 'walking') {
        // Walking animation - bob up and down slightly
        animationOffset = Math.sin(enemy.animationFrame) * 0.1;
        
        // If frozen, slow down animation
        if (enemy.effects.frozen.active) {
          animationOffset *= 0.3;
        }
      } else if (enemy.state === 'hit') {
        // Hit animation - slight recoil
        animationOffset = -(enemy.stateTimer / 5) * 0.2;
      } else if (enemy.state === 'dying') {
        // Dying animation - fall down
        return;
        const deathProgress = 1 - (enemy.stateTimer / 15);
        animationOffset = -deathProgress * 0.5;
        mat4.rotateX(
          modelViewMatrix,
          modelViewMatrix,
          deathProgress * Math.PI / 2 // Rotate to fall forward
        );
      } else if (enemy.state === 'dead') {
        return;
        // Dead state - lying on ground
        animationOffset = -0.5;
        mat4.rotateX(
          modelViewMatrix,
          modelViewMatrix,
          Math.PI / 2
        );
      }
      
      // Apply animation offset
      mat4.translate(
        modelViewMatrix,
        modelViewMatrix,
        [0, animationOffset, 0]
      );
      
      // Scale based on enemy type
      const scale = enemy.scale * (enemy.type === 'green' ? 1.2 : 1.0);
      mat4.scale(modelViewMatrix, modelViewMatrix, [scale, scale, scale]);
      
      // Calculate normal matrix for lighting
      const normalMatrix = mat4.create();
      mat4.invert(normalMatrix, modelViewMatrix);
      mat4.transpose(normalMatrix, normalMatrix);
      
      // Render the model
      this.gl.useProgram(this.programInfo.program);
      
      // Set shader uniforms
      this.gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix
      );
      this.gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix
      );
      this.gl.uniformMatrix4fv(
        this.programInfo.uniformLocations.normalMatrix,
        false,
        normalMatrix
      );
      
      // Set up effect parameters
      let effectType = 0; // No effect
      let effectStrength = 0;
      
      if (enemy.effects.frozen.active) {
        effectType = 1; // Frozen
        effectStrength = enemy.effects.frozen.strength;
      } else if (enemy.effects.fire.active) {
        effectType = 2; // Fire
        effectStrength = enemy.effects.fire.strength;
      }
      
      this.gl.uniform1i(this.programInfo.uniformLocations.uEffectType, effectType);
      this.gl.uniform1f(this.programInfo.uniformLocations.uEffectStrength, effectStrength);
      
      // Set color based on health percentage and type
      const healthPercent = enemy.health / enemy.maxHealth;
      let baseColor;
      
      if (enemy.type === 'red') {
        baseColor = [1.0, 0.5, 0.5, enemy.fadeOut || 1.0];
      } else {
        baseColor = [0.5, 1.0, 0.5, enemy.fadeOut || 1.0];
      }
      
      // Darken as health decreases
      const color = [
        baseColor[0] * (0.7 + 0.3 * healthPercent),
        baseColor[1] * (0.7 + 0.3 * healthPercent),
        baseColor[2] * (0.7 + 0.3 * healthPercent),
        baseColor[3]
      ];
      
      this.gl.uniform4fv(this.programInfo.uniformLocations.uColor, color);
      
      // Set up buffers
      const buffers = model.buffers;
      
      // Position buffer
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.position);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexPosition,
        3, // 3 components per vertex
        this.gl.FLOAT,
        false,
        0,
        0
      );
      this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
      
      // Normal buffer
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.normal);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.vertexNormal,
        3,
        this.gl.FLOAT,
        false,
        0,
        0
      );
      this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);
      
      // Texture coordinates buffer
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers.textureCoord);
      this.gl.vertexAttribPointer(
        this.programInfo.attribLocations.textureCoord,
        2,
        this.gl.FLOAT,
        false,
        0,
        0
      );
      this.gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
      
      // Bind texture
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, model.texture);
      this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, 0);
      
      // Bind index buffer and draw
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
      this.gl.drawElements(
        this.gl.TRIANGLES,
        buffers.count,
        this.gl.UNSIGNED_SHORT,
        0
      );
    } catch (error) {
      console.error('Error rendering enemy:', error);
    }
  }
  
  renderFallback() {
    // Fallback rendering using Canvas 2D if WebGL is not available
    if (!this.ctx) return;
    
    try {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      for (const id in this.enemyInstances) {
        const enemy = this.enemyInstances[id];
        if (enemy.state == 'dying' || enemy.state == 'dead') continue;
        this.ctx.save();
        this.ctx.translate(enemy.position.x, enemy.position.y);
        
        // Apply rotation
        this.ctx.rotate(enemy.rotation.y);
        
        // Apply scaling
        const scale = enemy.scale * (enemy.type === 'green' ? 1.2 : 1.0);
        this.ctx.scale(scale, scale);
        
        // Draw soldier based on type
        if (enemy.type === 'red') {
          this.ctx.fillStyle = 'rgba(255, 100, 100, ' + (enemy.fadeOut || 1.0) + ')';
        } else {
          this.ctx.fillStyle = 'rgba(100, 255, 100, ' + (enemy.fadeOut || 1.0) + ')';
        }
        
        // Draw a simple soldier shape
        // Head
        this.ctx.beginPath();
        this.ctx.arc(0, -10, 5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Body
        this.ctx.fillRect(-5, -5, 10, 15);
        
        // Arms
        this.ctx.fillRect(-10, -5, 5, 10);
        this.ctx.fillRect(5, -5, 5, 10);
        
        // Legs
        this.ctx.fillRect(-5, 10, 3, 10);
        this.ctx.fillRect(2, 10, 3, 10);
        
        // Apply effects
        if (enemy.effects.frozen.active) {
          this.ctx.fillStyle = 'rgba(150, 200, 255, ' + enemy.effects.frozen.strength * 0.7 + ')';
          this.ctx.fillRect(-15, -15, 30, 35);
        } else if (enemy.effects.fire.active) {
          this.ctx.fillStyle = 'rgba(255, 150, 50, ' + enemy.effects.fire.strength * 0.7 + ')';
          this.ctx.fillRect(-15, -15, 30, 35);
        }
        
        this.ctx.restore();
      }
    } catch (error) {
      console.error('Error in fallback rendering:', error);
    }
  }
}