import { computed, inject, Injectable, type Signal } from '@angular/core';

import { type TerminalLine, type TerminalLineKind } from '../models/terminal-line.model';
import { type TerminalSessionState } from '../models/terminal-session-state.model';
import { type TerminalState } from '../models/terminal-state.model';
import { getTerminalChannelKey } from '../utils/terminal-channel';
import { TerminalLogStore } from './terminal-log.store';
import { TerminalSessionStore } from './terminal-session.store';

@Injectable({ providedIn: 'root' })
export class TerminalStore {
  private readonly _logStore = inject(TerminalLogStore);
  private readonly _sessionStore = inject(TerminalSessionStore);

  private readonly _states = computed((): Record<string, TerminalState> => {
    const sessionStates: Record<string, TerminalSessionState> = this._sessionStore.getStates()();
    const linesByChannel: Record<string, readonly TerminalLine[]> =
      this._logStore.getLinesByChannel()();

    const channelKeys: string[] = Array.from(
      new Set([...Object.keys(sessionStates), ...Object.keys(linesByChannel)]),
    );

    const states: Record<string, TerminalState> = {};

    for (const channelKey of channelKeys) {
      if (!Object.hasOwn(sessionStates, channelKey)) {
        continue;
      }

      const sessionState: TerminalSessionState = sessionStates[channelKey];

      states[channelKey] = this._composeState(sessionState, linesByChannel[channelKey] ?? []);
    }

    return states;
  });

  public ensureTerminal(terminalId: string | null | undefined): void {
    this._sessionStore.ensureTerminal(terminalId);
  }

  public getStateSnapshot(terminalId: string | null | undefined): TerminalState {
    this.ensureTerminal(terminalId);

    const channelKey: string = getTerminalChannelKey(terminalId);
    const states: Record<string, TerminalState> = this._states();

    if (!Object.hasOwn(states, channelKey)) {
      throw new Error('Terminal state could not be resolved.');
    }

    return states[channelKey];
  }

  public getStates(): Signal<Record<string, TerminalState>> {
    return this._states;
  }

  public configureMaxStoredLines(maxStoredLines: number): void {
    this._logStore.configureMaxStoredLines(maxStoredLines);
  }

  public setOptions(
    terminalId: string | null | undefined,
    partialOptions: Partial<TerminalState['options']>,
  ): void {
    this._sessionStore.setOptions(terminalId, partialOptions);
  }

  public appendLine(
    terminalId: string | null | undefined,
    raw: string,
    kind: TerminalLineKind = 'output',
  ): void {
    this.ensureTerminal(terminalId);
    this._logStore.appendLine(terminalId, raw, kind);
  }

  public appendError(terminalId: string | null | undefined, raw: string): void {
    this.appendLine(terminalId, raw, 'error');
  }

  public clear(terminalId: string | null | undefined): void {
    this.ensureTerminal(terminalId);
    this._logStore.clear(terminalId);
    this._sessionStore.resetSuggestions(terminalId);
  }

  public setAutoScrollEnabled(terminalId: string | null | undefined, enabled: boolean): void {
    this._sessionStore.setAutoScrollEnabled(terminalId, enabled);
  }

  public setInputValue(terminalId: string | null | undefined, value: string): void {
    this._sessionStore.setInputValue(terminalId, value);
  }

  public pushHistory(terminalId: string | null | undefined, value: string): void {
    this._sessionStore.pushHistory(terminalId, value);
  }

  public moveHistory(terminalId: string | null | undefined, direction: 'up' | 'down'): string {
    return this._sessionStore.moveHistory(terminalId, direction);
  }

  public setSuggestions(
    terminalId: string | null | undefined,
    suggestions: TerminalState['suggestions'],
    ghostCompletion: string | null,
  ): void {
    this._sessionStore.setSuggestions(terminalId, suggestions, ghostCompletion);
  }

  public resetSuggestions(terminalId: string | null | undefined): void {
    this._sessionStore.resetSuggestions(terminalId);
  }

  private _composeState(
    sessionState: TerminalSessionState,
    lines: readonly TerminalLine[],
  ): TerminalState {
    const retainedLines: readonly TerminalLine[] = lines.slice(-sessionState.options.maxLines);

    return {
      id: sessionState.id,
      lines: retainedLines,
      visibleLines: this._getVisibleLines(
        retainedLines,
        sessionState.options.filterText,
        sessionState.options.maxLines,
      ),
      options: sessionState.options,
      autoScrollEnabled: sessionState.autoScrollEnabled,
      inputValue: sessionState.inputValue,
      history: sessionState.history,
      historyIndex: sessionState.historyIndex,
      suggestions: sessionState.suggestions,
      ghostCompletion: sessionState.ghostCompletion,
    };
  }

  private _getVisibleLines(
    lines: readonly TerminalLine[],
    filterText: string,
    maxLines: number,
  ): readonly TerminalLine[] {
    const normalizedFilterText: string = filterText.trim().toLowerCase();

    if (!normalizedFilterText) {
      return lines.slice(-maxLines);
    }

    return lines
      .filter((line: TerminalLine) => line.plainText.toLowerCase().includes(normalizedFilterText))
      .slice(-maxLines);
  }
}
