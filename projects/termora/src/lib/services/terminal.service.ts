import { Injectable, Signal, inject } from '@angular/core';

import { CommandEngine } from '../commands/command-engine';
import { CommandRegistry } from '../commands/command-registry';
import {
  TerminalCommandDefinition,
  TerminalCommandResolution,
} from '../models/terminal-command.model';
import { TerminalOptions } from '../models/terminal-options.model';
import { TerminalState } from '../models/terminal-state.model';
import { TerminalStore } from '../stores/terminal.store';

export interface SubmittedCommandResult {
  handled: boolean;
  cleared: boolean;
  rawInput: string;
}

@Injectable({ providedIn: 'root' })
export class TerminalService {
  private readonly _store = inject(TerminalStore);
  private readonly _engine = inject(CommandEngine);
  private readonly _registry = inject(CommandRegistry);

  public ensureTerminal(terminalId: string): void {
    this._store.ensureTerminal(terminalId);
  }

  public getStates(): Signal<Record<string, TerminalState>> {
    return this._store.getStates();
  }

  public getStateSnapshot(terminalId: string): TerminalState | undefined {
    return this._store.getStateSnapshot(terminalId);
  }

  public configure(terminalId: string, options: Partial<TerminalOptions>): void {
    this._store.setOptions(terminalId, options);
  }

  public print(terminalId: string, value: string): void {
    this._store.appendLine(terminalId, value, 'output');
  }

  public clear(terminalId: string): void {
    this._store.clear(terminalId);
  }

  public setAutoScrollEnabled(terminalId: string, enabled: boolean): void {
    this._store.setAutoScrollEnabled(terminalId, enabled);
  }

  public updateInput(terminalId: string, value: string): void {
    const state: TerminalState | undefined = this._store.getStateSnapshot(terminalId);

    if (!state) {
      return;
    }

    const resolution: TerminalCommandResolution = this._engine.resolve(
      value,
      state.options.commands,
    );

    this._store.setInputValue(terminalId, value);
    this._store.setSuggestions(
      terminalId,
      resolution.suggestions,
      resolution.ghostCompletion,
    );
  }

  public moveHistory(terminalId: string, direction: 'up' | 'down'): string {
    const nextValue: string = this._store.moveHistory(terminalId, direction);
    const state: TerminalState | undefined = this._store.getStateSnapshot(terminalId);

    if (!state) {
      return nextValue;
    }

    const resolution: TerminalCommandResolution = this._engine.resolve(
      nextValue,
      state.options.commands,
    );

    this._store.setSuggestions(
      terminalId,
      resolution.suggestions,
      resolution.ghostCompletion,
    );

    return nextValue;
  }

  public applyFirstSuggestion(terminalId: string): string | null {
    const state: TerminalState | undefined = this._store.getStateSnapshot(terminalId);

    if (!state) {
      return null;
    }

    const firstSuggestion = state.suggestions[0];

    if (!firstSuggestion) {
      return null;
    }

    const resolution: TerminalCommandResolution = this._engine.resolve(
      state.inputValue,
      state.options.commands,
    );

    let nextValue: string;

    if (resolution.parsed.activeTokenIndex === 0) {
      nextValue = firstSuggestion.value;
    } else {
      const parts: string[] = state.inputValue.split(/\s+/);
      parts[resolution.parsed.activeTokenIndex] = firstSuggestion.value;
      nextValue = parts.join(' ');
    }

    this.updateInput(terminalId, nextValue);

    return nextValue;
  }

  public submitCommand(terminalId: string, rawInput: string): SubmittedCommandResult {
    const trimmedInput: string = rawInput.trim();

    if (!trimmedInput) {
      return {
        handled: true,
        cleared: false,
        rawInput,
      };
    }

    const state: TerminalState | undefined = this._store.getStateSnapshot(terminalId);

    if (!state) {
      return {
        handled: false,
        cleared: false,
        rawInput: trimmedInput,
      };
    }

    const command = this._registry.find(
      this._engine.resolve(trimmedInput, state.options.commands).parsed.commandName,
      state.options.commands,
    );

    this._store.pushHistory(terminalId, trimmedInput);
    this._store.setInputValue(terminalId, '');
    this._store.resetSuggestions(terminalId);

    if (!command) {
      this._store.appendLine(terminalId, trimmedInput, 'command');
      this._store.appendError(terminalId, `[i][color="var(--termora-color-error)"]command '${trimmedInput}' not found[/color][/i]`);

      return {
        handled: false,
        cleared: false,
        rawInput: trimmedInput,
      };
    }

    const isClearCommand: boolean = command.name.toLowerCase() === 'clear';

    if (!isClearCommand) {
      this._store.appendLine(terminalId, trimmedInput, 'command');
    }

    this._engine.execute(
      terminalId,
      trimmedInput,
      command,
      (value: string) => this.print(terminalId, value),
      () => this.clear(terminalId),
    );

    return {
      handled: true,
      cleared: isClearCommand,
      rawInput: trimmedInput,
    };
  }

  public setCommands(
    terminalId: string,
    commands: readonly TerminalCommandDefinition[],
  ): void {
    this._store.setOptions(terminalId, { commands });
  }

  public setFilter(terminalId: string, filterText: string): void {
    this._store.setOptions(terminalId, { filterText });
  }

  public setMaxLines(terminalId: string, maxLines: number): void {
    this._store.setOptions(terminalId, { maxLines });
  }
}