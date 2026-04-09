import { TerminalCommandDefinition } from '../models/terminal-command.model';

export const NATIVE_COMMAND_DEFINITIONS: readonly TerminalCommandDefinition[] = [
  {
    name: 'clear',
    description: 'Clear the terminal output',
    execute: ({ api }) => {
      api.clear();
    },
  },
];
