import { Injectable, Signal, inject, signal } from '@angular/core';

import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TerminalCommandSuggestion } from '../models/terminal-command.model';
import { TerminalLine, TerminalLineKind } from '../models/terminal-line.model';
import {
  DEFAULT_TERMINAL_OPTIONS,
  TerminalOptions,
} from '../models/terminal-options.model';
import { TerminalState } from '../models/terminal-state.model';
import { TerminalMarkupRenderer } from '../rendering/terminal-markup-renderer';

@Injectable({ providedIn: 'root' })
export class TerminalStore {
  private readonly _renderer = inject(TerminalMarkupRenderer);
  private readonly _sanitizer = inject(DomSanitizer);

  private readonly _states = signal<Record<string, TerminalState>>({});

  public ensureTerminal(terminalId: string): void {
    if (this._states()[terminalId]) {
      return;
    }

    const initialState: TerminalState = {
      id: terminalId,
      lines: [],
      visibleLines: [],
      options: { ...DEFAULT_TERMINAL_OPTIONS },
      autoScrollEnabled: true,
      inputValue: '',
      history: [],
      historyIndex: null,
      suggestions: [],
      ghostCompletion: null,
    };

    this._states.update((states: Record<string, TerminalState>) => ({
      ...states,
      [terminalId]: initialState,
    }));
  }

  public getStateSnapshot(terminalId: string): TerminalState | undefined {
    return this._states()[terminalId];
  }

  public getStates(): Signal<Record<string, TerminalState>> {
    return this._states.asReadonly();
  }

  public setOptions(
    terminalId: string,
    partialOptions: Partial<TerminalOptions>,
  ): void {
    this.ensureTerminal(terminalId);

    this._patchState(terminalId, (state: TerminalState): TerminalState => {
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

      return this._withVisibleLines({
        ...state,
        options: nextOptions,
      });
    });
  }

  public appendLine(
    terminalId: string,
    raw: string,
    kind: TerminalLineKind = 'output',
  ): void {
    this.ensureTerminal(terminalId);

    const rendered = this._renderer.render(raw);

    const safeHtml: SafeHtml =
      this._sanitizer.bypassSecurityTrustHtml(rendered.renderedHtml);

    const line: TerminalLine = {
      id: this._createLineId(),
      raw,
      plainText: rendered.plainText,
      renderedHtml: safeHtml,
      kind,
      timestamp: Date.now(),
    };

    this._patchState(terminalId, (state: TerminalState): TerminalState => {
      const maxLines: number = state.options.maxLines;
      const nextLines: readonly TerminalLine[] = [...state.lines, line].slice(-maxLines);

      return this._withVisibleLines({
        ...state,
        lines: nextLines,
      });
    });
  }

  public appendError(
    terminalId: string,
    raw: string,
  ): void {
    return this.appendLine(terminalId, raw, 'error');
  }

  public clear(terminalId: string): void {
    this.ensureTerminal(terminalId);

    this._patchState(terminalId, (state: TerminalState): TerminalState => ({
      ...state,
      lines: [],
      visibleLines: [],
      suggestions: [],
      ghostCompletion: null,
    }));
  }

  public setAutoScrollEnabled(terminalId: string, enabled: boolean): void {
    this.ensureTerminal(terminalId);

    this._patchState(terminalId, (state: TerminalState): TerminalState => {
      if (state.autoScrollEnabled === enabled) {
        return state;
      }

      return {
        ...state,
        autoScrollEnabled: enabled,
      };
    });
  }

  public setInputValue(terminalId: string, value: string): void {
    this.ensureTerminal(terminalId);

    this._patchState(terminalId, (state: TerminalState): TerminalState => {
      if (state.inputValue === value) {
        return state;
      }

      return {
        ...state,
        inputValue: value,
      };
    });
  }

  public pushHistory(terminalId: string, value: string): void {
    this.ensureTerminal(terminalId);

    if (!value.trim()) {
      return;
    }

    this._patchState(terminalId, (state: TerminalState): TerminalState => {
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

  public moveHistory(terminalId: string, direction: 'up' | 'down'): string {
    this.ensureTerminal(terminalId);

    const state: TerminalState | undefined = this._states()[terminalId];

    if (!state) {
      return '';
    }

    const historyLength: number = state.history.length;

    if (historyLength === 0) {
      return state.inputValue;
    }

    let nextIndex: number | null = state.historyIndex;

    if (direction === 'up') {
      nextIndex =
        nextIndex === null ? historyLength - 1 : Math.max(nextIndex - 1, 0);
    } else if (nextIndex !== null) {
      nextIndex = nextIndex + 1 >= historyLength ? null : nextIndex + 1;
    }

    const nextValue: string =
      nextIndex === null ? '' : (state.history[nextIndex] ?? '');

    this._patchState(terminalId, (currentState: TerminalState): TerminalState => {
      if (
        currentState.historyIndex === nextIndex &&
        currentState.inputValue === nextValue
      ) {
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
    terminalId: string,
    suggestions: readonly TerminalCommandSuggestion[],
    ghostCompletion: string | null,
  ): void {
    this.ensureTerminal(terminalId);

    this._patchState(terminalId, (state: TerminalState): TerminalState => {
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

  public resetSuggestions(terminalId: string): void {
    this.ensureTerminal(terminalId);

    this._patchState(terminalId, (state: TerminalState): TerminalState => {
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
    terminalId: string,
    updater: (state: TerminalState) => TerminalState,
  ): void {
    this._states.update((states: Record<string, TerminalState>) => {
      const currentState: TerminalState | undefined = states[terminalId];

      if (!currentState) {
        return states;
      }

      const nextState: TerminalState = updater(currentState);

      if (nextState === currentState) {
        return states;
      }

      return {
        ...states,
        [terminalId]: nextState,
      };
    });
  }

  private _withVisibleLines(state: TerminalState): TerminalState {
    const normalizedFilter: string = state.options.filterText.trim().toLowerCase();

    if (!normalizedFilter) {
      if (state.visibleLines === state.lines) {
        return state;
      }

      return {
        ...state,
        visibleLines: state.lines,
      };
    }

    const visibleLines: readonly TerminalLine[] = state.lines.filter(
      (line: TerminalLine) =>
        line.plainText.toLowerCase().includes(normalizedFilter),
    );

    return {
      ...state,
      visibleLines,
    };
  }

  private _createLineId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}