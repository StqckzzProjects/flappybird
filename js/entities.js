window.Bird = class {
    constructor(config) {
        this.name = config.name;
        this.color = config.color;
        this.key = config.key;
        this.x = 150; this.y = 300;
        this.velocity = 0; this.gravity = 0.4; this.jump = -7;
        this.radius = 12; this.isDead = false; this.distance = 0;
    }
    flap() { if (!this.isDead) this.velocity = this.jump; }
    update(h) {
        if (this.isDead) return;
        this.velocity += this.gravity;
        this.y += this.velocity;
        this.distance++;
        if (this.y + this.radius >= h || this.y - this.radius <= 0) this.isDead = true;
    }
    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 15; ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
};

window.Pipe = class {
    constructor(cfg, w, h) {
        this.x = w;
        this.width = 65;
        this.speed = cfg.speed;
        this.spacing = cfg.spacing;
        this.topHeight = Math.random() * (h - this.spacing - 120) + 60;
        
        // Vertical Movement logic
        this.vSpeed = cfg.verticalSpeed || 0;
        this.direction = Math.random() > 0.5 ? 1 : -1; // Random start direction
    }

    update(h) {
        // Move left
        this.x -= this.speed;

        // Move vertically (The "Moving Obstacle" part)
        if (this.vSpeed > 0) {
            this.topHeight += this.vSpeed * this.direction;

            // Bounce logic: if pipe gap hits the edges, reverse direction
            if (this.topHeight <= 20 || this.topHeight + this.spacing >= h - 20) {
                this.direction *= -1;
            }
        }
    }

    draw(ctx, h) {
        ctx.fillStyle = "#1a1a1e"; 
        ctx.strokeStyle = "#444"; 
        ctx.lineWidth = 2;

        // Top Pipe
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        ctx.strokeRect(this.x, 0, this.width, this.topHeight);

        // Bottom Pipe
        const bY = this.topHeight + this.spacing;
        ctx.fillRect(this.x, bY, this.width, h - bY);
        ctx.strokeRect(this.x, bY, this.width, h - bY);
    }
};