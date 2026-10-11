import "./styles/style.css";
import { NetworkClient } from "./protocol/NetworkClient";
import { GameEngine } from "./engine/GameEngine";
import { LoginView } from "./ui/LoginView";
import { CharacterSelectView } from "./ui/CharacterSelectView";
import { HudView } from "./ui/HudView";
import { FlashPlayerModal } from "./ui/FlashPlayerModal";
import { PacketTypes, CharacterInfo } from "./protocol/PacketTypes";
import { BitReader } from "./protocol/BitReader";

class App {
  private net: NetworkClient;
  private engine: GameEngine;
  private loginView: LoginView;
  private charSelectView: CharacterSelectView;
  private hudView: HudView;
  private flashModal: FlashPlayerModal;
  private uiContainer: HTMLElement;
  private modalContainer: HTMLElement;

  constructor() {
    const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
    this.uiContainer = document.getElementById("ui-container")!;
    this.modalContainer = document.getElementById("modal-container")!;

    this.net = new NetworkClient();
    this.engine = new GameEngine(canvas, this.net);

    this.loginView = new LoginView(this.uiContainer, this.net);
    this.charSelectView = new CharacterSelectView(this.uiContainer, this.net);
    this.hudView = new HudView(this.uiContainer, this.engine);
    this.flashModal = new FlashPlayerModal(this.modalContainer);

    this.init();
  }

  private async init(): Promise<void> {
    // Show login view immediately
    this.loginView.render();

    // Connect to WebSocket gateway
    try {
      await this.net.connect();
    } catch (e) {
      console.warn("[App] Gateway connection deferred or pending:", e);
    }

    // Handle Login Response (0x13)
    this.net.on(PacketTypes.LOGIN_CHARACTER_LIST, (_pktId, _data, reader) => {
      this.handleLoginResult(reader);
    });

    // Handle Enter World (0x19)
    this.net.on(PacketTypes.ENTER_WORLD, () => {
      this.launchGame();
    });

    // Handle Public Chat (0x40) & Status (0x44)
    this.net.on(PacketTypes.CHAT_PUBLIC, (_id, _data, reader) => {
      try {
        const msg = reader.read_method_26();
        this.hudView.addChatMessage("World", msg, "world");
      } catch (e) {}
    });

    this.net.on(PacketTypes.CHAT_STATUS, (_id, _data, reader) => {
      try {
        const msg = reader.read_method_26();
        this.hudView.addChatMessage("System", msg, "system");
      } catch (e) {}
    });

    // Toggle Flash Mode
    this.charSelectView.onCharacterChosen = (char: CharacterInfo) => {
      this.engine.entities.player.name = char.name;
      this.engine.entities.player.type = char.class;
    };
  }

  private handleLoginResult(reader: BitReader): void {
    const characters: CharacterInfo[] = [];
    try {
      const charCount = reader.read_method_6(4);
      for (let i = 0; i < charCount; i++) {
        const name = reader.read_method_26();
        const className = reader.read_method_26();
        const gender = reader.read_method_26();
        const level = reader.read_method_9();

        characters.push({
          name,
          class: className,
          gender,
          level: Math.max(1, level),
        });
      }
    } catch (e) {
      console.warn("[App] Character list reading notice:", e);
    }

    this.loginView.hide();
    this.charSelectView.render(characters);
  }

  private launchGame(): void {
    this.charSelectView.hide();
    this.hudView.render();
    this.engine.start();

    // Bind Flash mode toggle button
    const flashBtn = document.getElementById("toggle-flash-mode-btn");
    if (flashBtn) {
      flashBtn.onclick = () => {
        this.flashModal.show();
      };
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new App();
});
