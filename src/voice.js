// Hebrew announcer, spoken with the browser's built-in speech synthesis (no audio files).
// The voice comes from the operating system: Windows, macOS, iOS and Android ship a Hebrew one.

export const LINES = {
  roundStart: 'יאללה, יאללה!',
  planted: 'איזה פצצה!',
  defused: 'פירקו את הפצצה. באסה.',
  exploded: 'בּוּם!',
  attackersWin: 'כל הכבוד, אחי!',
  defendersWin: 'נו, באמת...',
  headshot: 'בול בראש!',
  died: 'יאללה, ביי.',
  lowTime: 'יאללה, הזמן נגמר!',
  victory: 'אלופים!',
  defeat: 'לא נורא, פעם הבאה.',
};

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let hebrew = null, enabled = true, volume = 0.7, lastSaid = 0;

function findVoice() {
  if (!synth) return;
  hebrew = synth.getVoices().find((v) => /^(he|iw)([-_]|$)/i.test(v.lang)) || null;
}
findVoice();
synth?.addEventListener?.('voiceschanged', findVoice);

export const voice = {
  get available() { return !!hebrew; },
  setEnabled(on) {
    enabled = on;
    if (!on) synth?.cancel();
  },
  setVolume(v) { volume = v; },

  // mode: 'urgent' cuts off whatever is playing, 'queue' waits its turn,
  // 'normal' is dropped if another line started less than 1.5 s ago.
  say(key, mode = 'normal') {
    const text = LINES[key];
    if (!synth || !enabled || !text || volume <= 0) return;
    if (!hebrew) findVoice();
    if (!hebrew) return;
    const now = performance.now();
    if (mode === 'normal' && synth.speaking && now - lastSaid < 1500) return;
    if (mode === 'urgent') synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = hebrew;
    u.lang = hebrew.lang;
    u.volume = Math.min(1, volume * 1.3);
    u.rate = 1.1;
    synth.speak(u);
    lastSaid = now;
  },
  stop() { synth?.cancel(); },
};
