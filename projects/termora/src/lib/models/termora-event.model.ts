import { type Observable } from 'rxjs';

import { type TerminalLineKind } from './terminal-line.model';

export interface TermoraPrintEvent {
  type: 'print';
  value: string;
  terminalId?: string | null;
  kind?: TerminalLineKind;
}

export interface TermoraPrintBatchEvent {
  type: 'printBatch';
  values: readonly string[];
  terminalId?: string | null;
  kind?: TerminalLineKind;
}

export interface TermoraClearEvent {
  type: 'clear';
  terminalId?: string | null;
}

export type TermoraEvent = TermoraPrintEvent | TermoraPrintBatchEvent | TermoraClearEvent;

export type TermoraSourceFactory = () => Observable<TermoraEvent>;
