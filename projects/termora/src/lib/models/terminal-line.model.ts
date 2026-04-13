import { type SafeHtml } from "@angular/platform-browser";

export type TerminalLineKind = 'output' | 'command' | 'system' | 'error' | 'warning' | 'info';

export interface TerminalLine {
  id: string;
  raw: string;
  plainText: string;
  renderedHtml: SafeHtml;
  kind: TerminalLineKind;
  timestamp: number;
}
