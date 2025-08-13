export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function createLogger(level: LogLevel = 'info') {
  const order: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const enabled = (l: LogLevel) => order.indexOf(l) >= order.indexOf(level);
  return {
    debug: (...args: any[]) => enabled('debug') && console.debug('[debug]', ...args),
    info: (...args: any[]) => enabled('info') && console.info('[info]', ...args),
    warn: (...args: any[]) => enabled('warn') && console.warn('[warn]', ...args),
    error: (...args: any[]) => enabled('error') && console.error('[error]', ...args)
  };
}


