export const PacketTypes = {
  GAMESERVER_LOGIN: 0x1F,
  LOGIN_VERSION: 0x11,
  LOGIN_CHALLENGE: 0x12,
  LOGIN_CREATE: 0x13,
  LOGIN_AUTHENTICATE: 0x14,
  LOGIN_CHARACTER_LIST: 0x15,
  CHARACTER_SELECT: 0x16,
  CHARACTER_CREATE: 0x17,
  ENTER_WORLD: 0x21,
  PAPERDOLL: 0x1A,
  POPUP: 0x1B,
  ENTITY_DATA: 0x20,
  ENTITY_INCREMENTAL_UPDATE: 0x21,
  POWER_USE: 0x22,
  POWER_HIT: 0x24,
  RESPAWN: 0x28,
  CHAT_PUBLIC: 0x40,
  CHAT_STATUS: 0x44,
  CHAT_PRIVATE: 0x47,
  GOLD_UPDATE: 0x35,
  RECEIVE_REWARD: 0x2B,
  TALENT_CLAIM: 0xD6,
} as const;

export interface CharacterInfo {
  name: string;
  class: string;
  gender: string;
  level: number;
  gold?: number;
  headSet?: string;
  hairSet?: string;
  mouthSet?: string;
  faceSet?: string;
  hairColor?: number;
  skinColor?: number;
  shirtColor?: number;
  pantColor?: number;
  CurrentLevel?: {
    name: string;
    x: number;
    y: number;
  };
}

export interface EntityState {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facingLeft: boolean;
  isPlayer: boolean;
  isMonster: boolean;
  level: number;
}
