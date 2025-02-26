// WebGL Reset Utility
// This file provides utility functions to properly clean up WebGL resources

// Global registry of WebGL resources to clean up
window.webGLResources = {
  canvases: [],
  renderers: [],
  textures: []
};

// Function to properly dispose of WebGL resources
function cleanupWebGLResources() {
  // Remove all WebGL canvases
  window.webGLResources.canvases.forEach(canvas => {
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  });
  
  // Call dispose on any renderer instances
  window.webGLResources.renderers.forEach(renderer => {
    if (renderer && typeof renderer.dispose === 'function') {
      renderer.dispose();
    }
  });
  
  // Clear the registry after cleanup
  window.webGLResources.canvases = [];
  window.webGLResources.renderers = [];
  window.webGLResources.textures = [];
  
  console.log('WebGL resources cleaned up successfully');
}

// Register this as a global function
window.cleanupWebGLResources = cleanupWebGLResources;

// Initialize texture cache for better performance
window.textureCache = {};