import { inject, Injectable } from '@angular/core';

import {
  TerminalCommandDefinition,
  TerminalCommandExecutionContext,
  TerminalCommandResolution,
  TerminalCommandSuggestion,
} from '../models/terminal-command.model';
import { CommandParser } from './command-parser';
import { CommandRegistry } from './command-registry';

@Injectable({ providedIn: 'root' })
export class CommandEngine {
  private readonly _parser = inject(CommandParser);
  private readonly _registry = inject(CommandRegistry);

  public resolve(
    rawInput: string,
    customCommands: readonly TerminalCommandDefinition[],
  ): TerminalCommandResolution {
    const parsed = this._parser.parse(rawInput);

    if (!parsed.commandName) {
      return {
        parsed,
        command: null,
        suggestions: [],
        ghostCompletion: null,
      };
    }

    if (parsed.activeTokenIndex === 0 && !parsed.endsWithWhitespace) {
      const commandSuggestions = this._registry
        .suggestCommands(parsed.activeToken, customCommands)
        .map(
          (command: TerminalCommandDefinition): TerminalCommandSuggestion => ({
            value: command.name,
            description: command.description,
          }),
        );

      return {
        parsed,
        command: this._registry.find(parsed.commandName, customCommands),
        suggestions: commandSuggestions,
        ghostCompletion: this._toGhostCompletion(parsed.activeToken, commandSuggestions),
      };
    }

    const command: TerminalCommandDefinition | null = this._registry.find(
      parsed.commandName,
      customCommands,
    );

    if (!command) {
      return {
        parsed,
        command: null,
        suggestions: [],
        ghostCompletion: null,
      };
    }

    const parameterSuggestions: readonly TerminalCommandSuggestion[] = this._suggestParameters(
      command,
      parsed.arguments,
    );

    const activeArgumentIndex: number = Math.max(parsed.activeTokenIndex - 1, 0);
    const activeArgumentValue: string = parsed.endsWithWhitespace
      ? ''
      : (parsed.arguments[activeArgumentIndex] ?? '');

    const filteredSuggestions: readonly TerminalCommandSuggestion[] =
      parameterSuggestions.filter((suggestion: TerminalCommandSuggestion) =>
        suggestion.value.toLowerCase().startsWith(activeArgumentValue.toLowerCase()),
      );

    return {
      parsed,
      command,
      suggestions: filteredSuggestions,
      ghostCompletion: this._toGhostCompletion(activeArgumentValue, filteredSuggestions),
    };
  }

  public execute(
    terminalId: string,
    rawInput: string,
    command: TerminalCommandDefinition,
    print: (value: string) => void,
    clear: () => void,
  ): void {
    const parsed = this._parser.parse(rawInput);

    const context: TerminalCommandExecutionContext = {
      terminalId,
      rawInput,
      arguments: parsed.arguments,
      api: {
        print,
        clear,
      },
    };

    command.execute(context);
  }

  private _suggestParameters(
    command: TerminalCommandDefinition,
    argumentsValues: readonly string[],
  ): readonly TerminalCommandSuggestion[] {
    const argumentIndex: number = argumentsValues.length === 0 ? 0 : argumentsValues.length - 1;

    const argumentDefinition = command.argumentSpec?.[argumentIndex];

    if (!argumentDefinition) {
      return [];
    }

    if (argumentDefinition.type === 'enum') {
      return argumentDefinition.values.map(
        (value: string): TerminalCommandSuggestion => ({ value }),
      );
    }

    if (argumentDefinition.type === 'one-of') {
      return argumentDefinition.values.flatMap((definition) =>
        definition.type === 'enum'
          ? definition.values.map(
            (value: string): TerminalCommandSuggestion => ({
              value,
            }),
          )
          : [],
      );
    }

    return [];
  }

  private _toGhostCompletion(
    currentValue: string,
    suggestions: readonly TerminalCommandSuggestion[],
  ): string | null {
    const firstSuggestion: TerminalCommandSuggestion | undefined = suggestions[0];

    if (!firstSuggestion) {
      return null;
    }

    if (!currentValue) {
      return firstSuggestion.value;
    }

    if (!firstSuggestion.value.toLowerCase().startsWith(currentValue.toLowerCase())) {
      return null;
    }

    const suffix: string = firstSuggestion.value.slice(currentValue.length);

    return suffix || null;
  }
}
