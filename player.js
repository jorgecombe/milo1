class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 80;
        this.speed = 5;
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        this.bulletCount = 1;
        this.spreadShot = false;
        this.spreadAngle = 0.2;
        this.spreadCount = 3;
        this.freezeShot = false;
    }

    getNextX() {
        let nextX = this.x;
        if (this.keys.left) nextX -= this.speed;
        if (this.keys.right) nextX += this.speed;
        return nextX;
    }

    getNextY() {
        let nextY = this.y;
        if (this.keys.up) nextY -= this.speed;
        if (this.keys.down) nextY += this.speed;
        return nextY;
    }

    update(speed) {
        this.speed = speed;
        
        // Update position based on keys
        if (this.keys.up) this.y -= this.speed;
        if (this.keys.down) this.y += this.speed;
        if (this.keys.left) this.x -= this.speed;
        if (this.keys.right) this.x += this.speed;
        
        // Keep player within bounds
        this.x = Math.max(0, Math.min(this.x, 800 - this.width));
        this.y = Math.max(0, Math.min(this.y, 600 - this.height));
    }

    handleKeyDown(e) {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
                this.keys.up = true;
                break;
            case 'ArrowDown':
            case 's':
                this.keys.down = true;
                break;
            case 'ArrowLeft':
            case 'a':
                this.keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
                this.keys.right = true;
                break;
        }
    }

    handleKeyUp(e) {
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
                this.keys.up = false;
                break;
            case 'ArrowDown':
            case 's':
                this.keys.down = false;
                break;
            case 'ArrowLeft':
            case 'a':
                this.keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
                this.keys.right = false;
                break;
        }
    }

    shoot(e, projectiles) {
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const angle = Math.atan2(
            mouseY - (this.y + this.height/2),
            mouseX - (this.x + this.width/2)
        );

        if (this.spreadShot) {
            // Enhanced spread shot with variable angles and count
            const totalSpread = this.spreadCount;
            const angleStep = this.spreadAngle * 2 / (totalSpread - 1);
            const startAngle = angle - this.spreadAngle;

            for (let i = 0; i < totalSpread; i++) {
                projectiles.push(new Projectile(
                    this.x + this.width/2,
                    this.y + this.height/2,
                    startAngle + (angleStep * i),
                    game.bulletSize
                ));
            }
        } else if (this.bulletCount > 1) {
            // Multiple bullets
            for (let i = 0; i < this.bulletCount; i++) {
                const bulletAngle = angle + (i * (Math.PI * 2 / this.bulletCount));
                projectiles.push(new Projectile(
                    this.x + this.width/2,
                    this.y + this.height/2,
                    bulletAngle,
                    game.bulletSize
                ));
            }
        } else {
            // Normal single bullet
            projectiles.push(new Projectile(
                this.x + this.width/2,
                this.y + this.height/2,
                angle,
                game.bulletSize
            ));
        }

        const createProjectile = (angle) => {
            const projectile = new Projectile(
                this.x + this.width/2,
                this.y + this.height/2,
                angle,
                game.bulletSize
            );
            if (this.freezeShot) {
                projectile.freezeShot = true;
            }
            return projectile;
        };

        if (this.spreadShot) {
            // Enhanced spread shot with variable angles and count
            const totalSpread = this.spreadCount;
            const angleStep = this.spreadAngle * 2 / (totalSpread - 1);
            const startAngle = angle - this.spreadAngle;

            for (let i = 0; i < totalSpread; i++) {
                projectiles.push(createProjectile(startAngle + (angleStep * i)));
            }
        } else if (this.bulletCount > 1) {
            // Multiple bullets
            for (let i = 0; i < this.bulletCount; i++) {
                const bulletAngle = angle + (i * (Math.PI * 2 / this.bulletCount));
                projectiles.push(createProjectile(bulletAngle));
            }
        } else {
            // Normal single bullet
            projectiles.push(createProjectile(angle));
        }
    }
} 