class Game {
    constructor() {
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.score = 0;
        this.isGameOver = false;
        this.sprites = {
            player: new Image(),
            enemy: new Image()
        };
        this.loadSprites();
        this.wave = 1;
        this.spawnInterval = 2000; // Start with 2 seconds
        this.spawnTimer = null;
        this.isPaused = false;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.powerUps = [];
        this.availablePowerUps = [
            { type: 'doubleBullet', color: 'black', text: '2X Bullets', level: 0, max: 3 },
            { type: 'speed', color: 'black', text: 'Speed Up', level: 0, max: 3 },
            { type: 'extraLife', color: 'black', text: '+1 Life', level: 0, max: 5 },
            { type: 'spreadShot', color: 'black', text: 'Spread Shot', level: 0, max: 3 },
            { type: 'biggerBullets', color: 'black', text: 'Big Bullets', level: 0, max: 3 },
            { type: 'invisibility', color: 'black', text: 'Invisibility', level: 0, max: 3 },
            { type: 'shield', color: 'black', text: 'Shield', level: 0, max: 3 },
            { type: 'freeze', color: 'black', text: 'Freeze Ray', level: 0, max: 3 }
        ];
        this.playerLives = 1;
        this.bulletSize = 10;
        this.playerSpeed = 4;
        this.powerUpActive = false;
        this.choosingPowerUp = false;  // New property to track power-up selection state
        this.barriers = [];
        this.barrierWidth = 20;  // Width of barrier lines
        this.rotationSpeed = 0.2; // Increased rotation speed for faster turning
        this.isInvisible = false;
        this.invisibilityCooldown = 0;
        this.invisibilityDuration = 5000; // 5 seconds
        this.invisibilityCooldownTime = 30000; // 30 seconds
        this.shieldActive = false;
        this.shieldDuration = 5000; // Changed from 10000 to 5000 (5 seconds)
        this.canUseInvisibility = true;
        this.usedPowerUps = new Set(); // Track used power-ups
        this.currentAmmo = 3;
        this.maxAmmo = 3;
        this.ammoRegenTime = 1750; // Changed from 2500 to 1750 (1.75 seconds)
        this.ammoRegenTimer = null;
        this.allZombiesFrozen = false;  // New property to track global freeze
    }

    init() {
        this.player = new Player(400, 300); // Center of screen
        this.startWave();
        this.setupEventListeners();
    }

    startWave() {
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
        }

        // Faster spawn rate and more enemies
        this.spawnInterval = Math.max(2000, 3000 - (this.wave - 1) * 250);
        
        this.spawnTimer = setInterval(() => {
            if (!this.isGameOver) {
                const enemiesPerSpawn = Math.min(3, Math.floor(this.wave/2) + 1);
                for (let i = 0; i < enemiesPerSpawn; i++) {
                    const enemy = new Enemy();
                    // Reduce base speed from 1.5 to 1.25
                    enemy.speed = 1.25 + (this.wave * 0.15);
                    this.enemies.push(enemy);
                }
            }
        }, this.spawnInterval);

