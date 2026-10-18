import * as THREE from 'three';
import type { ChunkManager } from '../world/ChunkManager';
import { BlockId } from '../world/BlockRegistry';
import { CONFIG } from '../config';

export interface MoveInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sneak: boolean;
  sprint: boolean;
}

const P = CONFIG.player;

export class Player {
  position = new THREE.Vector3(8, 40, 8);
  velocity = new THREE.Vector3();
  onGround = false;
  flying = false;
  /** Set by the physics step when a fall ends hard; the game reads and clears it. */
  landedHard = false;
  /** Set on the frame a jump actually launched. */
  justJumped = false;
  inWater = false;
  /** Accumulates while walking, drives the camera bob. */
  bobPhase = 0;
  private coyote = 0;
  private jumpQueued = 0;
  private impactSpeed = 0;

  constructor(private world: ChunkManager) {}

  update(input: MoveInput, dt: number, yaw: number): void {
    this.justJumped = false;
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    const move = new THREE.Vector3();
    if (input.forward) move.add(forward);
    if (input.back) move.sub(forward);
    if (input.right) move.add(right);
    if (input.left) move.sub(right);

    const moving = move.lengthSq() > 0;
    if (moving) move.normalize();

    if (this.flying) {
      this.updateFlying(move, input, dt);
      return;
    }

    this.inWater = this.checkWater();
    const speed =
      P.walkSpeed * (input.sprint && moving ? P.sprintMultiplier : 1) * (this.inWater ? 0.62 : 1);
    this.velocity.x = move.x * speed;
    this.velocity.z = move.z * speed;

    const wasOnGround = this.onGround;

    if (this.inWater) {
      // Buoyancy: slow sinking, and holding jump swims upward.
      this.velocity.y += P.gravity * 0.22 * dt;
      this.velocity.y = Math.max(this.velocity.y, -3.4);
      if (input.jump) this.velocity.y = 4.4;
      this.onGround = false;
      this.coyote = 0;
      this.jumpQueued = 0;
    } else {
      if (input.jump) this.jumpQueued = P.jumpBuffer;
      this.jumpQueued = Math.max(0, this.jumpQueued - dt);
      this.coyote = this.onGround ? P.coyoteTime : Math.max(0, this.coyote - dt);

      if (this.jumpQueued > 0 && this.coyote > 0) {
        this.velocity.y = P.jumpSpeed;
        this.onGround = false;
        this.coyote = 0;
        this.jumpQueued = 0;
        this.justJumped = true;
      }

      this.velocity.y += P.gravity * dt;
      if (!this.onGround) this.impactSpeed = Math.max(this.impactSpeed, -this.velocity.y);
    }

    this.moveAxis('x', this.velocity.x * dt);
    this.moveAxis('z', this.velocity.z * dt);
    this.moveAxis('y', this.velocity.y * dt);

    if (!wasOnGround && this.onGround && !this.inWater) {
      if (this.impactSpeed > P.hardLandingSpeed) this.landedHard = true;
      this.impactSpeed = 0;
    }

    if (this.onGround && moving) {
      this.bobPhase += (speed / P.walkSpeed) * dt * 9;
    }

    if (this.position.y < -10) this.respawn();
  }

  private checkWater(): boolean {
    const x = Math.floor(this.position.x);
    const z = Math.floor(this.position.z);
    const feet = this.world.getBlock(x, Math.floor(this.position.y + 0.2), z);
    const waist = this.world.getBlock(x, Math.floor(this.position.y + 0.9), z);
    return feet === BlockId.Water || waist === BlockId.Water;
  }

  private updateFlying(move: THREE.Vector3, input: MoveInput, dt: number): void {
    const speed = P.flySpeed;
    this.velocity.x = move.x * speed;
    this.velocity.z = move.z * speed;
    let vy = 0;
    if (input.jump) vy += 1;
    if (input.sneak) vy -= 1;
    this.velocity.y = vy * speed;
    this.onGround = false;
    this.inWater = false;

    this.moveAxis('x', this.velocity.x * dt);
    this.moveAxis('z', this.velocity.z * dt);
    this.moveAxis('y', this.velocity.y * dt);
  }

  toggleFly(): void {
    this.flying = !this.flying;
    this.velocity.y = 0;
  }

  private moveAxis(axis: 'x' | 'y' | 'z', delta: number): void {
    if (delta === 0) return;
    this.position[axis] += delta;

    const hw = P.width / 2;
    const minX = Math.floor(this.position.x - hw);
    const maxX = Math.floor(this.position.x + hw);
    const minY = Math.floor(this.position.y);
    const maxY = Math.floor(this.position.y + P.height - 0.01);
    const minZ = Math.floor(this.position.z - hw);
    const maxZ = Math.floor(this.position.z + hw);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (!this.world.isBlockSolid(x, y, z)) continue;

          if (axis === 'x') {
            if (delta > 0) this.position.x = x - hw - 0.001;
            else this.position.x = x + 1 + hw + 0.001;
            this.velocity.x = 0;
          } else if (axis === 'y') {
            if (delta > 0) {
              this.position.y = y - P.height - 0.001;
              this.velocity.y = 0;
            } else {
              this.position.y = y + 1 + 0.001;
              this.velocity.y = 0;
              this.onGround = true;
            }
          } else {
            if (delta > 0) this.position.z = z - hw - 0.001;
            else this.position.z = z + 1 + hw + 0.001;
            this.velocity.z = 0;
          }
          return;
        }
      }
    }

    if (axis === 'y' && delta < 0) {
      this.onGround = false;
    }
  }

  respawn(): void {
    this.position.set(8, 50, 8);
    this.velocity.set(0, 0, 0);
  }

  getEyePosition(): THREE.Vector3 {
    return new THREE.Vector3(this.position.x, this.position.y + P.height - 0.2, this.position.z);
  }

  /** Put the player safely on top of the column beneath them. */
  placeOnGround(world: ChunkManager): void {
    const y = world.topSolidY(Math.floor(this.position.x), Math.floor(this.position.z));
    if (y >= 0) this.position.y = y + 1.02;
  }
}
