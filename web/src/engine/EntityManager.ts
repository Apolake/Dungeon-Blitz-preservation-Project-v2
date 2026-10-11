import { EntityState, PacketTypes } from "../protocol/PacketTypes";
import { BitReader } from "../protocol/BitReader";

export class EntityManager {
  public player: EntityState = {
    id: 1,
    name: "Hero",
    type: "Paladin",
    x: 400,
    y: 450,
    vx: 0,
    vy: 0,
    hp: 500,
    maxHp: 500,
    facingLeft: false,
    isPlayer: true,
    isMonster: false,
    level: 1,
  };

  public entities: Map<number, EntityState> = new Map();

  constructor() {
    // Add default training dummy / NPC for immediate interaction
    this.entities.set(101, {
      id: 101,
      name: "Captain Douglas",
      type: "NPC",
      x: 350,
      y: 450,
      vx: 0,
      vy: 0,
      hp: 1000,
      maxHp: 1000,
      facingLeft: true,
      isPlayer: false,
      isMonster: false,
      level: 10,
    });

    this.entities.set(102, {
      id: 102,
      name: "Training Dummy",
      type: "Monster",
      x: 750,
      y: 450,
      vx: 0,
      vy: 0,
      hp: 250,
      maxHp: 250,
      facingLeft: true,
      isPlayer: false,
      isMonster: true,
      level: 1,
    });
  }

  public handleEntityPacket(pktId: number, reader: BitReader): void {
    try {
      if (pktId === PacketTypes.ENTITY_DATA) {
        const entId = reader.read_method_9();
        const entType = reader.read_method_26();
        const posX = reader.read_method_4();
        const posY = reader.read_method_4();

        if (entId !== this.player.id) {
          const isMonster = entType.toLowerCase().includes("monster") || entType.toLowerCase().includes("goblin") || entType.toLowerCase().includes("brute");
          this.entities.set(entId, {
            id: entId,
            name: entType,
            type: entType,
            x: posX,
            y: posY,
            vx: 0,
            vy: 0,
            hp: 200,
            maxHp: 200,
            facingLeft: false,
            isPlayer: false,
            isMonster,
            level: 1,
          });
        }
      } else if (pktId === PacketTypes.ENTITY_INCREMENTAL_UPDATE) {
        const entId = reader.read_method_9();
        const x = reader.read_method_4();
        const y = reader.read_method_4();
        const vx = reader.read_method_45();
        const vy = reader.read_method_45();
        const facingLeft = reader.read_method_15();

        const target = this.entities.get(entId);
        if (target) {
          target.x = x;
          target.y = y;
          target.vx = vx;
          target.vy = vy;
          target.facingLeft = facingLeft;
        }
      }
    } catch (e) {
      console.warn("[EntityManager] Error parsing entity packet", e);
    }
  }

  public getAll(): EntityState[] {
    return Array.from(this.entities.values());
  }
}