        this.generateBarriers();
    }

    checkWave() {
        const newWave = Math.floor(this.score / 1000) + 1;
        if (newWave > this.wave) {
            this.wave = newWave;
            this.startWave();
            // Always spawn power-ups at new wave
            setTimeout(() => this.spawnPowerUps(), 1000); // Small delay after wave starts
        }
    }

    update() {
        if (this.choosingPowerUp) return;
        if (this.isGameOver || this.isPaused) return;

        // Store current position
        const oldX = this.player.x;
        const oldY = this.player.y;
        
        // Try to move
        if (this.player.keys.up) this.player.y -= this.playerSpeed;
        if (this.player.keys.down) this.player.y += this.playerSpeed;
        if (this.player.keys.left) this.player.x -= this.playerSpeed;
        if (this.player.keys.right) this.player.x += this.playerSpeed;

        // Check for collision and revert if needed
        if (this.checkBarrierCollision(this.player, this.player.x, this.player.y)) {
            this.player.x = oldX;
            this.player.y = oldY;
        }

        // Keep player in bounds
        this.player.x = Math.max(0, Math.min(this.player.x, 800 - this.player.width));
        this.player.y = Math.max(0, Math.min(this.player.y, 600 - this.player.height));

        this.updateProjectiles();
        this.updateEnemies();
        this.checkCollisions();
        this.checkPowerUpCollision();

        // Update invisibility cooldown
        if (this.invisibilityCooldown > 0) {
            this.invisibilityCooldown -= 16.67; // Approximately 60 FPS
        }
    }

    updateProjectiles() {
        this.projectiles.forEach((projectile, index) => {
            const nextX = projectile.x + Math.cos(projectile.angle) * projectile.speed;
            const nextY = projectile.y + Math.sin(projectile.angle) * projectile.speed;
            
            // Remove projectile if it hits a barrier
            if (this.checkBarrierCollision(projectile, nextX, nextY)) {
                this.projectiles.splice(index, 1);
                return;
            }
            
            projectile.x = nextX;
            projectile.y = nextY;

            if (projectile.isOffScreen()) {
                this.projectiles.splice(index, 1);
            }
        });
    }

    updateEnemies() {
        this.enemies.forEach((enemy, index) => {
            if (this.isInvisible) return;
            
            // Calculate direction to player
            const dx = (this.player.x + this.player.width/2) - (enemy.x + enemy.width/2);
            const dy = (this.player.y + this.player.height/2) - (enemy.y + enemy.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Normalize direction
            const dirX = distance ? dx / distance : 0;
            const dirY = distance ? dy / distance : 0;

            // Create more potential paths for better barrier surrounding
            const possibleMoves = [
                // Direct path
                { x: enemy.x + dirX * enemy.speed, y: enemy.y + dirY * enemy.speed },
                // Horizontal moves
                { x: enemy.x + enemy.speed, y: enemy.y },
                { x: enemy.x - enemy.speed, y: enemy.y },
                // Vertical moves
                { x: enemy.x, y: enemy.y + enemy.speed },
                { x: enemy.x, y: enemy.y - enemy.speed },
                // Diagonal moves (8 directions)
                { x: enemy.x + enemy.speed * 0.7, y: enemy.y + enemy.speed * 0.7 },
                { x: enemy.x + enemy.speed * 0.7, y: enemy.y - enemy.speed * 0.7 },
                { x: enemy.x - enemy.speed * 0.7, y: enemy.y + enemy.speed * 0.7 },
                { x: enemy.x - enemy.speed * 0.7, y: enemy.y - enemy.speed * 0.7 },
                // Wider angles for better surrounding
                { x: enemy.x + enemy.speed * 0.9, y: enemy.y + enemy.speed * 0.4 },
                { x: enemy.x + enemy.speed * 0.4, y: enemy.y + enemy.speed * 0.9 },
                { x: enemy.x - enemy.speed * 0.9, y: enemy.y + enemy.speed * 0.4 },
                { x: enemy.x - enemy.speed * 0.4, y: enemy.y + enemy.speed * 0.9 }
            ];

            // Find the best move that doesn't hit a barrier
            let bestMove = null;
            let bestDistance = Infinity;
            let foundDirectPath = false;

            possibleMoves.forEach(move => {
                if (!this.checkBarrierCollision(enemy, move.x, move.y)) {
                    const moveDistance = Math.sqrt(
                        Math.pow(this.player.x - move.x, 2) + 
                        Math.pow(this.player.y - move.y, 2)
                    );

                    // Prefer direct paths when available
                    if (move === possibleMoves[0] && moveDistance < distance) {
                        bestMove = move;
                        foundDirectPath = true;
                        return;
                    }

                    // If no direct path, find the best alternative
                    if (!foundDirectPath && moveDistance < bestDistance) {
                        bestDistance = moveDistance;
                        bestMove = move;
                    }
                }
            });

            // Apply the best move found, or stay in place if no valid moves
            if (bestMove) {
                enemy.x = bestMove.x;
                enemy.y = bestMove.y;
            }

            if (enemy.isOffScreen()) {
                this.enemies.splice(index, 1);
            }
        });
    }

    checkCollisions() {
        // Check projectile-enemy collisions
        this.projectiles.forEach((projectile, pIndex) => {
            this.enemies.forEach((enemy, eIndex) => {
                if (this.checkCollision(projectile, enemy)) {
                    this.score += 100;
                    this.checkWave();
                    this.projectiles.splice(pIndex, 1);
                    
                    if (projectile.freezeShot) {
                        this.enemies.splice(eIndex, 1);
                        this.enemies.forEach(otherEnemy => {
                            otherEnemy.frozen = true;
                            otherEnemy.originalSpeed = otherEnemy.speed;
                            otherEnemy.speed *= 0.3;
                        });
                        setTimeout(() => {
                            this.enemies.forEach(otherEnemy => {
                                if (otherEnemy && !otherEnemy.isOffScreen()) {
                                    otherEnemy.frozen = false;
                                    otherEnemy.speed = otherEnemy.originalSpeed;
                                }
                            });
                        }, 3000);
                    } else {
                        this.enemies.splice(eIndex, 1);
                    }
                }
            });
        });

        // Check player-enemy collisions
        this.enemies.forEach((enemy, index) => {
            if (this.checkCollision(this.player, enemy)) {
                if (this.shieldActive) {
                    enemy.speed = Math.max(1.25, enemy.speed * 0.8);
                } else {
                    this.playerLives--;
                    // Clear all enemies when losing a life
                    this.enemies = [];
                    if (this.playerLives <= 0) {
                        this.gameOver();
                    }
                }
            }
        });
    }

    checkCollision(obj1, obj2) {
        // Simple rectangle collision detection
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    checkHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
        }
    }

    gameOver() {
        this.isGameOver = true;
        this.checkHighScore();
        
        // Reset all power-ups when game ends
        this.resetAllPowerUps();
        console.log('Game Over! Score:', this.score);
    }

    resetAllPowerUps() {
        // Reset all power-up levels to 0
        this.availablePowerUps.forEach(powerUp => {
            powerUp.level = 0;
        });
        
        // Clear used power-ups set
        this.usedPowerUps.clear();
        
        // Reset player power-up effects
        this.player.bulletCount = 1;
        this.player.spreadShot = false;
        this.player.freezeShot = false;
        this.playerSpeed = 4;
        this.bulletSize = 10;
        this.isInvisible = false;
        this.invisibilityCooldown = 0;
        this.canUseInvisibility = true;
        this.shieldActive = false;
        
        // Reset ammo
        this.currentAmmo = this.maxAmmo;
        if (this.ammoRegenTimer) {
            clearInterval(this.ammoRegenTimer);
            this.ammoRegenTimer = null;
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                this.activateInvisibility();
            }
            if (e.key === 'p' || e.key === 'P') {
                this.togglePause();
            }
            this.player.handleKeyDown(e);
        });
        document.addEventListener('keyup', (e) => this.player.handleKeyUp(e));
        document.addEventListener('click', (e) => {
            if (this.choosingPowerUp) {
                this.handlePowerUpClick(e);
            } else if (!this.isPaused && !this.isGameOver) {
                this.shoot(e);
            }
        });
    }

    handlePowerUpClick(e) {
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        this.powerUps.forEach((powerUp, index) => {
            if (mouseX >= powerUp.x && 
                mouseX <= powerUp.x + powerUp.width &&
                mouseY >= powerUp.y && 
                mouseY <= powerUp.y + powerUp.height) {
                this.activatePowerUp(powerUp.type);
                this.powerUps = [];  // Clear all power-ups
                this.powerUpActive = false;
                this.choosingPowerUp = false;
                this.isPaused = false;
            }
        });
    }

    loadSprites() {
        // Add loading status check
        this.sprites.player.onload = () => {
            console.log('Cowboy sprite loaded successfully');
        };
        this.sprites.enemy.onload = () => {
            console.log('Zombie sprite loaded successfully');
        };

        this.sprites.player.onerror = (e) => {
            console.error('Error loading cowboy sprite:', e);
        };
        this.sprites.enemy.onerror = (e) => {
            console.error('Error loading zombie sprite:', e);
        };

        // Make sure these paths match your new zombie image location
        this.sprites.player.src = 'assets/cowboy.png';
        this.sprites.enemy.src = 'assets/zombie.png';  // Verify this path matches your new image
    }

    togglePause() {
        // Don't allow pausing while choosing power-ups
        if (this.choosingPowerUp) return;
        
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            clearInterval(this.spawnTimer);
        } else {
            this.startWave();
        }
    }

    restart() {
        this.player = new Player(400, 300);
        this.enemies = [];
        this.projectiles = [];
        this.score = 0;
        this.isGameOver = false;
        this.wave = 1;
        this.isPaused = false;
        this.playerLives = 1;  // Reset lives to 1
        
        // Use the new reset function
        this.resetAllPowerUps();
        
        this.startWave();
    }

    spawnPowerUps() {
        if (this.powerUpActive) return;
        
        this.isPaused = true;
        this.choosingPowerUp = true;
        
        // Filter out maxed-out power-ups and used power-ups
        const availablePowerUps = this.availablePowerUps.filter(p => 
            p.level < p.max && !this.usedPowerUps.has(p.type)
        );
        
        if (availablePowerUps.length === 0) {
            this.isPaused = false;
            this.choosingPowerUp = false;
            return;
        }

        const shuffled = [...availablePowerUps].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(2, availablePowerUps.length));
        
        this.powerUps = selected.map((powerUp, index) => ({
            x: 250 + (index * 300),
            y: 250,
            width: 100,
            height: 100,
            ...powerUp,
            text: powerUp.text
        }));
        
        this.powerUpActive = true;
    }

    checkPowerUpCollision() {
        this.powerUps.forEach((powerUp, index) => {
            if (this.checkCollision(this.player, powerUp)) {
                this.activatePowerUp(powerUp.type);
                this.powerUps.splice(index, 1);
                this.powerUpActive = false;
            }
        });
    }

    activatePowerUp(type) {
        this.powerUps = [];
        this.powerUpActive = false;
        this.choosingPowerUp = false;
        this.isPaused = false;

        const powerUp = this.availablePowerUps.find(p => p.type === type);
        if (powerUp && powerUp.level < powerUp.max) {
            powerUp.level++;
            
            switch(type) {
                case 'doubleBullet':
                    this.player.bulletCount = 1 + powerUp.level;
                    this.player.spreadShot = false;  // Ensure spread shot is off
                    break;
                case 'speed':
                    this.playerSpeed = 4 + (powerUp.level * 0.7);
                    break;
                case 'extraLife':
                    this.playerLives++;
                    break;
                case 'spreadShot':
                    this.player.spreadShot = true;
                    this.player.spreadAngle = 0.2 + (powerUp.level * 0.1);
                    this.player.spreadCount = 2 + powerUp.level;
                    this.player.bulletCount = 1;  // Reset bullet count
                    break;
                case 'biggerBullets':
                    this.bulletSize = 10 + (powerUp.level * 15);
                    break;
                case 'invisibility':
                    this.canUseInvisibility = true;  // Reset invisibility usage
                    break;
                case 'shield':
                    this.shieldActive = true;
                    setTimeout(() => {
                        this.shieldActive = false;
                    }, this.shieldDuration);
                    break;
                case 'freeze':
                    this.player.freezeShot = true;
                    break;
            }
            
            // Only add to used power-ups if it's at max level
            if (powerUp.level >= powerUp.max) {
                this.usedPowerUps.add(type);
            }
        }
    }

    generateBarriers() {
        this.barriers = [];
        // Increase number of barriers
        const numBarriers = Math.min(4 + Math.floor(this.wave/2), 10);  // Changed from 2 to 4, and max from 6 to 10
        
        const gridSize = 4;
        const cellWidth = 800 / gridSize;
        const cellHeight = 600 / gridSize;
        const usedCells = new Set();
        
        // Calculate player's grid cell
        const playerGridX = Math.floor(this.player.x / cellWidth);
        const playerGridY = Math.floor(this.player.y / cellHeight);
        
        for(let i = 0; i < numBarriers; i++) {
            let gridX, gridY;
            let validPosition = false;
            let attempts = 0;
            
            // Try to find a valid position that's not too close to the player
            do {
                gridX = Math.floor(Math.random() * gridSize);
                gridY = Math.floor(Math.random() * gridSize);
                
                // Check if position is far enough from player
                const distFromPlayer = Math.abs(gridX - playerGridX) + Math.abs(gridY - playerGridY);
                validPosition = distFromPlayer > 1 && !usedCells.has(`${gridX},${gridY}`);
                
                attempts++;
                if (attempts > 20) break; // Prevent infinite loop
            } while(!validPosition);
            
            if (!validPosition) continue;
            
            usedCells.add(`${gridX},${gridY}`);
            
            const padding = 30;  // Reduced padding to allow more space for barriers
            const x = (gridX * cellWidth) + padding + Math.random() * (cellWidth - 2 * padding);
            const y = (gridY * cellHeight) + padding + Math.random() * (cellHeight - 2 * padding);
            
            const length = 80 + Math.random() * 120;  // Slightly longer barriers
            const isHorizontal = Math.random() > 0.5;
            
            const barrier = {
                x: x,
                y: y,
                width: isHorizontal ? length : this.barrierWidth,
                height: isHorizontal ? this.barrierWidth : length
            };
            
            // Only add barrier if it doesn't collide with player
            if (!this.checkBarrierCollision(this.player, this.player.x, this.player.y, barrier)) {
                this.barriers.push(barrier);
            }
        }
    }

    checkBarrierCollision(obj, newX, newY, specificBarrier = null) {
        const barriersToCheck = specificBarrier ? [specificBarrier] : this.barriers;
        for(let barrier of barriersToCheck) {
            if(newX < barrier.x + barrier.width &&
               newX + obj.width > barrier.x &&
               newY < barrier.y + barrier.height &&
               newY + obj.height > barrier.y) {
                return true;
            }
        }
        return false;
    }

    activateInvisibility() {
        if (this.invisibilityCooldown <= 0 && this.canUseInvisibility && 
            this.availablePowerUps.find(p => p.type === 'invisibility').level > 0) {
            this.isInvisible = true;
            setTimeout(() => {
                this.isInvisible = false;
                this.canUseInvisibility = false; // Can't use again after cooldown
                this.invisibilityCooldown = this.invisibilityCooldownTime;
            }, this.invisibilityDuration);
        }
    }

    startAmmoRegen() {
        if (this.ammoRegenTimer) return;
        
        this.ammoRegenTimer = setInterval(() => {
            if (this.currentAmmo < this.maxAmmo) {
                this.currentAmmo++;
            }
            if (this.currentAmmo >= this.maxAmmo) {
                clearInterval(this.ammoRegenTimer);
                this.ammoRegenTimer = null;
            }
        }, this.ammoRegenTime);
    }

    shoot(e) {
        if (this.currentAmmo <= 0) return;
        
        this.currentAmmo--;
        this.player.shoot(e, this.projectiles);
        
        if (this.currentAmmo < this.maxAmmo) {
            this.startAmmoRegen();
        }
    }
} 