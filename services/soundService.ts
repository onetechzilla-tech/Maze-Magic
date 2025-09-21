export enum Sound {
  StartGame = 'start-game',
  MovePawn = 'move-pawn',
  PlaceWall = 'place-wall',
  WinGame = 'win-game',
  LoseGame = 'lose-game',
  TimerTick = 'timer-tick',
  UIClick = 'ui-click',
  Error = 'error',
  OnlineWaiting = 'online-waiting',
  // Emojis
  EmojiLaugh = 'emoji-laugh',
  EmojiThink = 'emoji-think',
  EmojiMindBlown = 'emoji-mind-blown',
  EmojiCool = 'emoji-cool',
  EmojiWave = 'emoji-wave',
  EmojiLove = 'emoji-love',
  EmojiAngry = 'emoji-angry',
  EmojiWaiting = 'emoji-waiting',
}

// Map sound enum to their corresponding file paths using relative paths to
// ensure they work correctly in subdirectory deployments (e.g., GitHub Pages).
const soundFiles: Record<Sound, string> = {
  [Sound.UIClick]: 'sounds/ui-click.mp3',
  [Sound.StartGame]: 'sounds/start-game.mp3',
  [Sound.MovePawn]: 'sounds/move-pawn.mp3',
  [Sound.PlaceWall]: 'sounds/place-wall.mp3',
  [Sound.WinGame]: 'sounds/win-game.mp3',
  [Sound.LoseGame]: 'sounds/lose-game.mp3',
  [Sound.TimerTick]: 'sounds/timer-tick.mp3',
  [Sound.Error]: 'sounds/error.mp3',
  [Sound.OnlineWaiting]: 'sounds/online-waiting.mp3',
  [Sound.EmojiLaugh]: 'sounds/emoji-laugh.mp3',
  [Sound.EmojiThink]: 'sounds/emoji-think.mp3',
  [Sound.EmojiMindBlown]: 'sounds/emoji-mind-blown.mp3',
  [Sound.EmojiCool]: 'sounds/emoji-cool.mp3',
  [Sound.EmojiWave]: 'sounds/emoji-wave.mp3',
  [Sound.EmojiLove]: 'sounds/emoji-love.mp3',
  [Sound.EmojiAngry]: 'sounds/emoji-angry.mp3',
  [Sound.EmojiWaiting]: 'sounds/emoji-waiting.mp3',
};


class SoundService {
  private _isMuted = false;
  private audioCache: Map<Sound, HTMLAudioElement> = new Map();
  private isInitialized = false;

  constructor() {
    // Initialization is deferred to an explicit `init()` call
    // to ensure it runs in a browser context after the app mounts.
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    const muted = localStorage.getItem('soundMuted') === 'true';
    this._isMuted = muted;

    Object.entries(soundFiles).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      this.audioCache.set(key as Sound, audio);
    });

    this.isInitialized = true;
    console.log('SoundService initialized and sounds preloaded.');
  }

  public play(sound: Sound) {
    if (!this.isInitialized) {
      // This might happen if a sound is played before the App component mounts.
      // We can either ignore it or lazy-initialize, but ignoring is safer.
      console.warn('SoundService not initialized. Call init() first.');
      return;
    }
    if (this._isMuted) {
      return;
    }
    
    const audio = this.audioCache.get(sound);
    if (audio) {
      // By setting currentTime to 0, we can replay the sound even if it's already playing.
      // This is crucial for rapid-fire sound effects.
      audio.currentTime = 0;
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch(error => {
            // This warning is expected if the user hasn't interacted with the page yet,
            // but subsequent plays triggered by user actions should succeed.
            console.warn(`Sound playback for "${sound}" was prevented:`, error);
        });
      }
    } else {
      console.warn(`Sound not found in cache: ${sound}`);
    }
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public toggleMute() {
    this._isMuted = !this._isMuted;
    localStorage.setItem('soundMuted', this._isMuted.toString());
    if (!this.isInitialized) this.init(); // Ensure service is initialized if mute is toggled first
  }
}

export const soundService = new SoundService();