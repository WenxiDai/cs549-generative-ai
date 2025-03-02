// js/responsive-utils.js
(function() {
    // Global game scale factors
    window.gameScaling = {
      defaultCellSize: 40, // Desktop cell size
      currentCellSize: 40, // Will be updated based on viewport
      scaleFactor: 1       // Ratio of current/default
    };
    
    // Function to update scaling based on viewport
    window.updateGameScaling = function() {
      const isMobile = window.innerWidth <= 600;
      const newCellSize = isMobile ? 32 : 40;
      
      window.gameScaling.currentCellSize = newCellSize;
      window.gameScaling.scaleFactor = newCellSize / window.gameScaling.defaultCellSize;
      
      return window.gameScaling;
    };
    
    // Helper to convert positions between different scales
    window.scalePosition = function(x, y) {
      const factor = window.gameScaling.scaleFactor;
      return {
        x: x * factor,
        y: y * factor
      };
    };
    
    // Initialize on load
    window.updateGameScaling();
    
    // Update on resize
    window.addEventListener('resize', function() {
      const oldScaleFactor = window.gameScaling.scaleFactor;
      const scaling = window.updateGameScaling();
      
      // Only trigger game adjustments if scale factor actually changed
      if (oldScaleFactor !== scaling.scaleFactor && window.game && window.game.logic) {
        // Recalculate enemy positions
        if (Array.isArray(window.game.logic.enemies)) {
          window.game.logic.enemies.forEach(enemy => {
            if (enemy) {
              // Update positions based on path index
              const pathPosition = window.game.logic.randomPath[enemy.pathIndex] || window.game.logic.randomPath[0];
              if (pathPosition) {
                const cellCenter = window.game.logic.getCellCenter(pathPosition.r, pathPosition.c);
                enemy.x = cellCenter.x;
                enemy.y = cellCenter.y;
                
                // Update DOM element
                if (enemy.element) {
                  enemy.element.style.left = enemy.x + "px";
                  enemy.element.style.top = enemy.y + "px";
                }
              }
            }
          });
        }
        
        // Trigger WebGL updates if renderer exists
        if (window.enemyRendererInstance) {
          window.enemyRendererInstance.resizeCanvas();
        }
      }
    });
  })();