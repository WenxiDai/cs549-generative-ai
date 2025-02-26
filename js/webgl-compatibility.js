// WebGL Compatibility Helper
// Add this script before loading other WebGL-dependent scripts

(function() {
    // Check if WebGL is supported
    function checkWebGLSupport() {
      const canvas = document.createElement('canvas');
      let gl;
      
      try {
        // Try to get WebGL context
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      } catch (e) {
        console.warn('WebGL detection failed with error:', e);
        return false;
      }
      
      // Check if WebGL context was obtained
      if (!gl) {
        console.warn('WebGL not supported by this browser');
        return false;
      }
      
      return true;
    }
    
    // Set global flag for WebGL support
    window.WEBGL_SUPPORTED = checkWebGLSupport();
    
    // Check screen size and device capabilities
    function detectDeviceCapabilities() {
      const capabilities = {
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        isLowPowerDevice: false
      };
      
      // Try to detect low power devices (older/budget phones, etc.)
      // This is a rough heuristic and might need adjustment
      if (capabilities.isMobile) {
        // Check for low memory devices 
        if (navigator.deviceMemory && navigator.deviceMemory < 4) {
          capabilities.isLowPowerDevice = true;
        }
        
        // Check for low CPU cores 
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
          capabilities.isLowPowerDevice = true;
        }
        
        // Check for low screen resolution
        if (capabilities.screenWidth * capabilities.screenHeight < 360000) { // less than 600x600
          capabilities.isLowPowerDevice = true;
        }
      }
      
      // Set global device capability information
      window.DEVICE_CAPABILITIES = capabilities;
      
      return capabilities;
    }
    
    // Set up automatic handling for different devices and fallbacks
    function setupCompatibility() {
      const capabilities = detectDeviceCapabilities();
      
      // Create a global configuration object
      window.GRAPHICS_CONFIG = {
        useWebGL: window.WEBGL_SUPPORTED && !capabilities.isLowPowerDevice,
        useSimplifiedModels: capabilities.isLowPowerDevice || !window.WEBGL_SUPPORTED,
        maxParticles: capabilities.isLowPowerDevice ? 20 : 100,
        enableShadows: !capabilities.isLowPowerDevice && window.WEBGL_SUPPORTED,
        textureQuality: capabilities.isLowPowerDevice ? 'low' : 'high'
      };
      
      // Add CSS class to body based on device type for responsive styling
      document.body.classList.add(capabilities.isMobile ? 'mobile-device' : 'desktop-device');
      if (capabilities.isLowPowerDevice) {
        document.body.classList.add('low-power-device');
      }
      
      // Log configuration for debugging
      console.log('Device capabilities:', capabilities);
      console.log('Graphics configuration:', window.GRAPHICS_CONFIG);
      
      // Fix texture handling for different device scaling
      fixTextureScaling();
    }
    
    // Handle texture scaling issues on high DPI screens
    function fixTextureScaling() {
      // Add a global texture loader that handles device scaling correctly
      window.loadTexture = function(url, callback) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = function() {
          // Create a properly scaled texture based on device capabilities
          const pixelRatio = window.DEVICE_CAPABILITIES.pixelRatio || 1;
          
          // Use canvas to handle scaling if needed
          if (pixelRatio > 1 && window.GRAPHICS_CONFIG.textureQuality === 'high') {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Scale up for high DPI displays
            canvas.width = img.width * pixelRatio;
            canvas.height = img.height * pixelRatio;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            if (callback) {
              callback(canvas);
            }
          } else {
            // Use original image directly
            if (callback) {
              callback(img);
            }
          }
        };
        
        img.onerror = function(e) {
          console.warn('Failed to load texture:', url, e);
          
          // Create a colored placeholder for the texture
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.width = 64;
          canvas.height = 64;
          
          // Create a simple gradient as placeholder
          const gradient = ctx.createLinearGradient(0, 0, 64, 64);
          gradient.addColorStop(0, '#ff0000');
          gradient.addColorStop(1, '#550000');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 64, 64);
          
          if (callback) {
            callback(canvas);
          }
        };
        
        img.src = url;
      };
    }
    
    // Initialize compatibility setup
    setupCompatibility();
  })();