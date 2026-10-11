import { GameEngine } from "../engine/GameEngine";

export class HudView {
  private container: HTMLElement;
  private engine: GameEngine;
  private chatMessages: Array<{ sender: string; text: string; channel: string }> = [];

  constructor(container: HTMLElement, engine: GameEngine) {
    this.container = container;
    this.engine = engine;
  }

  public render(): void {
    const p = this.engine.entities.player;

    this.container.innerHTML = `
      <div class="hud-layer">
        <!-- Top Left: Player Status Bar -->
        <div class="hud-player-frame">
          <div class="portrait-box ${p.type.toLowerCase()}">
            <span class="player-lvl" id="hud-level">${p.level}</span>
          </div>
          <div class="bars-container">
            <div class="player-name-row">
              <span id="hud-name">${p.name}</span>
              <span class="class-tag" id="hud-class">${p.type}</span>
            </div>
            <!-- HP Bar -->
            <div class="bar hp-bar">
              <div class="bar-fill" id="hud-hp-fill" style="width: 100%;"></div>
              <span class="bar-text" id="hud-hp-text">${p.hp} / ${p.maxHp}</span>
            </div>
            <!-- MP Bar -->
            <div class="bar mp-bar">
              <div class="bar-fill" id="hud-mp-fill" style="width: 100%;"></div>
              <span class="bar-text" id="hud-mp-text">${this.engine.mp} / ${this.engine.maxMp}</span>
            </div>
          </div>
        </div>

        <!-- Top Right: Currencies & Mode Toggle -->
        <div class="hud-top-right">
          <div class="currency-pill">
            <span class="coin-icon gold">🪙</span>
            <span id="hud-gold">${this.engine.gold}</span>
          </div>
          <div class="currency-pill">
            <span class="coin-icon idols">🦣</span>
            <span id="hud-idols">${this.engine.idols}</span>
          </div>
          <button id="toggle-flash-mode-btn" class="mode-pill-btn" title="Switch to Classic Flash Projector (Wasm Ruffle)">
            🏛️ Flash (Wasm)
          </button>
          <button id="btn-fullscreen" class="icon-btn" title="Toggle Fullscreen">⛶</button>
        </div>

        <!-- Bottom Center: Skill / Action Bar -->
        <div class="hud-action-bar">
          <div class="skill-slot" data-key="1">
            <span class="skill-key">1</span>
            <div class="skill-icon attack-icon">⚔️</div>
            <span class="skill-name">Strike</span>
          </div>
          <div class="skill-slot" data-key="2">
            <span class="skill-key">2</span>
            <div class="skill-icon whirlwind-icon">🌪️</div>
            <span class="skill-name">Whirl</span>
          </div>
          <div class="skill-slot" data-key="3">
            <span class="skill-key">3</span>
            <div class="skill-icon bash-icon">🛡️</div>
            <span class="skill-name">Slam</span>
          </div>
          <div class="skill-slot" data-key="4">
            <span class="skill-key">4</span>
            <div class="skill-icon blast-icon">💥</div>
            <span class="skill-name">Burst</span>
          </div>
          <div class="skill-slot potion-slot" data-key="P">
            <span class="skill-key">P</span>
            <div class="skill-icon potion-icon">🧪</div>
            <span class="skill-name">Potion</span>
          </div>
        </div>

        <!-- Bottom Left: Chat Box -->
        <div class="hud-chat-box">
          <div class="chat-tabs">
            <button class="chat-tab active">All</button>
            <button class="chat-tab">World</button>
            <button class="chat-tab">Guild</button>
          </div>
          <div class="chat-log" id="chat-log">
            <div class="chat-msg system">⚔️ Welcome to Dungeon Blitz Web Revival!</div>
            <div class="chat-msg system">💡 Use A/D or Arrow keys to move, Space to Jump, 1 to Attack.</div>
          </div>
          <form id="chat-form" class="chat-input-row">
            <input type="text" id="chat-input" placeholder="Press Enter to chat..." autocomplete="off" />
            <button type="submit" id="chat-send-btn">Send</button>
          </form>
        </div>

        <!-- Bottom XP Bar -->
        <div class="hud-xp-bar">
          <div class="xp-fill" id="hud-xp-fill" style="width: 24%;"></div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.startHudTicker();
  }

  private bindEvents(): void {
    const chatForm = document.getElementById("chat-form") as HTMLFormElement;
    const chatInput = document.getElementById("chat-input") as HTMLInputElement;

    chatInput.onfocus = () => {
      this.engine.input.isChatFocused = true;
    };
    chatInput.onblur = () => {
      this.engine.input.isChatFocused = false;
    };

    chatForm.onsubmit = (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (text) {
        this.engine.net.sendChat(text);
        this.addChatMessage(this.engine.entities.player.name, text, "all");
        chatInput.value = "";
      }
      chatInput.blur();
    };

    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (document.activeElement !== chatInput) {
          chatInput.focus();
        }
      }
    });

    const fsBtn = document.getElementById("btn-fullscreen") as HTMLButtonElement;
    fsBtn.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };
  }

  public addChatMessage(sender: string, text: string, channel: string = "all"): void {
    const log = document.getElementById("chat-log");
    if (!log) return;
    const msgEl = document.createElement("div");
    msgEl.className = `chat-msg ${channel}`;
    msgEl.innerHTML = `<span class="sender">[${sender}]:</span> <span class="content">${text}</span>`;
    log.appendChild(msgEl);
    log.scrollTop = log.scrollHeight;
  }

  private startHudTicker(): void {
    setInterval(() => {
      const p = this.engine.entities.player;
      const hpFill = document.getElementById("hud-hp-fill");
      const hpText = document.getElementById("hud-hp-text");
      const mpFill = document.getElementById("hud-mp-fill");
      const mpText = document.getElementById("hud-mp-text");
      const goldEl = document.getElementById("hud-gold");
      const idolsEl = document.getElementById("hud-idols");
      const xpFill = document.getElementById("hud-xp-fill");
      const lvlEl = document.getElementById("hud-level");

      if (hpFill && hpText) {
        const pct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
        hpFill.style.width = `${pct}%`;
        hpText.textContent = `${Math.round(p.hp)} / ${p.maxHp}`;
      }

      if (mpFill && mpText) {
        const pct = Math.max(0, Math.min(100, (this.engine.mp / this.engine.maxMp) * 100));
        mpFill.style.width = `${pct}%`;
        mpText.textContent = `${this.engine.mp} / ${this.engine.maxMp}`;
      }

      if (goldEl) goldEl.textContent = `${this.engine.gold}`;
      if (idolsEl) idolsEl.textContent = `${this.engine.idols}`;
      if (lvlEl) lvlEl.textContent = `${p.level}`;

      if (xpFill) {
        const pct = Math.max(0, Math.min(100, (this.engine.xp / this.engine.maxXp) * 100));
        xpFill.style.width = `${pct}%`;
      }
    }, 100);
  }
}
