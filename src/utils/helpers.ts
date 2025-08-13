export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


