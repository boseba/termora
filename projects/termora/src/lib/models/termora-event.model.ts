import { type Observable } from 'rxjs';

import { type TerminalLineKind } from './terminal-line.model';

export interface TermoraPrintEvent {
  type: 'print';
  value: string;
  terminalId?: string | null;
  kind?: TerminalLineKind;
}

export interface TermoraClearEvent {
  type: 'clear';
  terminalId?: string | null;
}

export type TermoraEvent = TermoraPrintEvent | TermoraClearEvent;

export type TermoraSourceFactory = () => Observable<TermoraEvent>;
