import { TerminalCommandSuggestion } from './terminal-command.model';
import { TerminalLine } from './terminal-line.model';
import { TerminalOptions } from './terminal-options.model';

export interface TerminalState {
  id: string;
  lines: readonly TerminalLine[];
  visibleLines: readonly TerminalLine[];
  options: TerminalOptions;
  autoScrollEnabled: boolean;
  inputValue: string;
  history: readonly string[];
  historyIndex: number | null;
  suggestions: readonly TerminalCommandSuggestion[];
  ghostCompletion: string | null;
}
