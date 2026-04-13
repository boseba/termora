export type TerminalArgumentType = 'enum' | 'quoted-string' | 'one-of';

export interface TerminalEnumArgumentDefinition {
  type: 'enum';
  values: readonly string[];
}

export interface TerminalQuotedStringArgumentDefinition {
  type: 'quoted-string';
}

export interface TerminalOneOfArgumentDefinition {
  type: 'one-of';
  values: readonly TerminalArgumentDefinition[];
}

export type TerminalArgumentDefinition =
  | TerminalEnumArgumentDefinition
  | TerminalQuotedStringArgumentDefinition
  | TerminalOneOfArgumentDefinition;

export interface TerminalCommandDefinition {
  name: string;
  description: string;
  argumentSpec?: readonly TerminalArgumentDefinition[];
  argumentHelp?: readonly string[];
  execute: (context: TerminalCommandExecutionContext) => void;
}

export interface ParsedCommandInput {
  rawInput: string;
  commandName: string | null;
  arguments: string[];
  activeToken: string;
  activeTokenIndex: number;
  endsWithWhitespace: boolean;
}

export interface TerminalCommandExecutionContext {
  terminalId: string | null;
  rawInput: string;
  arguments: string[];
  api: {
    print: (value: string) => void;
    clear: () => void;
  };
}

export interface TerminalCommandSuggestion {
  value: string;
  description?: string;
  help?: string;
}

export interface TerminalCommandResolution {
  parsed: ParsedCommandInput;
  command: TerminalCommandDefinition | null;
  suggestions: readonly TerminalCommandSuggestion[];
  ghostCompletion: string | null;
}
