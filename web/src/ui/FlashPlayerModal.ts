export class FlashPlayerModal {
  private container: HTMLElement;
  public onClose?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public show(): void {
    this.container.innerHTML = `
      <div class="flash-modal-overlay">
        <div class="flash-header">
          <div class="flash-title">
            <span>🏛️ DUNGEON BLITZ • CLASSIC FLASH WEBASSEMBLY (RUFFLE)</span>
          </div>
          <div class="flash-actions">
            <a href="/p/cbv/DungeonBlitz.swf?fv=cbq&gv=cbv" target="_blank" class="download-btn">⬇ Open Direct SWF</a>
            <button id="close-flash-btn" class="close-btn">✖ Return to Modern Client</button>
          </div>
        </div>
        <div id="ruffle-container" class="ruffle-container">
          <div id="ruffle-loading" class="ruffle-loading">
            <div class="spinner"></div>
            <p>Initializing WebAssembly Flash Engine (Ruffle)...</p>
          </div>
        </div>
      </div>
    `;

    const closeBtn = document.getElementById("close-flash-btn") as HTMLButtonElement;
    closeBtn.onclick = () => {
      this.hide();
      if (this.onClose) this.onClose();
    };

    this.mountRuffle();
  }

  private mountRuffle(): void {
    const swfUrl = "/p/cbv/DungeonBlitz.swf?fv=cbq&gv=cbv";

    // Load Ruffle JS if not loaded
    if (!(window as any).RufflePlayer) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@ruffle-rs/ruffle";
      script.onload = () => this.injectPlayer(swfUrl);
      script.onerror = () => {
        const loading = document.getElementById("ruffle-loading");
        if (loading) {
          loading.innerHTML = `
            <p style="color: #e74c3c;">Failed to load online Ruffle Wasm script.</p>
            <p>You can still open the SWF directly in Flash Projector at: <a href="${swfUrl}" style="color: #3498db;">${swfUrl}</a></p>
          `;
        }
      };
      document.head.appendChild(script);
    } else {
      this.injectPlayer(swfUrl);
    }
  }

  private injectPlayer(swfUrl: string): void {
    const ruffleContainer = document.getElementById("ruffle-container");
    if (!ruffleContainer) return;

    try {
      const ruffle = (window as any).RufflePlayer.newest();
      const player = ruffle.createPlayer();
      player.style.width = "100%";
      player.style.height = "100%";

      ruffleContainer.innerHTML = "";
      ruffleContainer.appendChild(player);

      player.load({
        url: swfUrl,
        parameters: { fv: "cbq", gv: "cbv" },
        allowScriptAccess: true,
        letterbox: "on",
      });
    } catch (e) {
      console.error("Error creating Ruffle player:", e);
    }
  }

  public hide(): void {
    this.container.innerHTML = "";
  }
}
