import { signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TerminalLine } from '../models/terminal-line.model';
import { DEFAULT_TERMINAL_OPTIONS } from '../models/terminal-options.model';
import type { TerminalSessionState } from '../models/terminal-session-state.model';
import { TerminalLogStore } from './terminal-log.store';
import { TerminalSessionStore } from './terminal-session.store';
import { TerminalStore } from './terminal.store';

function createSessionState(overrides: Partial<TerminalSessionState> = {}): TerminalSessionState {
  return {
    id: 'main',
    options: { ...DEFAULT_TERMINAL_OPTIONS },
    autoScrollEnabled: true,
    inputValue: '',
    history: [],
    historyIndex: null,
    suggestions: [],
    ghostCompletion: null,
    ...overrides,
  };
}

function createLine(plainText: string): TerminalLine {
  return {
    id: plainText,
    raw: plainText,
    plainText,
    renderedHtml: plainText as never,
    kind: 'output',
    timestamp: 1,
  };
}

describe('TerminalStore', () => {
  let store: TerminalStore;

  let sessionStatesSignal: Signal<Record<string, TerminalSessionState>>;
  let linesByChannelSignal: Signal<Record<string, readonly TerminalLine[]>>;

  let sessionStoreMock: {
    ensureTerminal: ReturnType<typeof vi.fn>;
    getStates: ReturnType<typeof vi.fn>;
    getStateSnapshot: ReturnType<typeof vi.fn>;
    setOptions: ReturnType<typeof vi.fn>;
    setAutoScrollEnabled: ReturnType<typeof vi.fn>;
    setInputValue: ReturnType<typeof vi.fn>;
    pushHistory: ReturnType<typeof vi.fn>;
    moveHistory: ReturnType<typeof vi.fn>;
    setSuggestions: ReturnType<typeof vi.fn>;
    resetSuggestions: ReturnType<typeof vi.fn>;
  };

  let logStoreMock: {
    getLinesByChannel: ReturnType<typeof vi.fn>;
    configureMaxStoredLines: ReturnType<typeof vi.fn>;
    appendLine: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    sessionStatesSignal = signal<Record<string, TerminalSessionState>>({});
    linesByChannelSignal = signal<Record<string, readonly TerminalLine[]>>({});

    sessionStoreMock = {
      ensureTerminal: vi.fn(),
      getStates: vi.fn(() => sessionStatesSignal),
      getStateSnapshot: vi.fn(),
      setOptions: vi.fn(),
      setAutoScrollEnabled: vi.fn(),
      setInputValue: vi.fn(),
      pushHistory: vi.fn(),
      moveHistory: vi.fn(),
      setSuggestions: vi.fn(),
      resetSuggestions: vi.fn(),
    };

    logStoreMock = {
      getLinesByChannel: vi.fn(() => linesByChannelSignal),
      configureMaxStoredLines: vi.fn(),
      appendLine: vi.fn(),
      clear: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TerminalStore,
        { provide: TerminalSessionStore, useValue: sessionStoreMock },
        { provide: TerminalLogStore, useValue: logStoreMock },
      ],
    });

    store = TestBed.inject(TerminalStore);
  });

  it('should delegate ensureTerminal to the session store', () => {
    store.ensureTerminal('main');

    expect(sessionStoreMock.ensureTerminal).toHaveBeenCalledExactlyOnceWith('main');
  });

  it('should compose a terminal state from session data and channel lines', () => {
    sessionStatesSignal = signal({
      main: createSessionState({
        id: 'main',
        options: {
          ...DEFAULT_TERMINAL_OPTIONS,
          filterText: 'he',
          maxLines: 2,
        },
        inputValue: 'help',
      }),
    });

    linesByChannelSignal = signal({
      main: [createLine('alpha'), createLine('hello'), createLine('hey')],
    });

    sessionStoreMock.getStates.mockReturnValue(sessionStatesSignal);
    logStoreMock.getLinesByChannel.mockReturnValue(linesByChannelSignal);

    const rebuiltStore = TestBed.inject(TerminalStore);
    const state = rebuiltStore.getStateSnapshot('main');

    expect(state.id).toBe('main');
    expect(state.lines.map((line) => line.plainText)).toEqual(['hello', 'hey']);
    expect(state.visibleLines.map((line) => line.plainText)).toEqual(['hello', 'hey']);
    expect(state.inputValue).toBe('help');
  });

  it('should return all retained lines when there is no filter', () => {
    sessionStatesSignal = signal({
      main: createSessionState({
        id: 'main',
        options: {
          ...DEFAULT_TERMINAL_OPTIONS,
          maxLines: 2,
        },
      }),
    });

    linesByChannelSignal = signal({
      main: [createLine('one'), createLine('two'), createLine('three')],
    });

    sessionStoreMock.getStates.mockReturnValue(sessionStatesSignal);
    logStoreMock.getLinesByChannel.mockReturnValue(linesByChannelSignal);

    const rebuiltStore = TestBed.inject(TerminalStore);
    const state = rebuiltStore.getStateSnapshot('main');

    expect(state.lines.map((line) => line.plainText)).toEqual(['two', 'three']);
    expect(state.visibleLines.map((line) => line.plainText)).toEqual(['two', 'three']);
  });

  it('should throw when no composed state can be resolved', () => {
    sessionStatesSignal = signal({});
    linesByChannelSignal = signal({});

    sessionStoreMock.getStates.mockReturnValue(sessionStatesSignal);
    logStoreMock.getLinesByChannel.mockReturnValue(linesByChannelSignal);

    const rebuiltStore = TestBed.inject(TerminalStore);

    expect(() => rebuiltStore.getStateSnapshot('main')).toThrowError(
      'Terminal state could not be resolved.',
    );
  });

  it('should delegate write and session operations', () => {
    store.setOptions('main', { maxLines: 10 });
    store.configureMaxStoredLines(100);
    store.appendLine('main', 'hello', 'error');
    store.appendError('main', 'boom');
    store.clear('main');
    store.setAutoScrollEnabled('main', false);
    store.setInputValue('main', 'abc');
    store.pushHistory('main', 'help');
    store.moveHistory('main', 'up');
    store.setSuggestions('main', [{ value: 'help' }], 'lp');
    store.resetSuggestions('main');

    expect(sessionStoreMock.setOptions).toHaveBeenCalledExactlyOnceWith('main', {
      maxLines: 10,
    });
    expect(logStoreMock.configureMaxStoredLines).toHaveBeenCalledExactlyOnceWith(100);
    expect(logStoreMock.appendLine).toHaveBeenNthCalledWith(1, 'main', 'hello', 'error');
    expect(logStoreMock.appendLine).toHaveBeenNthCalledWith(2, 'main', 'boom', 'error');
    expect(logStoreMock.clear).toHaveBeenCalledExactlyOnceWith('main');
    expect(sessionStoreMock.resetSuggestions).toHaveBeenCalledTimes(2);
    expect(sessionStoreMock.setAutoScrollEnabled).toHaveBeenCalledExactlyOnceWith('main', false);
    expect(sessionStoreMock.setInputValue).toHaveBeenCalledExactlyOnceWith('main', 'abc');
    expect(sessionStoreMock.pushHistory).toHaveBeenCalledExactlyOnceWith('main', 'help');
    expect(sessionStoreMock.moveHistory).toHaveBeenCalledExactlyOnceWith('main', 'up');
    expect(sessionStoreMock.setSuggestions).toHaveBeenCalledExactlyOnceWith(
      'main',
      [{ value: 'help' }],
      'lp',
    );
  });
});
