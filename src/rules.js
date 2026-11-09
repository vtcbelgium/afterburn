export const LANES = [-4.2, 0, 4.2];

export class RunState {
  constructor() { this.reset(); }

  reset() {
    this.time = 0;
    this.distance = 0;
    this.bonus = 0;
    this.energy = 100;
    this.hull = 3;
    this.combo = 1;
    this.collected = 0;
    this.nearMisses = 0;
    this.invulnerable = 0;
    this.boosting = false;
    this.boostLocked = false;
    this.speed = 34;
    this.over = false;
  }

  get score() { return Math.floor(this.distance * 10 + this.bonus); }
  get sector() { return Math.floor(this.distance / 1800) + 1; }

  update(dt, boost) {
    if (this.over) return;
    this.time += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (!boost) this.boostLocked = false;
    this.boosting = boost && !this.boostLocked && this.energy > 0;
    this.energy = Math.max(0, Math.min(100, this.energy + (this.boosting ? -31 : 9) * dt));
    if (this.energy === 0) this.boostLocked = true;
    this.speed = Math.min(64, 34 + this.time * 0.18) * (this.boosting ? 1.65 : 1);
    this.distance += this.speed * dt * 2.5;
  }

  hit() {
    if (this.over || this.invulnerable > 0) return false;
    this.hull -= 1;
    this.combo = 1;
    this.invulnerable = 1.9;
    this.over = this.hull <= 0;
    return true;
  }

  pickup() {
    if (this.over) return;
    this.collected += 1;
    this.energy = Math.min(100, this.energy + 12);
    this.bonus += 150 * this.combo;
  }

  nearMiss() {
    if (this.over) return;
    this.nearMisses += 1;
    this.combo = Math.min(8, this.combo + 1);
    this.bonus += 100 * this.combo;
  }
}

export function crossedPlayer(previousZ, currentZ, playerZ = 6, halfLength = 1.8) {
  return previousZ <= playerZ + halfLength && currentZ >= playerZ - halfLength;
}

export function makeRow(random = Math.random, difficulty = 0) {
  const safeLane = Math.floor(random() * 3);
  const other = [0, 1, 2].filter(lane => lane !== safeLane);
  const blocked = random() < Math.min(0.68, 0.18 + difficulty * 0.08)
    ? other : [other[Math.floor(random() * other.length)]];
  return { safeLane, blocked };
}
