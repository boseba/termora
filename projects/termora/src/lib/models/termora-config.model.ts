import { type TermoraSourceFactory } from './termora-event.model';

export interface TermoraConfig {
  maxStoredLines?: number;
  sources?: readonly TermoraSourceFactory[];
}
