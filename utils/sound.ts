import { sounds as shared, seq } from '@laurelwood/card-class';

/**
 * The shared cue set plus 350's own. `partners` marks the moment the bidder's
 * called partners are revealed: the package's ascending triad, held a touch
 * shorter on the last note.
 */
export const sounds = {
  ...shared,
  partners: () => seq([
    { freq: 523, dur: 0.12, type: 'sine' as const, gain: 0.1 },
    { freq: 659, dur: 0.12, type: 'sine' as const, gain: 0.1, delay: 0.10 },
    { freq: 784, dur: 0.18, type: 'sine' as const, gain: 0.1, delay: 0.20 },
  ]),
};

export { setMuted, isMuted } from '@laurelwood/card-class';
