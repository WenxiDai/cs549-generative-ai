// Game Enhancements - WebGL Enemy Renderer Integration
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main game code to load and initialize
    setTimeout(initGameEnhancements, 500);
  });
  
  function initGameEnhancements() {
    // Check if game object exists
    if (typeof window.game === 'undefined') {
      console.warn('Game object not found, trying again in 500ms');
      setTimeout(initGameEnhancements, 500);
      return;
    }
  
    // Get game area
    const gameArea = document.getElementById('gameArea');
    if (!gameArea) {
      console.error('Game area element not found');
      return;
    }
  
    // Initialize WebGL renderer
    const enemyRenderer = new EnemyRenderer(gameArea);
    
    // Store original enemy-related methods to extend them
    const originalSpawnEnemy = window.game.logic.spawnEnemy;
    const originalUpdateEnemies = window.game.logic.updateEnemies;
    const originalHitEnemy = window.game.logic.checkTowersShootEnemies;
    
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
      
      // Create WebGL representation
      enemyRenderer.createEnemy({
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
    };
    
    // Override updateEnemies method to update WebGL enemy positions
    window.game.logic.updateEnemies = function() {
      // Store the enemies before update
      const beforeUpdate = [...this.enemies];
      
      // Call original method to update enemies
      originalUpdateEnemies.call(this);
      
      // Update WebGL enemy positions
      beforeUpdate.forEach((enemy, i) => {
        if (!enemy || !enemy.id) return;
        
        // Check if enemy still exists after update
        const stillExists = this.enemies.some(e => e && e.id === enemy.id);
        
        if (stillExists) {
          // Update position in WebGL renderer
          enemyRenderer.updateEnemyPosition(enemy.id, enemy.x, enemy.y);
          
          // Update effects
          if (enemy.isFrozen && !enemy.prevFrozen) {
            // Just became frozen
            enemyRenderer.hitEnemy(enemy.id, 0, 'blue');
            enemy.prevFrozen = true;
          } else if (!enemy.isFrozen && enemy.prevFrozen) {
            // Just unfrozen
            enemy.prevFrozen = false;
          }
          
          if (enemy.isOnFire && !enemy.prevOnFire) {
            // Just caught fire
            enemyRenderer.hitEnemy(enemy.id, 0, 'red');
            enemy.prevOnFire = true;
          } else if (!enemy.isOnFire && enemy.prevOnFire) {
            // Fire just went out
            enemy.prevOnFire = false;
          }
        } else {
          // Enemy was removed, also remove from WebGL renderer
          enemyRenderer.removeEnemy(enemy.id);
        }
      });
    };
    
    // Override tower shooting to add visual effects for hits
    const originalCheckTowersShootEnemies = window.game.logic.checkTowersShootEnemies;
    window.game.logic.checkTowersShootEnemies = function() {
      // Store enemy health before shooting
      const healthBefore = {};
      this.enemies.forEach(enemy => {
        if (enemy && enemy.id) {
          healthBefore[enemy.id] = enemy.health;
        }
      });
      
      // Call original method to process shooting
      originalCheckTowersShootEnemies.call(this);
      
      // Check for damage and apply hit effects
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
            enemyRenderer.hitEnemy(enemy.id, damageTaken, towerType);
          }
        }
      });
    };
    
    // Add hit effects for fire and freeze damage over time
    const originalSpreadFireDamage = window.game.logic.spreadFireDamage;
    if (originalSpreadFireDamage) {
      window.game.logic.spreadFireDamage = function(fireEnemy) {
        // Store enemy health before damage
        const healthBefore = {};
        this.enemies.forEach(enemy => {
          if (enemy && enemy.id) {
            healthBefore[enemy.id] = enemy.health;
          }
        });
        
        // Call original method
        originalSpreadFireDamage.call(this, fireEnemy);
        
        // Check for damage and apply hit effects
        this.enemies.forEach(enemy => {
          if (enemy && enemy.id && healthBefore[enemy.id]) {
            const damageTaken = healthBefore[enemy.id] - enemy.health;
            if (damageTaken > 0) {
              // Fire damage
              enemyRenderer.hitEnemy(enemy.id, damageTaken, 'red');
            }
          }
        });
      };
    }
    
    // Add death animations - extend the enemy removal logic
    const originalRemoveEnemy = function(i) {
      const enemy = window.game.logic.enemies[i];
      if (enemy && enemy.id) {
        // Instead of immediately removing, play death animation first
        enemyRenderer.hitEnemy(enemy.id, enemy.health, null);
        
        // Schedule actual removal after animation completes
        setTimeout(() => {
          enemyRenderer.removeEnemy(enemy.id);
          window.game.logic.enemies[i] = null;
        }, 500);
        
        // Return reward immediately for better game feel
        return enemy.reward;
      }
      return 0;
    };
    
    // Improve projectile visuals
    const originalCreateProjectile = window.game.logic.createProjectile;
    window.game.logic.createProjectile = function(startPos, endPos, color) {
      // Call original method
      originalCreateProjectile.call(this, startPos, endPos, color);
      
      // Create enhanced projectile with effects
      const projectile = document.createElement("div");
      projectile.style.position = "absolute";
      projectile.style.width = "10px";
      projectile.style.height = "10px";
      projectile.style.zIndex = "10";
      
      // Apply color styling
      if (color === 'red') {
        projectile.style.background = "radial-gradient(circle at 30% 30%, #ff4444, #cc0000)";
        projectile.style.boxShadow = "0 0 10px rgba(255,0,0,0.8)";
      } else if (color === 'blue') {
        projectile.style.background = "radial-gradient(circle at 30% 30%, #44aaff, #0066cc)";
        projectile.style.boxShadow = "0 0 10px rgba(0,100,255,0.8)";
      } else if (color === 'green') {
        projectile.style.background = "radial-gradient(circle at 30% 30%, #44ff44, #00cc00)";
        projectile.style.boxShadow = "0 0 10px rgba(0,255,0,0.8)";
      }
      
      // Add trailing effect
      projectile.style.borderRadius = "50%";
      projectile.style.transform = "translate(-50%, -50%)"; // Center the projectile
      projectile.style.transition = "left 0.4s ease-out, top 0.4s ease-out";
      
      // Add particle trail
      projectile.dataset.color = color;
      projectile.dataset.startTime = Date.now();
      
      // Position projectile
      projectile.style.left = startPos.x + "px";
      projectile.style.top = startPos.y + "px";
      this.ui.gameArea.appendChild(projectile);
      
      // Move projectile
      setTimeout(() => {
        projectile.style.left = endPos.x + "px";
        projectile.style.top = endPos.y + "px";
      }, 10);
      
      // Remove projectile after animation
      setTimeout(() => {
        // Create hit effect at impact
        createImpactEffect(endPos.x, endPos.y, color, this.ui.gameArea);
        projectile.remove();
      }, 410);
    };
    
    // Create impact effect when projectile hits
    function createImpactEffect(x, y, color, parent) {
      const impact = document.createElement("div");
      impact.style.position = "absolute";
      impact.style.left = x + "px";
      impact.style.top = y + "px";
      impact.style.width = "20px";
      impact.style.height = "20px";
      impact.style.borderRadius = "50%";
      impact.style.transform = "translate(-50%, -50%)";
      impact.style.zIndex = "8";
      
      // Apply color styling
      if (color === 'red') {
        impact.style.background = "radial-gradient(circle, rgba(255,100,100,0.8) 0%, rgba(255,0,0,0) 70%)";
        impact.style.boxShadow = "0 0 15px rgba(255,0,0,0.6)";
      } else if (color === 'blue') {
        impact.style.background = "radial-gradient(circle, rgba(100,150,255,0.8) 0%, rgba(0,100,255,0) 70%)";
        impact.style.boxShadow = "0 0 15px rgba(0,100,255,0.6)";
      } else if (color === 'green') {
        impact.style.background = "radial-gradient(circle, rgba(100,255,100,0.8) 0%, rgba(0,255,0,0) 70%)";
        impact.style.boxShadow = "0 0 15px rgba(0,255,0,0.6)";
      }
      
      // Animate impact
      impact.style.animation = "impact 0.5s ease-out forwards";
      
      // Add animation keyframes if not already added
      if (!document.getElementById('impact-animation')) {
        const style = document.createElement('style');
        style.id = 'impact-animation';
        style.textContent = `
          @keyframes impact {
            0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      parent.appendChild(impact);
      
      // Remove impact effect after animation
      setTimeout(() => {
        impact.remove();
      }, 500);
    }
    
    console.log('Game enhancements loaded - WebGL enemy renderer active');
  }