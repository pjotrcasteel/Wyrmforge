export interface MovementInput {
  x: number;
  y: number;
}

export class InputController {
  private readonly keys = new Set<string>();
  private touchPointerId: number | null = null;
  private touchOrigin = { x: 0, y: 0 };
  private touchCurrent = { x: 0, y: 0 };

  public constructor(private readonly target: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('pointerdown', this.onPointerDown);
    target.addEventListener('pointermove', this.onPointerMove);
    target.addEventListener('pointerup', this.onPointerUp);
    target.addEventListener('pointercancel', this.onPointerUp);
  }

  public getMovement(): MovementInput {
    let x = 0;
    let y = 0;
    if (this.keys.has('arrowleft') || this.keys.has('a')) x -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) x += 1;
    if (this.keys.has('arrowup') || this.keys.has('w')) y -= 1;
    if (this.keys.has('arrowdown') || this.keys.has('s')) y += 1;

    if (x !== 0 || y !== 0) return normalize(x, y);
    if (this.touchPointerId === null) return { x: 0, y: 0 };

    const dx = this.touchCurrent.x - this.touchOrigin.x;
    const dy = this.touchCurrent.y - this.touchOrigin.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 8) return { x: 0, y: 0 };
    return normalize(dx, dy);
  }

  public getTouchIndicator(): { originX: number; originY: number; currentX: number; currentY: number } | null {
    if (this.touchPointerId === null) return null;
    return { originX: this.touchOrigin.x, originY: this.touchOrigin.y, currentX: this.touchCurrent.x, currentY: this.touchCurrent.y };
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('pointerdown', this.onPointerDown);
    this.target.removeEventListener('pointermove', this.onPointerMove);
    this.target.removeEventListener('pointerup', this.onPointerUp);
    this.target.removeEventListener('pointercancel', this.onPointerUp);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) event.preventDefault();
    this.keys.add(event.key.toLowerCase());
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.touchPointerId !== null) return;
    this.touchPointerId = event.pointerId;
    this.touchOrigin = { x: event.clientX, y: event.clientY };
    this.touchCurrent = { ...this.touchOrigin };
    this.target.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.touchPointerId) return;
    this.touchCurrent = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.touchPointerId) return;
    this.touchPointerId = null;
  };
}

function normalize(x: number, y: number): MovementInput {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}
