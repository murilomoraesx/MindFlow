const EDGE_ANIMATION_EPOCH = Date.now();

const toSeconds = (duration: string) => {
  const numeric = Number.parseFloat(duration.replace('s', '').trim());
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

export const getSynchronizedAnimationBegin = (duration: string) => {
  const durationSeconds = toSeconds(duration);
  if (durationSeconds <= 0) return '0s';
  const elapsedSeconds = ((Date.now() - EDGE_ANIMATION_EPOCH) / 1000) % durationSeconds;
  return `${-elapsedSeconds}s`;
};

export const EDGE_SYNC_MOTION_DURATION = '2.6s';
export const EDGE_SYNC_PULSE_DURATION = '2.2s';
