import { NetworkClient } from "../protocol/NetworkClient";
import { CharacterInfo } from "../protocol/PacketTypes";

export class CharacterSelectView {
  private container: HTMLElement;
  private net: NetworkClient;
  public onCharacterChosen?: (char: CharacterInfo) => void;

  constructor(container: HTMLElement, net: NetworkClient) {
    this.container = container;
    this.net = net;
  }

  public render(characters: CharacterInfo[]): void {
    if (characters.length > 0) {
      this.renderList(characters);
    } else {
      this.renderCreate();
    }
  }

  public renderList(characters: CharacterInfo[]): void {
    const charsHtml = characters
      .map(
        (c, idx) => `
        <div class="char-card ${idx === 0 ? "selected" : ""}" data-name="${c.name}">
          <div class="char-avatar ${c.class.toLowerCase()}"></div>
          <div class="char-details">
            <div class="char-name">${c.name}</div>
            <div class="char-class-badge">Lv.${c.level || 1} ${c.class}</div>
            <div class="char-location">📍 ${c.CurrentLevel?.name || "CraftTown"}</div>
          </div>
          <button class="play-char-btn" data-name="${c.name}">Select</button>
        </div>
      `
      )
      .join("");

    this.container.innerHTML = `
      <div class="auth-overlay">
        <div class="auth-modal wide-modal">
          <div class="modal-header">
            <div class="game-logo">⚔️ CHOOSE YOUR HERO</div>
            <button id="create-new-char-btn" class="secondary-btn small-btn">+ Create New Hero</button>
          </div>

          <div class="char-grid">
            ${charsHtml}
          </div>

          <div class="auth-footer">
            <button id="enter-world-btn" class="primary-btn pulse-glow">Enter Dungeon Blitz</button>
          </div>
        </div>
      </div>
    `;

    let selectedName = characters[0]?.name || "";

    const cards = this.container.querySelectorAll(".char-card");
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        cards.forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        selectedName = card.getAttribute("data-name") || "";
      });
    });

    const enterBtn = document.getElementById("enter-world-btn") as HTMLButtonElement;
    enterBtn.onclick = () => {
      if (selectedName) {
        const found = characters.find((c) => c.name === selectedName);
        if (found && this.onCharacterChosen) {
          this.onCharacterChosen(found);
        }
        this.net.selectCharacter(selectedName);
        this.hide();
      }
    };

    const createBtn = document.getElementById("create-new-char-btn") as HTMLButtonElement;
    createBtn.onclick = () => this.renderCreate();
  }

  public renderCreate(): void {
    this.container.innerHTML = `
      <div class="auth-overlay">
        <div class="auth-modal wide-modal">
          <div class="modal-header">
            <div class="game-logo">⚔️ FORGE YOUR HERO</div>
            <p class="subtitle">Select your combat discipline and customize your appearance</p>
          </div>

          <div class="create-hero-layout">
            <div class="class-selection">
              <label>Select Discipline</label>
              <div class="class-cards">
                <div class="class-card selected" data-class="Paladin">
                  <div class="class-icon paladin">🛡️</div>
                  <div class="class-title">Paladin</div>
                  <div class="class-desc">Heavy armor, shields, sword mastery, and righteous defense.</div>
                </div>
                <div class="class-card" data-class="Rogue">
                  <div class="class-icon rogue">🗡️</div>
                  <div class="class-title">Rogue</div>
                  <div class="class-desc">High mobility, rapid dual daggers, and critical strikes.</div>
                </div>
                <div class="class-card" data-class="Mage">
                  <div class="class-icon mage">🔮</div>
                  <div class="class-title">Mage</div>
                  <div class="class-desc">Elemental devastation, arcane spells, and ranged area control.</div>
                </div>
              </div>
            </div>

            <div class="customization-panel">
              <div class="form-group">
                <label for="hero-name-input">Hero Name</label>
                <input type="text" id="hero-name-input" placeholder="Sir Lancelot" value="Hero_${Math.floor(Math.random() * 899 + 100)}" maxlength="16" required />
              </div>

              <div class="form-group">
                <label>Gender</label>
                <div class="gender-toggle">
                  <button type="button" class="gender-btn active" data-gender="male">Male</button>
                  <button type="button" class="gender-btn" data-gender="female">Female</button>
                </div>
              </div>

              <div class="color-pickers-row">
                <div class="color-picker-item">
                  <label>Hair Color</label>
                  <input type="color" id="hair-color-input" value="#e67e22" />
                </div>
                <div class="color-picker-item">
                  <label>Skin Tone</label>
                  <input type="color" id="skin-color-input" value="#f1c40f" />
                </div>
                <div class="color-picker-item">
                  <label>Tunic / Plate</label>
                  <input type="color" id="tunic-color-input" value="#3498db" />
                </div>
              </div>
            </div>
          </div>

          <div class="auth-footer">
            <button id="finish-create-btn" class="primary-btn">Begin Journey</button>
          </div>
        </div>
      </div>
    `;

    let selectedClass = "Paladin";
    let selectedGender = "male";

    const classCards = this.container.querySelectorAll(".class-card");
    classCards.forEach((c) => {
      c.addEventListener("click", () => {
        classCards.forEach((x) => x.classList.remove("selected"));
        c.classList.add("selected");
        selectedClass = c.getAttribute("data-class") || "Paladin";
      });
    });

    const genderBtns = this.container.querySelectorAll(".gender-btn");
    genderBtns.forEach((b) => {
      b.addEventListener("click", () => {
        genderBtns.forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        selectedGender = b.getAttribute("data-gender") || "male";
      });
    });

    const finishBtn = document.getElementById("finish-create-btn") as HTMLButtonElement;
    finishBtn.onclick = () => {
      const name = (document.getElementById("hero-name-input") as HTMLInputElement).value.trim();
      const hairHex = (document.getElementById("hair-color-input") as HTMLInputElement).value;
      const skinHex = (document.getElementById("skin-color-input") as HTMLInputElement).value;
      const tunicHex = (document.getElementById("tunic-color-input") as HTMLInputElement).value;

      const hairColor = parseInt(hairHex.replace("#", ""), 16);
      const skinColor = parseInt(skinHex.replace("#", ""), 16);
      const shirtColor = parseInt(tunicHex.replace("#", ""), 16);

      if (!name) return;

      this.net.createCharacter({
        name,
        className: selectedClass,
        gender: selectedGender,
        head: "Head1",
        hair: "Hair1",
        mouth: "Mouth1",
        face: "Face1",
        hairColor,
        skinColor,
        shirtColor,
        pantColor: 0x2c3e50,
      });

      if (this.onCharacterChosen) {
        this.onCharacterChosen({
          name,
          class: selectedClass,
          gender: selectedGender,
          level: 1,
        });
      }

      this.hide();
    };
  }

  public hide(): void {
    this.container.innerHTML = "";
  }
}
