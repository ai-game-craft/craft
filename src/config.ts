/**
 * ============================================================
 *  CRAFT — TUNING FILE
 *  Everything the game "feels" like lives here.
 *  Change a number, save, and the game reloads instantly.
 *  Great for experiments: "what if gravity was the moon's?"
 * ============================================================
 */

export const CONFIG = {
  /** Terrain + chunk streaming */
  world: {
    seed: 42,
    renderDistance: 6,
    mobileRenderDistance: 4,
    /** Sea level. Anything below this is flooded. */
    waterLevel: 26,
    /** Peaks above this get snow on top. */
    snowLine: 55,
  },

  /** Movement — the single biggest factor in how a game "feels" */
  player: {
    walkSpeed: 5.5,
    sprintMultiplier: 1.7,
    jumpSpeed: 9,
    gravity: -28,
    flySpeed: 12,
    flySprintMultiplier: 2.2,
    /** Grace period to still jump after walking off a ledge (seconds) */
    coyoteTime: 0.12,
    /** Press jump slightly before landing and it still counts (seconds) */
    jumpBuffer: 0.15,
    height: 1.7,
    width: 0.6,
    /** Fall this far before the landing thud plays */
    hardLandingSpeed: 18,
  },

  /** Day / night cycle */
  day: {
    /** Real seconds for one full 24h cycle */
    lengthSeconds: 360,
    /** Hour the world starts at (0-24) */
    startHour: 8,
  },

  audio: {
    masterVolume: 0.5,
  },

  /** The play loop */
  play: {
    /** How many glow-stars spawn per round */
    starCount: 10,
    starMinRadius: 35,
    starMaxRadius: 120,
    /** Seconds between repeats while holding break/place */
    interactRepeat: 0.16,
    /** How many block edits Ctrl+Z can undo */
    maxUndo: 64,
    /** Reach distance in blocks */
    reach: 8,
  },
} as const;
