export const GLOBAL_TERMINAL_CHANNEL_KEY = '__termora_global__';

export function normalizeTerminalId(terminalId: string | null | undefined): string | null {
  const normalizedTerminalId: string = terminalId?.trim() ?? '';

  return normalizedTerminalId.length > 0 ? normalizedTerminalId : null;
}

export function getTerminalChannelKey(terminalId: string | null | undefined): string {
  return normalizeTerminalId(terminalId) ?? GLOBAL_TERMINAL_CHANNEL_KEY;
}
