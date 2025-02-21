class Enemy {
    constructor() {
        this.width = 70;
        this.height = 70;
        this.speed = 1;
        this.angle = 0;
        
        // Randomly spawn enemies from edges
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // Top
                this.x = Math.random() * 800;
                this.y = -this.height;
                break;
            case 1: // Right
                this.x = 800 + this.width;
                this.y = Math.random() * 600;
                break;
            case 2: // Bottom
                this.x = Math.random() * 800;
                this.y = 600 + this.height;
                break;
            case 3: // Left
                this.x = -this.width;
                this.y = Math.random() * 600;
                break;
        }

        // Initialize angle based on spawn position
        this.angle = Math.atan2(300 - this.y, 400 - this.x); // Point towards center initially
    }

    update(player) {
        // Calculate angle to player
        this.angle = Math.atan2(
            (player.y + player.height/2) - (this.y + this.height/2),
            (player.x + player.width/2) - (this.x + this.width/2)
        );

        // Move towards player
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    isOffScreen() {
        return this.x < -this.width || 
               this.x > 800 + this.width || 
               this.y < -this.height || 
               this.y > 600 + this.height;
    }
} 