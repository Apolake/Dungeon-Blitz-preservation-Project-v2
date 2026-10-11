import { EntityState } from "../protocol/PacketTypes";

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
}

export class Renderer2D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private floatingTexts: FloatingText[] = [];
  public animTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  public resize(): void {
    this.canvas.width = this.canvas.parentElement?.clientWidth || window.innerWidth;
    this.canvas.height = this.canvas.parentElement?.clientHeight || window.innerHeight;
  }

  public addFloatingText(text: string, x: number, y: number, color: string = "#ffcc00"): void {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1.0,
      vy: -1.2,
    });
  }

  public render(
    player: EntityState,
    entities: EntityState[],
    levelName: string
  ): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    this.animTime += 0.03;

    // Smooth camera tracking on player
    const targetCamX = player.x - width / 2;
    const targetCamY = player.y - height / 2 - 50;
    this.cameraX += (targetCamX - this.cameraX) * 0.1;
    this.cameraY += (targetCamY - this.cameraY) * 0.1;

    // 1. Background Sky & Castle Parallax
    this.renderBackground(width, height, levelName);

    ctx.save();
    ctx.translate(-this.cameraX, -this.cameraY);

    // 2. Render Platforms & Floor
    this.renderEnvironment(levelName);

    // 3. Render Entities (NPCs, Monsters, Other Players)
    for (const ent of entities) {
      this.renderEntity(ent);
    }

    // 4. Render Main Player
    this.renderPlayer(player);

    // 5. Render Floating Combat Text
    this.renderFloatingText();

    ctx.restore();
  }

  private renderBackground(width: number, height: number, levelName: string): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    if (levelName.toLowerCase().includes("dungeon") || levelName.toLowerCase().includes("crypt")) {
      grad.addColorStop(0, "#0b0c10");
      grad.addColorStop(0.5, "#1f2833");
      grad.addColorStop(1, "#121820");
    } else {
      grad.addColorStop(0, "#1a2a44");
      grad.addColorStop(0.5, "#2a3d58");
      grad.addColorStop(1, "#443a32");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Distant mountain / tower silhouettes (parallax factor 0.2)
    const parallaxX = -(this.cameraX * 0.15) % width;
    ctx.fillStyle = "rgba(10, 15, 25, 0.4)";
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = -width; x < width * 2; x += 120) {
      ctx.lineTo(x + parallaxX, height - 160 - Math.sin((x + 100) * 0.02) * 50);
      ctx.lineTo(x + 60 + parallaxX, height - 200 - Math.sin(x * 0.02) * 40);
    }
    ctx.lineTo(width * 2, height);
    ctx.closePath();
    ctx.fill();
  }

  private renderEnvironment(levelName: string): void {
    const ctx = this.ctx;

    // Main ground floor at y = 450
    const floorY = 450;
    ctx.fillStyle = "#2c2621";
    ctx.fillRect(-2000, floorY, 6000, 500);

    // Stone trim border
    ctx.fillStyle = "#4a423b";
    ctx.fillRect(-2000, floorY, 6000, 12);

    // Stone slabs detailing
    ctx.strokeStyle = "#38312b";
    ctx.lineWidth = 2;
    for (let x = -2000; x < 4000; x += 80) {
      ctx.strokeRect(x, floorY + 12, 78, 30);
    }

    // Platforms
    this.renderPlatform(200, 340, 220, 20);
    this.renderPlatform(550, 260, 260, 20);
    this.renderPlatform(900, 320, 200, 20);
    this.renderPlatform(-300, 320, 220, 20);

    // Level Portals / Doors
    this.renderPortal(50, floorY - 110, "Port CraftTown", "#33ccff");
    this.renderPortal(1100, floorY - 110, "Newbie Road", "#ffaa33");
  }

  private renderPlatform(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#3e3731";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#5a5048";
    ctx.fillRect(x, y, w, 4);
    ctx.strokeStyle = "#25211d";
    ctx.strokeRect(x, y, w, h);
  }

  private renderPortal(x: number, y: number, label: string, glowColor: string): void {
    const ctx = this.ctx;
    const pulse = Math.sin(this.animTime * 3) * 6;

    // Glowing Arch
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = "rgba(20, 25, 40, 0.8)";
    ctx.beginPath();
    ctx.arc(x + 40, y + 40, 36 + pulse * 0.2, Math.PI, 0, false);
    ctx.lineTo(x + 76, y + 110);
    ctx.lineTo(x + 4, y + 110);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Portal runes text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + 40, y - 10);
    ctx.restore();
  }

  private renderPlayer(p: EntityState): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.facingLeft) {
      ctx.scale(-1, 1);
    }

    const isMoving = Math.abs(p.vx) > 0.5;
    const walkBob = isMoving ? Math.sin(this.animTime * 12) * 4 : Math.sin(this.animTime * 3) * 1.5;
    const legSwing = isMoving ? Math.sin(this.animTime * 12) * 12 : 0;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(-8, -22 + walkBob, 6, 22 + legSwing * 0.3);
    ctx.fillRect(2, -22 + walkBob, 6, 22 - legSwing * 0.3);

    // Torso / Armor
    const torsoColor = p.type.toLowerCase().includes("paladin")
      ? "#95a5a6"
      : p.type.toLowerCase().includes("mage")
      ? "#8e44ad"
      : "#27ae60";
    ctx.fillStyle = torsoColor;
    ctx.fillRect(-12, -48 + walkBob, 24, 28);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-12, -48 + walkBob, 24, 28);

    // Head
    ctx.fillStyle = "#f1c40f"; // Hair/Helm
    ctx.beginPath();
    ctx.arc(0, -58 + walkBob, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Weapon
    if (p.type.toLowerCase().includes("paladin")) {
      // Shield
      ctx.fillStyle = "#bdc3c7";
      ctx.fillRect(-16, -42 + walkBob, 8, 18);
      // Sword
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(12, -54 + walkBob, 4, 32);
    } else if (p.type.toLowerCase().includes("mage")) {
      // Staff
      ctx.fillStyle = "#795548";
      ctx.fillRect(14, -65 + walkBob, 4, 45);
      // Orb glow
      ctx.fillStyle = "#00e5ff";
      ctx.beginPath();
      ctx.arc(16, -68 + walkBob, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Rogue Daggers
      ctx.fillStyle = "#bdc3c7";
      ctx.fillRect(10, -36 + walkBob, 3, 16);
      ctx.fillRect(-14, -36 + walkBob, 3, 16);
    }

    ctx.restore();

    // Name & HP Bar over player head (not flipped)
    this.renderEntityOverhead(p.x, p.y - 78, p.name, p.hp, p.maxHp, p.level, "#4cd137");
  }

  private renderEntity(ent: EntityState): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(ent.x, ent.y);
    if (ent.facingLeft) {
      ctx.scale(-1, 1);
    }

    const walkBob = Math.sin(this.animTime * 4 + ent.id) * 2;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (ent.isMonster) {
      // Red Monster / Goblin / Skeleton
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(-12, -42 + walkBob, 24, 26);
      ctx.fillStyle = "#962d22";
      ctx.beginPath();
      ctx.arc(0, -52 + walkBob, 10, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // NPC
      ctx.fillStyle = "#f39c12";
      ctx.fillRect(-10, -44 + walkBob, 20, 26);
      ctx.fillStyle = "#d35400";
      ctx.beginPath();
      ctx.arc(0, -54 + walkBob, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    const nameColor = ent.isMonster ? "#e74c3c" : "#f1c40f";
    this.renderEntityOverhead(ent.x, ent.y - 72, ent.name, ent.hp, ent.maxHp, ent.level, nameColor);
  }

  private renderEntityOverhead(
    x: number,
    y: number,
    name: string,
    hp: number,
    maxHp: number,
    level: number,
    color: string
  ): void {
    const ctx = this.ctx;
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    ctx.fillText(`Lv.${level || 1} ${name}`, x, y);
    ctx.shadowBlur = 0;

    // HP Bar
    const barW = 44;
    const barH = 5;
    const hpRatio = Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 1));
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x - barW / 2, y + 4, barW, barH);
    ctx.fillStyle = hpRatio > 0.3 ? "#2ecc71" : "#e74c3c";
    ctx.fillRect(x - barW / 2, y + 4, barW * hpRatio, barH);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - barW / 2, y + 4, barW, barH);
  }

  private renderFloatingText(): void {
    const ctx = this.ctx;
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 0.018;

      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}
