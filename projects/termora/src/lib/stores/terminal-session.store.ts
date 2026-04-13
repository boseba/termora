import { Injectable, type Signal, signal } from '@angular/core';

import { type TerminalCommandSuggestion } from '../models/terminal-command.model';
import { DEFAULT_TERMINAL_OPTIONS, type TerminalOptions } from '../models/terminal-options.model';
import { type TerminalSessionState } from '../models/terminal-session-state.model';
import { getTerminalChannelKey, normalizeTerminalId } from '../utils/terminal-channel';

@Injectable({ providedIn: 'root' })
export class TerminalSessionStore {
  private readonly _states = signal<Record<string, TerminalSessionState>>({});

  public ensureTerminal(terminalId: string | null | undefined): void {
    const channelKey: string = getTerminalChannelKey(terminalId);
    const states: Record<string, TerminalSessionState> = this._states();

    if (Object.hasOwn(states, channelKey)) {
      return;
    }

    const initialState: TerminalSessionState = {
      id: normalizeTerminalId(terminalId),
      options: { ...DEFAULT_TERMINAL_OPTIONS },
      autoScrollEnabled: true,
      inputValue: '',
      history: [],
      historyIndex: null,
      suggestions: [],
      ghostCompletion: null,
    };

    this._states.update((currentStates: Record<string, TerminalSessionState>) => ({
      ...currentStates,
      [channelKey]: initialState,
    }));
  }

  public getStates(): Signal<Record<string, TerminalSessionState>> {
    return this._states.asReadonly();
  }

  public getStateSnapshot(terminalId: string | null | undefined): TerminalSessionState | undefined {
    const channelKey: string = getTerminalChannelKey(terminalId);
    const states: Record<string, TerminalSessionState> = this._states();

    return Object.hasOwn(states, channelKey) ? states[channelKey] : undefined;
  }

  public setOptions(
    terminalId: string | null | undefined,
    partialOptions: Partial<TerminalOptions>,
  ): void {
    this.ensureTerminal(terminalId);

    this._patchState(terminalId, (state: TerminalSessionState): TerminalSessionState => {
      const nextOptions: TerminalOptions = {
        ...state.options,
        ...partialOptions,
      };

      const hasChanged: boolean =
        nextOptions.maxLines !== state.options.maxLines ||
        nextOptions.showInput !== state.options.showInput ||
        nextOptions.filterText !== state.options.filterText ||
        nextOptions.commands !== state.options.commands;

      if (!hasChanged) {
        return state;
      }

      return {
        ...state,
        options: nextOptions,
      };
    });
  }

  public setAutoScrollEnabled(terminalId: string | null | undefined, enabled: boolean): void {
    this.ensureTerminal(terminalId);

    this._patchState(terminalId, (state: TerminalSessionState): TerminalSessionState => {
      if (state.autoScrollEnabled === enabled) {
        return state;
      }

      return {
        ...state,
        autoScrollEnabled: enabled,
      };
    });
  }

  public setInputValue(terminalId: string | null | undefined, value: string): void {
    this.ensureTerminal(terminalId);

    this._patchState(terminalId, (state: TerminalSessionState): TerminalSessionState => {
      if (state.inputValue === value) {
        return state;
      }

      return {
        ...state,
        inputValue: value,
      };
    });
  }

  public pushHistory(terminalId: string | null | undefined, value: string): void {
    this.ensureTerminal(terminalId);

    if (!value.trim()) {
      return;
    }

    this._patchState(terminalId, (state: TerminalSessionState): TerminalSessionState => {
      const previousEntry: string | undefined = state.history.at(-1);

      if (previousEntry === value) {
        return state.historyIndex === null
          ? state
          : {
              ...state,
              historyIndex: null,
            };
      }

      return {
        ...state,
        history: [...state.history, value],
        historyIndex: null,
      };
    });
  }

  public moveHistory(terminalId: string | null | undefined, direction: 'up' | 'down'): string {
    this.ensureTerminal(terminalId);

    const state: TerminalSessionState | undefined = this.getStateSnapshot(terminalId);

    if (!state) {
      return '';
    }

    const historyLength: number = state.history.length;

    if (historyLength === 0) {
      return state.inputValue;
    }

    let nextIndex: number | null = state.historyIndex;

    if (direction === 'up') {
      nextIndex = nextIndex === null ? historyLength - 1 : Math.max(nextIndex - 1, 0);
    } else if (nextIndex !== null) {
      nextIndex = nextIndex + 1 >= historyLength ? null : nextIndex + 1;
    }

    const nextValue: string = nextIndex === null ? '' : (state.history[nextIndex] ?? '');

    this._patchState(terminalId, (currentState: TerminalSessionState): TerminalSessionState => {
      if (currentState.historyIndex === nextIndex && currentState.inputValue === nextValue) {
        return currentState;
      }

      return {
        ...currentState,
        historyIndex: nextIndex,
        inputValue: nextValue,
      };
    });

    return nextValue;
  }

  public setSuggestions(
    terminalId: string | null | undefined,
    suggestions: readonly TerminalCommandSuggestion[],
    ghostCompletion: string | null,
  ): void {
    this.ensureTerminal(terminalId);

    this._patchState(terminalId, (state: TerminalSessionState): TerminalSessionState => {
      const sameSuggestions: boolean = state.suggestions === suggestions;
      const sameGhostCompletion: boolean = state.ghostCompletion === ghostCompletion;

      if (sameSuggestions && sameGhostCompletion) {
        return state;
      }

      return {
        ...state,
        suggestions,
        ghostCompletion,
      };
    });
  }

  public resetSuggestions(terminalId: string | null | undefined): void {
    this.ensureTerminal(terminalId);

    this._patchState(terminalId, (state: TerminalSessionState): TerminalSessionState => {
      if (state.suggestions.length === 0 && state.ghostCompletion === null) {
        return state;
      }

      return {
        ...state,
        suggestions: [],
        ghostCompletion: null,
      };
    });
  }

  private _patchState(
    terminalId: string | null | undefined,
    updater: (state: TerminalSessionState) => TerminalSessionState,
  ): void {
    const channelKey: string = getTerminalChannelKey(terminalId);

    this._states.update((states: Record<string, TerminalSessionState>) => {
      if (!Object.hasOwn(states, channelKey)) {
        return states;
      }

      const currentState: TerminalSessionState = states[channelKey];
      const nextState: TerminalSessionState = updater(currentState);

      if (nextState === currentState) {
        return states;
      }

      return {
        ...states,
        [channelKey]: nextState,
      };
    });
  }
}
