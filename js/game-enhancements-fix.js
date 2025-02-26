// Improved Game Enhancements with better cleanup and reset support
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main game code to load and initialize
    setTimeout(initGameEnhancements, 500);
  });
  
  // Store a reference to the enemy renderer globally
  window.enemyRendererInstance = null;
  
  function initGameEnhancements() {
    // Check if game object exists
    if (typeof window.game === 'undefined') {
      console.warn('Game object not found, trying again in 500ms');
      setTimeout(initGameEnhancements, 500);
      return;
    }
  
    // Check if game is already initialized with enhanced renderer
    if (window.enemyRendererInstance) {
      console.log('Game enhancements already initialized');
      return;
    }
  
    // Get game area
    const gameArea = document.getElementById('gameArea');
    if (!gameArea) {
      console.error('Game area element not found');
      return;
    }
  
    // Initialize WebGL renderer
    window.enemyRendererInstance = new EnemyRenderer(gameArea);
    
    // Store original enemy-related methods to extend them
    const originalSpawnEnemy = window.game.logic.spawnEnemy;
    const originalUpdateEnemies = window.game.logic.updateEnemies;
    const originalHitEnemy = window.game.logic.checkTowersShootEnemies;
    const originalResetGame = window.game.logic.resetGame;
    
    // Counter for unique enemy IDs
    let enemyIdCounter = 0;
    
    // Override spawnEnemy method to create WebGL enemies
    window.game.logic.spawnEnemy = function(type = "red", extraHP = 0) {
      // Call original method to create the enemy object
      originalSpawnEnemy.call(this, type, extraHP);
      
      // Get the enemy that was just created (last in the array)
      const enemy = this.enemies[this.enemies.length - 1];
      if (!enemy) return;
      
      // Generate a unique ID for this enemy
      const id = `enemy_${enemyIdCounter++}`;
      enemy.id = id;
      
      // Create WebGL representation if renderer exists
      if (window.enemyRendererInstance) {
        window.enemyRendererInstance.createEnemy({
          id: id,
          type: type,
          x: enemy.x,
          y: enemy.y,
          health: enemy.health
        });
        
        // Hide the original DOM element
        if (enemy.element) {
          enemy.element.style.opacity = 0;
          
          // Keep a small hitbox for click interactions if needed
          enemy.element.style.width = '4px';
          enemy.element.style.height = '4px';
        }
      }
    };
    
    // Override updateEnemies method to update WebGL enemy positions
    window.game.logic.updateEnemies = function() {
      // Store the enemies before update
      const beforeUpdate = [...this.enemies];
      
      // Call original method to update enemies
      originalUpdateEnemies.call(this);
      
      // Update WebGL enemy positions if renderer exists
      if (window.enemyRendererInstance) {
        beforeUpdate.forEach((enemy, i) => {
          if (!enemy || !enemy.id) return;
          
          // Check if enemy still exists after update
          const stillExists = this.enemies.some(e => e && e.id === enemy.id);
          
          if (stillExists) {
            // Update position in WebGL renderer
            window.enemyRendererInstance.updateEnemyPosition(enemy.id, enemy.x, enemy.y);
            
            // Update effects
            if (enemy.isFrozen && !enemy.prevFrozen) {
              // Just became frozen
              window.enemyRendererInstance.hitEnemy(enemy.id, 0, 'blue');
              enemy.prevFrozen = true;
            } else if (!enemy.isFrozen && enemy.prevFrozen) {
              // Just unfrozen
              enemy.prevFrozen = false;
            }
            
            if (enemy.isOnFire && !enemy.prevOnFire) {
              // Just caught fire
              window.enemyRendererInstance.hitEnemy(enemy.id, 0, 'red');
              enemy.prevOnFire = true;
            } else if (!enemy.isOnFire && enemy.prevOnFire) {
              // Fire just went out
              enemy.prevOnFire = false;
            }
          } else {
            // Enemy was removed, also remove from WebGL renderer
            window.enemyRendererInstance.removeEnemy(enemy.id);
          }
        });
      }
    };
    
    // Override tower shooting to add visual effects for hits
    window.game.logic.checkTowersShootEnemies = function() {
      // Store enemy health before shooting
      const healthBefore = {};
      this.enemies.forEach(enemy => {
        if (enemy && enemy.id) {
          healthBefore[enemy.id] = enemy.health;
        }
      });
      
      // Call original method to process shooting
      originalHitEnemy.call(this);
      
      // Check for damage and apply hit effects if renderer exists
      if (window.enemyRendererInstance) {
        this.enemies.forEach(enemy => {
          if (enemy && enemy.id && healthBefore[enemy.id]) {
            const damageTaken = healthBefore[enemy.id] - enemy.health;
            if (damageTaken > 0) {
              // Determine which tower type hit this enemy based on effects
              let towerType = 'green'; // Default to green (basic attack)
              
              if (enemy.isFrozen && !enemy.prevFrozen) {
                towerType = 'blue';
              } else if (enemy.isOnFire && !enemy.prevOnFire) {
                towerType = 'red';
              }
              
              // Apply hit effect in WebGL renderer
              window.enemyRendererInstance.hitEnemy(enemy.id, damageTaken, towerType);
            }
          }
        });
      }
    };
    
    // Override reset game to clean up WebGL resources
    window.game.logic.resetGame = function() {
      // First call original reset game method
      originalResetGame.call(this);
      
      // Clean up WebGL resources
      if (window.cleanupWebGLResources) {
        window.cleanupWebGLResources();
      }
      
      // Reset the enemy renderer
      if (window.enemyRendererInstance) {
        // If dispose method exists, call it
        if (typeof window.enemyRendererInstance.dispose === 'function') {
          window.enemyRendererInstance.dispose();
        }
        
        // Remove reference to old renderer
        window.enemyRendererInstance = null;
      }
      
      // Create a new renderer instance
      const gameArea = document.getElementById('gameArea');
      if (gameArea) {
        window.enemyRendererInstance = new EnemyRenderer(gameArea);
      }
      
      // Reset enemy ID counter
      enemyIdCounter = 0;
      
      console.log('Game enhancements reset complete');
    };
  
    console.log('Game enhancements loaded - WebGL enemy renderer active');
  }