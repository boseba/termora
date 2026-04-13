import { type TerminalCommandSuggestion } from './terminal-command.model';
import { type TerminalOptions } from './terminal-options.model';

export interface TerminalSessionState {
  id: string | null;
  options: TerminalOptions;
  autoScrollEnabled: boolean;
  inputValue: string;
  history: readonly string[];
  historyIndex: number | null;
  suggestions: readonly TerminalCommandSuggestion[];
  ghostCompletion: string | null;
}
