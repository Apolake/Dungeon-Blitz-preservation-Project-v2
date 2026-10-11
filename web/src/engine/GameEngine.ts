import { NetworkClient } from "../protocol/NetworkClient";
import { Renderer2D } from "./Renderer2D";
import { InputManager } from "./InputManager";
import { EntityManager } from "./EntityManager";
import { PacketTypes } from "../protocol/PacketTypes";

export class GameEngine {
  public net: NetworkClient;
  public renderer: Renderer2D;
  public input: InputManager;
  public entities: EntityManager;
  public isRunning: boolean = false;
  private lastSyncTime: number = 0;
  public currentLevel: string = "CraftTown";
  public gold: number = 100;
  public idols: number = 15;
  public mp: number = 200;
  public maxMp: number = 200;
  public xp: number = 120;
  public maxXp: number = 500;
  private attackCooldown: number = 0;

  constructor(canvas: HTMLCanvasElement, net: NetworkClient) {
    this.net = net;
    this.renderer = new Renderer2D(canvas);
    this.input = new InputManager();
    this.entities = new EntityManager();

    // Hook network packets
    this.net.on(PacketTypes.ENTITY_DATA, (id, data, reader) => {
      this.entities.handleEntityPacket(id, reader);
    });
    this.net.on(PacketTypes.ENTITY_INCREMENTAL_UPDATE, (id, data, reader) => {
      this.entities.handleEntityPacket(id, reader);
    });
  }

  public start(): void {
    this.isRunning = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(timestamp: number): void {
    if (!this.isRunning) return;

    this.update();
    this.renderer.render(
      this.entities.player,
      this.entities.getAll(),
      this.currentLevel
    );

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(): void {
    const p = this.entities.player;
    const inp = this.input;

    // Horizontal Movement
    const speed = 5.0;
    if (inp.left && !inp.right) {
      p.vx = -speed;
      p.facingLeft = true;
    } else if (inp.right && !inp.left) {
      p.vx = speed;
      p.facingLeft = false;
    } else {
      p.vx *= 0.7; // friction
    }

    p.x += p.vx;

    // Gravity & Vertical Movement
    p.vy += 0.65;
    p.y += p.vy;

    // Platform & Floor Collisions
    const floorY = 450;
    let onGround = false;

    // Check Ground Floor
    if (p.y >= floorY) {
      p.y = floorY;
      p.vy = 0;
      onGround = true;
    }

    // Check Elevated Platforms
    const platforms = [
      { x: 200, y: 340, w: 220 },
      { x: 550, y: 260, w: 260 },
      { x: 900, y: 320, w: 200 },
      { x: -300, y: 320, w: 220 },
    ];

    for (const plat of platforms) {
      if (
        p.x >= plat.x &&
        p.x <= plat.x + plat.w &&
        p.y >= plat.y &&
        p.y - p.vy <= plat.y + 12 &&
        p.vy >= 0
      ) {
        p.y = plat.y;
        p.vy = 0;
        onGround = true;
      }
    }

    // Jump
    if (inp.jump && onGround) {
      p.vy = -13.5;
    }

    // Combat & Attack
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }

    if (inp.skill1 && this.attackCooldown === 0) {
      this.attackCooldown = 20; // 3 attacks per second
      this.executePlayerAttack();
    }

    // Potion Use
    if (inp.potion && p.hp < p.maxHp) {
      inp.potion = false;
      const heal = 150;
      p.hp = Math.min(p.maxHp, p.hp + heal);
      this.renderer.addFloatingText(`+${heal} HP`, p.x, p.y - 60, "#2ecc71");
    }

    // Network Sync: send position to server every 80ms
    const now = performance.now();
    if (now - this.lastSyncTime > 80 && this.net.isConnected) {
      this.lastSyncTime = now;
      if (Math.abs(p.vx) > 0.05 || Math.abs(p.vy) > 0.05) {
        this.net.sendMovement(p.x, p.y, p.vx, p.vy, p.facingLeft);
      }
    }
  }

  private executePlayerAttack(): void {
    const p = this.entities.player;
    // Hit check against nearby monsters
    for (const ent of this.entities.getAll()) {
      if (ent.isMonster) {
        const dx = ent.x - p.x;
        const dy = ent.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Within 110px range in front of player
        const inFront = p.facingLeft ? dx < 0 : dx > 0;
        if (dist < 110 && inFront) {
          const dmg = Math.floor(45 + Math.random() * 35);
          ent.hp = Math.max(0, ent.hp - dmg);
          ent.vx = p.facingLeft ? -4 : 4;
          this.renderer.addFloatingText(`-${dmg}`, ent.x, ent.y - 50, "#ff4757");

          // Monster death
          if (ent.hp <= 0) {
            this.renderer.addFloatingText(`+85 XP`, ent.x, ent.y - 70, "#fbc531");
            this.xp += 85;
            this.gold += 12;
            if (this.xp >= this.maxXp) {
              p.level++;
              this.xp = 0;
              this.maxXp = Math.floor(this.maxXp * 1.5);
              p.maxHp += 80;
              p.hp = p.maxHp;
              this.renderer.addFloatingText(`LEVEL UP! Lv.${p.level}`, p.x, p.y - 90, "#00d2d3");
            }
            // Respawn dummy after 3 seconds
            setTimeout(() => {
              ent.hp = ent.maxHp;
              ent.x = 750;
              ent.y = 450;
            }, 3000);
          }
          break;
        }
      }
    }
  }
}
