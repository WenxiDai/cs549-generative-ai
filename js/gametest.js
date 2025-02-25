document.addEventListener('DOMContentLoaded', () => {
  // Preload background images
  const preloadImages = ['../assets/images/splash_screen_mobile.webp', '../assets/images/splash_screen_tablet.webp'];
  preloadImages.forEach(src => {
    const img = new Image();
    img.src = src;
  });

  // Force background image refresh on orientation change 
  window.addEventListener('orientationchange', function() {
    setTimeout(function() {
      const currentBg = document.body.style.backgroundImage;
      document.body.style.backgroundImage = 'none';
      setTimeout(function() {
        document.body.style.backgroundImage = currentBg;
      }, 50);
    }, 100);
  });

  class GameUI {
    constructor() {
      // UI screens
      this.startMenuScreen = document.getElementById('start-menu-screen');
      this.settingsScreen = document.getElementById('settings-screen');
      this.instructionsScreen = document.getElementById('instructions-screen');
      this.gameContainer = document.getElementById('game-screen');
      this.gameOverScreen = document.getElementById('game-over-screen');
      this.gameControls = document.getElementById('game-controls');
      this.hud = document.getElementById('hud');
      
      // Game UI elements
      this.healthDisplay = document.getElementById("healthDisplay");
      this.moneyDisplay = document.getElementById("moneyDisplay");
      this.waveDisplay = document.getElementById("waveDisplay");
      this.gameArea = document.getElementById("gameArea");
      this.gridContainer = document.getElementById("gridContainer");
      this.tutorialOverlay = document.getElementById("tutorialOverlay");
      this.startGameBtn = document.getElementById("startGameBtn");
      this.colorPickerOverlay = document.getElementById("colorPickerOverlay");
      this.redButton = document.querySelector(".red-btn");
      this.blueButton = document.querySelector(".blue-btn");
      this.greenButton = document.querySelector(".green-btn");

      // Add mobile detection
      this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 600;
      
      // Add viewport size tracking
      this.viewportWidth = window.innerWidth;
      this.viewportHeight = window.innerHeight;
      
      // Track touch state
      this.touchStartX = 0;
      this.touchStartY = 0;
      this.isLongTouch = false;
      this.longTouchTimer = null;
      
      // Listen for resize events to update the UI
      window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    // Add this method to directly set the background image
    setGameOverBackground(isMobile) {
      const gameOverScreen = document.getElementById('game-over-screen');
      
      // Apply the image directly to the element's style
      if (isMobile) {
        gameOverScreen.style.backgroundImage = "url('../assets/images/lose_splash_mobile.webp')";
      } else {
        gameOverScreen.style.backgroundImage = "url('../assets/images/lose_splash_tablet.webp')";
      }
      
      // Make sure the background covers the entire screen
      gameOverScreen.style.backgroundSize = "cover";
      gameOverScreen.style.backgroundPosition = "center center";
    }

    // UI display updates
    updateHealthDisplay(health) {
      this.healthDisplay.textContent = health;
    }
    
    updateMoneyDisplay(money) {
      this.moneyDisplay.textContent = money;
    }
    
    updateWaveDisplay(wave) {
      this.waveDisplay.textContent = wave;
    }
    
    // Tower placement UI
    showColorPicker(cell) {
      this.selectedCell = cell;
      this.colorPickerOverlay.style.display = "flex";
    }
    
    hideColorPicker() {
      this.colorPickerOverlay.style.display = "none";
      this.selectedCell = null;
    }
    
    // Wave message overlay
    showWaveMessage(text) {
      const waveMessage = document.getElementById("waveMessage");
      waveMessage.textContent = text;
      waveMessage.style.display = "block";
    }
    
    hideWaveMessage() {
      const waveMessage = document.getElementById("waveMessage");
      waveMessage.style.display = "none";
    }
    
    // Screen transitions
    swapToScreen(screen) {
      this.startMenuScreen.classList.remove('active');
      this.settingsScreen.classList.remove('active');
      this.instructionsScreen.classList.remove('active');
      this.gameContainer.classList.remove('active');
      this.gameOverScreen.classList.remove('active');
      screen.classList.add('active');			
      
      if (screen.id === 'game-screen') {
        this.hud.style.display = 'block';
        this.gameControls.style.display = 'block';
      } else {
        this.hud.style.display = 'none';
        this.gameControls.style.display = 'none';
      }
    }
    
    startGame() {
      const startGameSound = document.getElementById('start-game-sound');
      this.swapToScreen(this.gameContainer);
      startGameSound.play();
    }
    
    endGame(wave) {
      const endGameSound = document.getElementById('end-game-sound');
      this.swapToScreen(this.gameOverScreen);
      endGameSound.play();

      // Set the correct background based on device size
      this.setGameOverBackground(this.isMobile);

      const gameOverMessage = document.getElementById('game-over-message');
      gameOverMessage.innerHTML = `
        <h2>Game Over!</h2>
        <p>You survived until wave ${wave}</p>
        <p>Final score: ${score}</p>
      `;
      this.swapToScreen(this.gameOverScreen);
      
      // Preload the correct game over background based on screen size
      const gameOverBg = this.isMobile ? 
        '../assets/images/lose_splash_mobile.webp' : 
        '../assets/images/lose_splash_tablet.webp';
      
      const preloadImg = new Image();
      preloadImg.src = gameOverBg;
      
      // Ensure we're using the right background
      this.updateGameOverBackground();

    }

    // Add this new method to update background based on current dimensions
    updateGameOverBackground() {
      const isMobileSize = window.innerWidth <= 600;
      const gameOverScreen = document.getElementById('game-over-screen');
      
      if (isMobileSize) {
        gameOverScreen.style.setProperty('--game-over-bg', 'url("../assets/images/lose_splash_mobile.webp")');
      } else {
        gameOverScreen.style.setProperty('--game-over-bg', 'url("../assets/images/lose_splash_tablet.webp")');
      }
    }

    // Modify handleResize to also update game over background
    handleResize() {
      this.viewportWidth = window.innerWidth;
      this.viewportHeight = window.innerHeight;
      this.isMobile = this.viewportWidth <= 600;
      
      // If we're on the game over screen, update its background
      if (this.gameOverScreen.classList.contains('active')) {
        this.setGameOverBackground(this.isMobile);
      }
      
      // Use mobile layout if needed
      if (this.isMobile) {
        this.adjustMobileLayout();
      } else {
        this.adjustDesktopLayout();
      }
    }
    
    mainMenu() {
      this.swapToScreen(this.startMenuScreen);
    }
    
    playAgain() {
      this.swapToScreen(this.gameContainer);
    }
    
    settings() {
      this.swapToScreen(this.settingsScreen);
    }
    
    instructions() {
      this.swapToScreen(this.instructionsScreen);
    }

    handleResize() {
      this.viewportWidth = window.innerWidth;
      this.viewportHeight = window.innerHeight;
      this.isMobile = this.viewportWidth <= 600;
      
      // Update grid size if needed
      if (this.isMobile) {
        // Use mobile layout
        this.adjustMobileLayout();
      } else {
        // Use desktop layout
        this.adjustDesktopLayout();
      }
    }
    
    adjustMobileLayout() {
      // Adjust container sizes for mobile
      if (this.gameArea) {
        const cellSize = this.isMobile ? 32 : 40;
        const gridSize = 10; // Keep your original grid size
        const gameAreaSize = cellSize * gridSize;
        
        this.gameArea.style.width = `${gameAreaSize}px`;
        this.gameArea.style.height = `${gameAreaSize}px`;
        
        if (this.gridContainer) {
          this.gridContainer.style.width = `${gameAreaSize}px`;
          this.gridContainer.style.height = `${gameAreaSize}px`;
        }
      }
    }
    
    adjustDesktopLayout() {
      // Reset to desktop sizes
      if (this.gameArea) {
        this.gameArea.style.width = '400px';
        this.gameArea.style.height = '400px';
        
        if (this.gridContainer) {
          this.gridContainer.style.width = '400px';
          this.gridContainer.style.height = '400px';
        }
      }
    }
  }
  
  class GameLogic {
    constructor(ui) {
      this.ui = ui;
      
      // Game constants
      this.gridSize = 10;
      this.cellSize = 40;
      // Update cell size if mobile
      this.cellSize = ui.isMobile ? 32 : 40;
      
      // Default game values
      this.DEFAULT_HEALTH = 10;
      this.DEFAULT_MONEY = 100;
      this.DEFAULT_WAVE = 1;
      
      // Game state
      this.playerHealth = this.DEFAULT_HEALTH;
      this.playerMoney = this.DEFAULT_MONEY;
      this.currentWave = this.DEFAULT_WAVE;
      this.waveActive = false;
      this.isPaused = false;
      this.enemies = [];
      this.cells = Array.from({ length: this.gridSize }, () => []);
      this.selectedCell = null;
      
      // Tower and enemy definitions
      this.TOWERS = {
        red: {
          cost: 15,
          damage: 2,
          range: 60,
          fireDuration: 3,
          fireSplashDamage: 0.5,
          fireSplashRange: 30
        },
        blue: {
          cost: 20,
          damage: 1,
          range: 50,
          freezeDuration: 2
        },
        green: {
          cost: 40,
          damage: 3,
          range: 120
        }
      };
      
      this.ENEMY_TYPES = {
        red: {
          className: "red-enemy",
          baseHealth: 5,
          reward: 5
        },
        green: {
          className: "green-enemy",
          baseHealth: 10,
          reward: 10
        }
      };
      
      // Generate path once at initialization
      this.randomPath = this.generateWindingPath(this.gridSize);
      
      // Update UI displays
      this.ui.updateHealthDisplay(this.playerHealth);
      this.ui.updateMoneyDisplay(this.playerMoney);
      this.ui.updateWaveDisplay(this.currentWave);
      
      // Set up game loop
      this.gameLoopInterval = null;
    }
    
    // Path generation
    generateWindingPath(size) {
      const path = [];
      const visited = Array.from({ length: size }, () => Array(size).fill(false));
      const target = { r: 0, c: size - 1 };
      
      // Start point: bottom-left corner
      let current = { r: size - 1, c: 0 };
      path.push(current);
      visited[current.r][current.c] = true;
      
      while (current.r !== target.r || current.c !== target.c) {
        const neighbors = [];
        const directions = [
          { dr: -1, dc: 0 }, // Up
          { dr: 0, dc: 1 },  // Right
          { dr: 1, dc: 0 },  // Down
          { dr: 0, dc: -1 }  // Left
        ];
        const currentDistance = Math.abs(current.r - target.r) + Math.abs(current.c - target.c);
        
        // Collect all unvisited neighboring cells
        for (let { dr, dc } of directions) {
          const nr = current.r + dr;
          const nc = current.c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
            neighbors.push({ r: nr, c: nc });
          }
        }
        
        if (neighbors.length === 0) {
          // If no unvisited neighbors exist, backtrack
          path.pop();
          if (path.length === 0) break; // Stop if no path is available
          current = path[path.length - 1];
          continue;
        }
        
        // Assign weights to neighbors: closer to the target gets higher priority
        let totalWeight = 0;
        const weights = [];
        for (let neighbor of neighbors) {
          const neighborDistance = Math.abs(neighbor.r - target.r) + Math.abs(neighbor.c - target.c);
          // The greater the difference, the closer this step is to the target
          // Weight is set as the difference + 1 (at least 1)
          let weight = (currentDistance - neighborDistance) + 1;
          if (weight < 1) weight = 1;
          weights.push(weight);
          totalWeight += weight;
        }
        
        // Randomly select a neighbor based on weight
        let rand = Math.random() * totalWeight;
        let chosenIndex = 0;
        for (let i = 0; i < weights.length; i++) {
          rand -= weights[i];
          if (rand <= 0) {
            chosenIndex = i;
            break;
          }
        }
        
        const next = neighbors[chosenIndex];
        visited[next.r][next.c] = true;
        path.push(next);
        current = next;
      }
      return path;
    }
    
    // Tower placement
    placeTower(color) {
      const towerInfo = this.TOWERS[color];
      if (this.playerMoney >= towerInfo.cost) {
        this.playerMoney -= towerInfo.cost;
        this.ui.updateMoneyDisplay(this.playerMoney);
        
        const towerDiv = document.createElement('div');
        towerDiv.classList.add('tower', `${color}-tower`);
        towerDiv.innerHTML = `
          <svg viewBox="0 0 40 40">
            <use href="#${color}-tower" />
          </svg>
        `;
        
        this.ui.selectedCell.innerHTML = "";
        this.ui.selectedCell.appendChild(towerDiv);
        this.ui.selectedCell.removeAttribute("title");
      } else {
        alert(`Not enough money for ${color} tower!`);
      }
      this.ui.hideColorPicker();
    }
    
    // Enemy creation and management
    getCellCenter(row, col) {
      const offset = (this.cellSize - 20) / 2;
      return {
        x: col * this.cellSize + offset,
        y: row * this.cellSize + offset
      };
    }
    
    spawnEnemy(type = "red", extraHP = 0) {
      const eDiv = document.createElement("div");
      eDiv.classList.add("enemy", this.ENEMY_TYPES[type].className);
      this.ui.gameArea.appendChild(eDiv);
      
      const start = this.randomPath[0];
      const startPos = this.getCellCenter(start.r, start.c);
      
      const enemyObj = {
        element: eDiv,
        pathIndex: 0,
        x: startPos.x,
        y: startPos.y,
        health: this.ENEMY_TYPES[type].baseHealth + extraHP,
        reward: this.ENEMY_TYPES[type].reward,
        isFrozen: false,
        freezeTimer: 0,
        freezeCooldown: 0,
        isOnFire: false,
        fireTimer: 0
      };
      
      eDiv.style.left = startPos.x + "px";
      eDiv.style.top = startPos.y + "px";
      this.enemies.push(enemyObj);
    }
    
    updateEnemies() {
      this.enemies.forEach((enemy, i) => {
        if (!enemy) return;
        
        if (enemy.freezeCooldown > 0) {
          enemy.freezeCooldown--;
        }
        
        if (enemy.isFrozen) {
          enemy.freezeTimer--;
          if (enemy.freezeTimer <= 0) {
            enemy.isFrozen = false;
            enemy.element.classList.remove("frozen");
            enemy.freezeCooldown = 3;
          }
          return;
        }
        
        enemy.pathIndex++;
        if (enemy.pathIndex < this.randomPath.length) {
          const { r, c } = this.randomPath[enemy.pathIndex];
          const { x, y } = this.getCellCenter(r, c);
          enemy.x = x;
          enemy.y = y;
          enemy.element.style.left = x + "px";
          enemy.element.style.top = y + "px";
        } else {
          enemy.element.remove();
          this.enemies[i] = null;
          this.playerHealth--;
          this.ui.updateHealthDisplay(this.playerHealth);
          if (this.playerHealth <= 0) {
            alert("Game Over!");
            clearInterval(this.gameLoopInterval);
            this.waveActive = false;
            
            // Show game over screen with current wave
            this.ui.endGame(this.currentWave);
          }
        }
        
        if (enemy.isOnFire) {
          enemy.fireTimer--;
          if (enemy.fireTimer <= 0) {
            enemy.isOnFire = false;
            enemy.element.classList.remove("on-fire");
          } else {
            this.spreadFireDamage(enemy);
          }
        }
      });
      this.enemies = this.enemies.filter(e => e !== null);
    }
    
    spreadFireDamage(fireEnemy) {
      const { x, y } = fireEnemy;
      const splashRange = this.TOWERS.red.fireSplashRange;
      const splashDmg = this.TOWERS.red.fireSplashDamage;
      
      this.enemies.forEach((other, j) => {
        if (!other || other === fireEnemy) return;
        
        if (other.isFrozen && other.isOnFire) {
          other.isOnFire = false;
          other.fireTimer = 0;
          other.element.classList.remove("on-fire");
        }
        
        const dx = other.x - x;
        const dy = other.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= splashRange) {
          other.health -= splashDmg;
          if (other.health <= 0) {
            other.element.remove();
            this.playerMoney += other.reward;
            this.ui.updateMoneyDisplay(this.playerMoney);
            this.enemies[j] = null;
          }
        }
      });
      this.enemies = this.enemies.filter(e => e !== null);
    }
    
    // Tower shooting logic
    getTowerCenter(row, col) {
      return {
        x: col * this.cellSize + this.cellSize / 2,
        y: row * this.cellSize + this.cellSize / 2
      };
    }
    
    createProjectile(startPos, endPos, color) {
      const projectile = document.createElement("div");
      projectile.style.position = "absolute";
      projectile.style.width = "10px";
      projectile.style.height = "10px";
      projectile.style.backgroundColor = color; 
      projectile.style.borderRadius = "50%";
      projectile.style.left = startPos.x + "px";
      projectile.style.top = startPos.y + "px";
      projectile.style.transition = "left 0.5s linear, top 0.5s linear";
      this.ui.gameArea.appendChild(projectile);
      
      setTimeout(() => {
        projectile.style.left = endPos.x + "px";
        projectile.style.top = endPos.y + "px";
      }, 10);
      
      setTimeout(() => {
        projectile.remove();
      }, 510);
    }
    
    checkTowersShootEnemies() {
      const towers = [];
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.cells[row][col].classList.contains("path-cell")) continue;
          const towerEl = this.cells[row][col].querySelector(".tower");
          if (towerEl) {
            let towerType = "";
            if (towerEl.classList.contains("red-tower")) towerType = "red";
            else if (towerEl.classList.contains("blue-tower")) towerType = "blue";
            else if (towerEl.classList.contains("green-tower")) towerType = "green";
            if (towerType) {
              towers.push({ row, col, color: towerType });
            }
          }
        }
      }
      
      towers.forEach(twr => {
        const info = this.TOWERS[twr.color];
        const towerPos = this.getTowerCenter(twr.row, twr.col);
        this.enemies.forEach((enemy, i) => {
          if (!enemy) return;
          const dx = enemy.x - towerPos.x;
          const dy = enemy.y - towerPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= info.range) {
            this.createProjectile(towerPos, { x: enemy.x, y: enemy.y }, twr.color);
            enemy.health -= info.damage;
            
            if (twr.color === "blue") {
              if (enemy.isOnFire) {
                enemy.isOnFire = false;
                enemy.fireTimer = 0;
                enemy.element.classList.remove("on-fire");
              }
              if (!enemy.isFrozen && enemy.freezeCooldown === 0) {
                enemy.isFrozen = true;
                enemy.freezeTimer = info.freezeDuration;
                enemy.element.classList.add("frozen");
              }
            }
            
            if (twr.color === "red") {
              if (enemy.isFrozen) {
                enemy.isFrozen = false;
                enemy.freezeTimer = 0;
                enemy.element.classList.remove("frozen");
              }
              if (!enemy.isOnFire) {
                enemy.isOnFire = true;
                enemy.fireTimer = info.fireDuration;
                enemy.element.classList.add("on-fire");
              } else {
                enemy.fireTimer = info.fireDuration;
              }
            }
            
            if (enemy.health <= 0) {
              enemy.element.remove();
              this.playerMoney += enemy.reward;
              this.ui.updateMoneyDisplay(this.playerMoney);
              this.enemies[i] = null;
            }
          }
        });
      });
      this.enemies = this.enemies.filter(e => e !== null);
    }
    
    // Wave management
    spawnWave(waveNumber) {
      this.waveActive = true;
      // Immediately update the wave display
      this.ui.updateWaveDisplay(waveNumber);
      // Begin spawning enemies after the message has faded
      let spawnedRed = 0;
      let spawnedGreen = 0;
      const countRed = waveNumber * 5;
      const countGreen = (waveNumber >= 2) ? waveNumber * 3 : 0;
      const bonusHP = waveNumber * 2;
      
      const spawnInterval = setInterval(() => {
        if (spawnedRed < countRed) {
          this.spawnEnemy("red", bonusHP);
          spawnedRed++;
          return;
        }
        if (spawnedGreen < countGreen) {
          this.spawnEnemy("green", bonusHP);
          spawnedGreen++;
          return;
        }
        clearInterval(spawnInterval);
      }, 500);
    }
    
    checkWaveComplete() {
      if (this.waveActive && this.enemies.length === 0) {
        this.waveActive = false;
        this.ui.showWaveMessage("Wave " + (this.currentWave + 1) + " Starting...");
        setTimeout(() => {
          this.ui.hideWaveMessage();
          this.currentWave++;
          this.ui.updateWaveDisplay(this.currentWave);
          this.spawnWave(this.currentWave);
        }, 3000);
      }
    }
    
    // Game loop
    startGameLoop() {
      if (this.gameLoopInterval) {
        clearInterval(this.gameLoopInterval);
      }
      this.gameLoopInterval = setInterval(() => {
        if (this.isPaused) return;
        this.updateEnemies();
        this.checkTowersShootEnemies();
        this.checkWaveComplete();
      }, 500);
    }
    
    // Reset game state
    resetGame() {
      // Clear existing game state
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
      
      // Remove all enemies
      this.enemies.forEach(enemy => {
        if (enemy && enemy.element) {
          enemy.element.remove();
        }
      });
      this.enemies = [];
      
      // Reset player stats
      this.playerHealth = this.DEFAULT_HEALTH;
      this.playerMoney = this.DEFAULT_MONEY;
      this.currentWave = this.DEFAULT_WAVE;
      this.waveActive = false;
      this.isPaused = true;
      
      // Update UI
      this.ui.updateHealthDisplay(this.playerHealth);
      this.ui.updateMoneyDisplay(this.playerMoney);
      this.ui.updateWaveDisplay(this.currentWave);
      
      // Clear all towers
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.cells[row][col] && !this.cells[row][col].classList.contains("path-cell")) {
            this.cells[row][col].innerHTML = "";
            this.cells[row][col].title = "click to place a tower";
          }
        }
      }
      
      // Restart game loop
      this.startGameLoop();
    }
    
    // Grid setup
    createGrid(gridContainer) {
      for (let row = 0; row < this.gridSize; row++) {
        const rowDiv = document.createElement("div");
        rowDiv.classList.add("row");
        gridContainer.appendChild(rowDiv);
        
        for (let col = 0; col < this.gridSize; col++) {
          const cellDiv = document.createElement("div");
          cellDiv.classList.add("cell");
          
          // hint to the user that they can place towers here
          cellDiv.title = "tap to place a tower";

           // Touch and mouse event handling
          const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
          
          if (isTouchDevice) {
            // Long press (touch and hold) for context menu/selling tower
            cellDiv.addEventListener("touchstart", (e) => {
              if (cellDiv.classList.contains("path-cell")) return;
              
              this.touchStartX = e.touches[0].clientX;
              this.touchStartY = e.touches[0].clientY;
              
              this.longTouchTimer = setTimeout(() => {
                // This simulates a right-click for selling towers
                if (cellDiv.children.length > 0) {
                  cellDiv.innerHTML = "";
                  if (!cellDiv.classList.contains("path-cell")) {
                    cellDiv.title = "tap to place a tower";
                  }
                  e.preventDefault();
                }
              }, 700); // 700ms for long press
            });

            cellDiv.addEventListener("touchend", (e) => {
              clearTimeout(this.longTouchTimer);
              
              // Calculate if there was movement (to differentiate from tap)
              const touchEndX = e.changedTouches[0].clientX;
              const touchEndY = e.changedTouches[0].clientY;
              const distance = Math.sqrt(
                Math.pow(touchEndX - this.touchStartX, 2) + 
                Math.pow(touchEndY - this.touchStartY, 2)
              );

              // If it was a tap (not much movement) and not a long press
              if (distance < 10) {
                if (!cellDiv.classList.contains("path-cell") && cellDiv.children.length === 0) {
                  this.ui.showColorPicker(cellDiv);
                }
              }
            });

          } else {
            // Original mouse event handlers
            cellDiv.addEventListener("click", () => {
              if (cellDiv.classList.contains("path-cell") || cellDiv.children.length > 0) return;
              this.ui.showColorPicker(cellDiv);
            });
          
            cellDiv.addEventListener("contextmenu", (e) => {
              e.preventDefault();
              if (cellDiv.children.length > 0) {
                cellDiv.innerHTML = "";
                if (!cellDiv.classList.contains("path-cell")) {
                  cellDiv.title = "click to place a tower";
                }
              }
            });
          }

          rowDiv.appendChild(cellDiv);
          this.cells[row][col] = cellDiv;
        }
      }
      
      // Mark path cells
      this.randomPath.forEach(({ r, c }) => {
        this.cells[r][c].classList.add("path-cell");
        this.cells[r][c].removeAttribute("title");
      });
    }

    // Update getCellCenter to account for dynamic cell size
    getCellCenter(row, col) {
      const offset = (this.cellSize - 20) / 2;
      return {
        x: col * this.cellSize + offset,
        y: row * this.cellSize + offset
      };
    }
  
    // Update getTowerCenter method
    getTowerCenter(row, col) {
      return {
        x: col * this.cellSize + this.cellSize / 2,
        y: row * this.cellSize + this.cellSize / 2
      };
    }
  }

  
  class Game {
    constructor() {
      this.ui = new GameUI();
      this.logic = new GameLogic(this.ui);

      // Initialize UI based on device
      if (this.ui.isMobile) {
        this.ui.adjustMobileLayout();
      }

      // Prevent mobile browser behaviors that interfere with the game
      this.preventMobileQuirks();
      this.lastFrameTime = 0;
      this.updateInterval = 1000 / 60;
      this.done = false;
      this.isPaused = false;
      this.animationFrameId = null;
      
      // Create game grid
      this.logic.createGrid(this.ui.gridContainer);
      
      // Set up event listeners for tower placement
      this.ui.redButton.addEventListener("click", () => this.logic.placeTower("red"));
      this.ui.blueButton.addEventListener("click", () => this.logic.placeTower("blue"));
      this.ui.greenButton.addEventListener("click", () => this.logic.placeTower("green"));
      
      // Start game button setup
      this.ui.startGameBtn.addEventListener("click", () => {
        this.logic.isPaused = true;
        this.ui.showWaveMessage("Get Ready...");
        setTimeout(() => {
          this.ui.hideWaveMessage();
          this.logic.isPaused = false;
          this.logic.spawnWave(this.logic.currentWave);
        }, 3000);
      });
      
      // Initialize game pause state
      window.addEventListener("load", () => {
        this.logic.isPaused = true;
      });
      
      // Start the game loop
      this.logic.startGameLoop();
    }
    
    // Add this method to the Game class
    preventMobileQuirks() {
      // Prevent pinch-to-zoom
      document.addEventListener('touchmove', function(event) {
        if (event.scale !== 1) {
          event.preventDefault();
        }
      }, { passive: false });
      
      // Prevent pull-to-refresh on mobile browsers
      document.body.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      }, { passive: false });
      
      // Prevent context menu on long press
      document.addEventListener('contextmenu', function(e) {
        if (e.target.classList.contains('cell')) {
          e.preventDefault();
        }
      });
    }

    prepareGame() {
      const gameContainer = document.getElementById('game-screen');
      // Prepare game container DOM elements here
      this.assignButtons();
    }
    
    startGame() {
      this.ui.startGame();
      // Reset and start game logic
      this.logic.isPaused = false;
      
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    updateGame() {
      // Additional game updates if needed
    }
    
    resetGame() {
      // Reset game logic
      this.logic.resetGame();
      
      // Reset animation frame
      this.isPaused = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      
      // Display restart message
      this.ui.showWaveMessage("Game Restarted!");
      setTimeout(() => {
        this.ui.hideWaveMessage();
        this.startGame();
      }, 1500);
    }
    
    pause() {
      this.logic.isPaused = true;
      cancelAnimationFrame(this.animationFrameId);
    }
    
    resume() {
      this.logic.isPaused = false;
      this.gameLoop();
    }
    
    gameLoop(timestamp) {
      if (this.done) return;
      const deltaTime = timestamp - this.lastFrameTime;
      if (deltaTime > this.updateInterval) {
        this.updateGame();
        this.lastFrameTime = timestamp;
      }
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    assignButtons() {
      const playButton = document.getElementById('play-button');
      const settingsButton = document.getElementById('settings-button');
      const instructionsButton = document.getElementById('instructions-button');
      const playAgainButton = document.getElementById('play-again-button');
      const mainMenuButtons = document.querySelectorAll('#game-over-main-menu-button, #settings-back-button, #instructions-back-button');
      const gameMenuButton = document.getElementById('game-menu-button');
      const gameRestartButton = document.getElementById('game-restart-button');
      const gameInstructionsButton = document.getElementById('game-instructions-button');
      
      playButton.addEventListener('click', this.startGame.bind(this));
      settingsButton.addEventListener('click', this.ui.settings.bind(this.ui));
      instructionsButton.addEventListener('click', this.ui.instructions.bind(this.ui));
      playAgainButton.addEventListener('click', this.startGame.bind(this));
      mainMenuButtons.forEach(button => button.addEventListener('click', () => {
        this.ui.mainMenu();
      }));
      gameMenuButton.addEventListener('click', () => {
        this.ui.mainMenu();
      });
      gameRestartButton.addEventListener('click', this.resetGame.bind(this));
      gameInstructionsButton.addEventListener('click', () => {
        this.pause();						
        this.ui.swapToScreen(this.ui.instructionsScreen);
        document.getElementById('instructions-back-button').addEventListener('click', () => {
          this.ui.swapToScreen(this.ui.gameContainer);
          this.resume();
        }, { once: true });
      });
      playAgainButton.addEventListener('click', () => {
        this.logic.resetGame();
        this.startGame();
      });
    }
  }
  
  window.game = new Game();
  window.game.prepareGame(); 
});