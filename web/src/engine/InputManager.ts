export class InputManager {
  public left: boolean = false;
  public right: boolean = false;
  public jump: boolean = false;
  public attack: boolean = false;
  public skill1: boolean = false;
  public skill2: boolean = false;
  public skill3: boolean = false;
  public skill4: boolean = false;
  public potion: boolean = false;
  public isChatFocused: boolean = false;

  constructor() {
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.isChatFocused && e.code !== "Enter") {
      return;
    }

    switch (e.code) {
      case "KeyA":
      case "ArrowLeft":
        this.left = true;
        break;
      case "KeyD":
      case "ArrowRight":
        this.right = true;
        break;
      case "KeyW":
      case "ArrowUp":
      case "Space":
        this.jump = true;
        break;
      case "Digit1":
        this.skill1 = true;
        break;
      case "Digit2":
        this.skill2 = true;
        break;
      case "Digit3":
        this.skill3 = true;
        break;
      case "Digit4":
        this.skill4 = true;
        break;
      case "KeyP":
        this.potion = true;
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case "KeyA":
      case "ArrowLeft":
        this.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        this.right = false;
        break;
      case "KeyW":
      case "ArrowUp":
      case "Space":
        this.jump = false;
        break;
      case "Digit1":
        this.skill1 = false;
        break;
      case "Digit2":
        this.skill2 = false;
        break;
      case "Digit3":
        this.skill3 = false;
        break;
      case "Digit4":
        this.skill4 = false;
        break;
      case "KeyP":
        this.potion = false;
        break;
    }
  }
}
