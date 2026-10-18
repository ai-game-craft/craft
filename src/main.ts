import { Game } from './engine/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const game = new Game(canvas);

// Handy for debugging (and for curious students in the devtools console):
//   game.player.position
//   game.player.flying = true
//   game.world.getBlock(10, 40, 10)
declare global {
  interface Window {
    game: Game;
  }
}
window.game = game;
