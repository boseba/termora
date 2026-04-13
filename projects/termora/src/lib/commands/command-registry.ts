import { Injectable } from '@angular/core';

import { type TerminalCommandDefinition } from '../models/terminal-command.model';
import { NATIVE_COMMAND_DEFINITIONS } from './command-definitions';

@Injectable({ providedIn: 'root' })
export class CommandRegistry {
  public getAll(
    customCommands: readonly TerminalCommandDefinition[],
  ): readonly TerminalCommandDefinition[] {
    return [...NATIVE_COMMAND_DEFINITIONS, ...customCommands];
  }

  public find(
    name: string | null,
    customCommands: readonly TerminalCommandDefinition[],
  ): TerminalCommandDefinition | null {
    if (!name) {
      return null;
    }

    const normalizedName: string = name.toLowerCase();

    return (
      this.getAll(customCommands).find(
        (command: TerminalCommandDefinition) =>
          command.name.toLowerCase() === normalizedName,
      ) ?? null
    );
  }

  public suggestCommands(
    value: string,
    customCommands: readonly TerminalCommandDefinition[],
  ): readonly TerminalCommandDefinition[] {
    const normalizedValue: string = value.toLowerCase();

    return this.getAll(customCommands)
      .filter((command: TerminalCommandDefinition) =>
        command.name.toLowerCase().startsWith(normalizedValue),
      )
      .sort((left: TerminalCommandDefinition, right: TerminalCommandDefinition) =>
        left.name.localeCompare(right.name),
      );
  }
}
