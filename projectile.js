class Projectile {
    constructor(x, y, angle, size = 10) {
        this.x = x;
        this.y = y;
        this.width = size;
        this.height = size;
        this.speed = 10;
        this.angle = angle;
    }

    update() {
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