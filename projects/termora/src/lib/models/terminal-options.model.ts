import { type TerminalCommandDefinition } from './terminal-command.model';

export interface TerminalOptions {
    maxLines: number;
    showInput: boolean;
    filterText: string;
    commands: readonly TerminalCommandDefinition[];
}

export const DEFAULT_TERMINAL_OPTIONS: TerminalOptions = {
    maxLines: 500,
    showInput: true,
    filterText: '',
    commands: [],
};
