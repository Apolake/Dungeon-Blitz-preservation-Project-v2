import { NetworkClient } from "../protocol/NetworkClient";

export class LoginView {
  private container: HTMLElement;
  private net: NetworkClient;
  public onLoginSuccess?: () => void;

  constructor(container: HTMLElement, net: NetworkClient) {
    this.container = container;
    this.net = net;
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="auth-overlay">
        <div class="auth-modal">
          <div class="modal-header">
            <div class="game-logo">⚔️ DUNGEON BLITZ</div>
            <div class="badge-tag">WEB REVIVAL</div>
          </div>

          <div class="server-status">
            <span class="status-dot ${this.net.isConnected ? "online" : "offline"}"></span>
            <span>Server: ${this.net.isConnected ? "Online & Ready" : "Connecting to Gateway..."}</span>
          </div>

          <div class="auth-tabs">
            <button id="tab-login" class="tab-btn active">Sign In</button>
            <button id="tab-register" class="tab-btn">Create Account</button>
          </div>

          <form id="auth-form" class="auth-form">
            <div class="form-group">
              <label for="auth-email">Account Email</label>
              <input type="email" id="auth-email" placeholder="hero@dungeonblitz.com" value="hero@dungeonblitz.com" required autocomplete="username" />
            </div>

            <div class="form-group">
              <label for="auth-pass">Password</label>
              <input type="password" id="auth-pass" placeholder="••••••••" value="password123" required autocomplete="current-password" />
            </div>

            <button type="submit" id="auth-submit-btn" class="primary-btn">
              Enter The Realm
            </button>
          </form>

          <div class="auth-footer">
            <button id="quick-demo-btn" class="secondary-btn">⚡ Instant Guest Play</button>
            <p class="archival-notice">Preservation Project • Modern HTML5 / WebAssembly Architecture</p>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    let mode: "login" | "register" = "login";
    const tabLogin = document.getElementById("tab-login") as HTMLButtonElement;
    const tabReg = document.getElementById("tab-register") as HTMLButtonElement;
    const submitBtn = document.getElementById("auth-submit-btn") as HTMLButtonElement;
    const form = document.getElementById("auth-form") as HTMLFormElement;
    const demoBtn = document.getElementById("quick-demo-btn") as HTMLButtonElement;

    tabLogin.onclick = () => {
      mode = "login";
      tabLogin.classList.add("active");
      tabReg.classList.remove("active");
      submitBtn.textContent = "Enter The Realm";
    };

    tabReg.onclick = () => {
      mode = "register";
      tabReg.classList.add("active");
      tabLogin.classList.remove("active");
      submitBtn.textContent = "Register & Play";
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      const email = (document.getElementById("auth-email") as HTMLInputElement).value;
      const pass = (document.getElementById("auth-pass") as HTMLInputElement).value;

      if (mode === "login") {
        this.net.login(email, pass);
      } else {
        this.net.register(email, pass);
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Connecting to World...";
    };

    demoBtn.onclick = () => {
      const randomUser = `adventurer_${Math.floor(Math.random() * 9000 + 1000)}@dungeonblitz.com`;
      this.net.register(randomUser, "demo123");
      demoBtn.disabled = true;
      demoBtn.textContent = "Spawning Guest...";
    };
  }

  public hide(): void {
    this.container.innerHTML = "";
  }
}
