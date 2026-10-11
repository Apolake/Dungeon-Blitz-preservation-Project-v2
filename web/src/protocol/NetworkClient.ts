import { BitBuffer } from "./BitBuffer";
import { BitReader } from "./BitReader";
import { PacketTypes, CharacterInfo } from "./PacketTypes";

export type PacketCallback = (pktId: number, data: Uint8Array, reader: BitReader) => void;

export class NetworkClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<number, PacketCallback[]> = new Map();
  private anyListeners: PacketCallback[] = [];
  public isConnected: boolean = false;
  public challenge: string = "";
  public transferToken: number = 0;
  public currentLevel: string = "CraftTown";

  constructor(url?: string) {
    if (url) {
      this.url = url;
    } else {
      const loc = window.location;
      const proto = loc.protocol === "https:" ? "wss:" : "ws:";
      const host = loc.hostname;
      const port = loc.port ? loc.port : (loc.protocol === "https:" ? "443" : "80");
      // If dev server on 3000, connect to backend port 8080 or use vite proxy /ws
      if (port === "3000") {
        this.url = `${proto}//${host}:8090/ws`;
      } else {
        this.url = `${proto}//${loc.host}/ws`;
      }
    }
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[Net] Connecting to ${this.url}...`);
        this.ws = new WebSocket(this.url);
        this.ws.binaryType = "arraybuffer";

        this.ws.onopen = () => {
          this.isConnected = true;
          console.log("[Net] Connected to Dungeon Blitz WebSocket Gateway");
          this.sendVersionHandshake();
          resolve();
        };

        this.ws.onmessage = (event: MessageEvent) => {
          if (event.data instanceof ArrayBuffer) {
            this.handleBinaryMessage(new Uint8Array(event.data));
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log("[Net] Disconnected from server");
        };

        this.ws.onerror = (err) => {
          console.error("[Net] WebSocket Error:", err);
          reject(err);
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  public on(pktId: number, callback: PacketCallback): void {
    if (!this.listeners.has(pktId)) {
      this.listeners.set(pktId, []);
    }
    this.listeners.get(pktId)!.push(callback);
  }

  public onAny(callback: PacketCallback): void {
    this.anyListeners.push(callback);
  }

  private handleBinaryMessage(bytes: Uint8Array): void {
    let offset = 0;
    while (offset + 4 <= bytes.length) {
      const pktId = (bytes[offset] << 8) | bytes[offset + 1];
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      const total = 4 + length;
      if (offset + total > bytes.length) {
        break;
      }
      const payload = bytes.slice(offset + 4, offset + total);
      offset += total;

      const reader = new BitReader(payload);

      // Handle specific packets internally
      if (pktId === PacketTypes.LOGIN_CHALLENGE) {
        this.handleVersionChallenge(reader);
      } else if (pktId === PacketTypes.ENTER_WORLD) {
        this.handleEnterWorld(reader);
      }

      // Notify listeners
      for (const listener of this.anyListeners) {
        listener(pktId, payload, new BitReader(payload));
      }
      const callbacks = this.listeners.get(pktId);
      if (callbacks) {
        for (const cb of callbacks) {
          cb(pktId, payload, new BitReader(payload));
        }
      }
    }
  }

  private handleVersionChallenge(reader: BitReader): void {
    try {
      this.challenge = reader.read_method_26();
      console.log(`[Net] Received login challenge: ${this.challenge}`);
    } catch (e) {
      console.warn("[Net] Failed to read version challenge", e);
    }
  }

  private handleEnterWorld(reader: BitReader): void {
    try {
      this.transferToken = reader.read_method_20(16);
      reader.read_method_9(); // old level id
      reader.read_method_26(); // old swf
      const hasOldCoord = reader.read_method_15();
      if (hasOldCoord) {
        reader.read_method_20(16);
        reader.read_method_20(16);
      }
      reader.read_method_26(); // host
      reader.read_method_20(16); // port
      reader.read_method_26(); // new level swf
      reader.read_method_20(16); // map lvl
      reader.read_method_20(16); // base lvl
      this.currentLevel = reader.read_method_26(); // internal level name
      console.log(`[Net] Entering level ${this.currentLevel} (Token: ${this.transferToken})`);

      // Immediately send game server login to spawn player
      this.sendGameServerLogin(this.transferToken);
    } catch (e) {
      console.warn("[Net] Error parsing enter world packet", e);
    }
  }

  public sendPacket(buf: BitBuffer, pktId: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[Net] Cannot send packet: WebSocket is closed");
      return;
    }
    const packet = buf.toPacket(pktId);
    this.ws.send(packet);
  }

  public sendVersionHandshake(): void {
    const buf = new BitBuffer();
    buf.write_method_9(200); // client version
    this.sendPacket(buf, PacketTypes.LOGIN_VERSION);
  }

  public login(email: string, pass: string): void {
    const buf = new BitBuffer();
    buf.write_method_26(""); // facebook id
    buf.write_method_26(""); // kongregate id
    buf.write_method_26(email.trim().toLowerCase());
    buf.write_method_26(pass);
    buf.write_method_26(""); // legacy auth key
    this.sendPacket(buf, PacketTypes.LOGIN_AUTHENTICATE);
  }

  public register(email: string, pass: string): void {
    const buf = new BitBuffer();
    buf.write_method_26(""); // facebook id
    buf.write_method_26(""); // kongregate id
    buf.write_method_26(email.trim().toLowerCase());
    buf.write_method_26(pass);
    buf.write_method_26(""); // legacy auth key
    this.sendPacket(buf, PacketTypes.LOGIN_CREATE);
  }

  public selectCharacter(name: string): void {
    const buf = new BitBuffer();
    buf.write_method_26(name);
    this.sendPacket(buf, PacketTypes.CHARACTER_SELECT);
  }

  public createCharacter(info: {
    name: string;
    className: string;
    gender: string;
    head: string;
    hair: string;
    mouth: string;
    face: string;
    hairColor: number;
    skinColor: number;
    shirtColor: number;
    pantColor: number;
  }): void {
    const buf = new BitBuffer();
    buf.write_method_26(info.name);
    buf.write_method_26(info.className);
    buf.write_method_26(info.gender);
    buf.write_method_26(info.head);
    buf.write_method_26(info.hair);
    buf.write_method_26(info.mouth);
    buf.write_method_26(info.face);
    buf.write_method_20(24, info.hairColor);
    buf.write_method_20(24, info.skinColor);
    buf.write_method_20(24, info.shirtColor);
    buf.write_method_20(24, info.pantColor);
    this.sendPacket(buf, PacketTypes.CHARACTER_CREATE);
  }

  public sendGameServerLogin(token: number): void {
    const buf = new BitBuffer();
    buf.write_method_9(token);
    buf.write_method_26("");
    buf.write_method_15(false);
    this.sendPacket(buf, PacketTypes.GAMESERVER_LOGIN);
  }

  public sendChat(message: string): void {
    const buf = new BitBuffer();
    buf.write_method_26(message);
    this.sendPacket(buf, PacketTypes.CHAT_PUBLIC);
  }

  public sendMovement(x: number, y: number, vx: number, vy: number, facingLeft: boolean): void {
    const buf = new BitBuffer();
    buf.write_method_9(this.transferToken);
    buf.write_method_4(Math.round(x));
    buf.write_method_4(Math.round(y));
    buf.write_method_45(Math.round(vx));
    buf.write_method_45(Math.round(vy));
    buf.write_method_15(facingLeft);
    this.sendPacket(buf, PacketTypes.ENTITY_INCREMENTAL_UPDATE);
  }
}
