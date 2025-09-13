export enum Sound {
  StartGame = 'start-game',
  MovePawn = 'move-pawn',
  PlaceWall = 'place-wall',
  WinGame = 'win-game',
  LoseGame = 'lose-game',
  TimerTick = 'timer-tick',
  UIClick = 'ui-click',
  Error = 'error',
}

// Map sound enum to their corresponding file paths using root-relative paths.
// The browser will handle resolving them against the current origin, which is
// more robust for various deployment environments (e.g., subdirectories).
const soundFiles: Record<Sound, string> = {
  [Sound.UIClick]: '/sounds/ui-click.mp3',
  [Sound.StartGame]: '/sounds/start-game.mp3',
  [Sound.MovePawn]: '/sounds/move-pawn.mp3',
  [Sound.PlaceWall]: '/sounds/place-wall.mp3',
  [Sound.WinGame]: '/sounds/win-game.mp3',
  [Sound.LoseGame]: '/sounds/lose-game.mp3',
  [Sound.TimerTick]: '/sounds/timer-tick.mp3',
  [Sound.Error]: '/sounds/error.mp3',
};


class SoundService {
  private _isMuted = false;

  constructor() {
    if (typeof window !== 'undefined') {
        const muted = localStorage.getItem('soundMuted') === 'true';
        this._isMuted = muted;
    }
  }

  public play(sound: Sound) {
    if (this._isMuted || typeof window === 'undefined') {
      return;
    }
    
    // Create a new Audio object for each playback. This is more robust for short,
    // fire-and-forget sound effects and avoids issues with browser autoplay policies.
    const audio = new Audio(soundFiles[sound]);
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.catch(error => {
            // This warning is expected if the user hasn't interacted with the page yet.
            // Or if the play() call was not directly tied to a user event.
            console.warn(`Sound playback for "${sound}" was prevented:`, error);
        });
    }
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public toggleMute() {
    this._isMuted = !this._isMuted;
    localStorage.setItem('soundMuted', this._isMuted.toString());
  }
}

export const soundService = new SoundService();