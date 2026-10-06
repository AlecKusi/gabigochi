/** Fizyka upuszczenia: `lift` = wysokość nad podłogą (px logiczne, w górę dodatnio), `vy` > 0 = w dół. */
export const FALL = { gravity: 600, bounce: 0.3, minBounceSpeed: 60, scaredHeight: 40 } as const;

export interface Fall {
  lift: number;
  vy: number;
  startLift: number;
  bounced: boolean;
  done: boolean;
}

export function startFall(lift: number): Fall {
  const l = Math.max(0, lift);
  return { lift: l, vy: 0, startLift: l, bounced: false, done: l <= 0 };
}

export function stepFall(f: Fall, dtMs: number): Fall {
  if (f.done) return f;
  const dt = dtMs / 1000;
  let vy = f.vy + FALL.gravity * dt;
  let lift = f.lift - vy * dt;
  let bounced = f.bounced;
  if (lift <= 0) {
    lift = 0;
    if (!bounced && vy > FALL.minBounceSpeed) {
      vy = -vy * FALL.bounce;
      bounced = true;
    } else {
      return { ...f, lift: 0, vy: 0, bounced, done: true };
    }
  }
  return { ...f, lift, vy, bounced, done: false };
}

export const landingEmotion = (f: Fall): 'scared' | 'happy' => (f.startLift > FALL.scaredHeight ? 'scared' : 'happy');
