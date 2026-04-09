import { signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandEngine } from '../commands/command-engine';
import { CommandRegistry } from '../commands/command-registry';
import type {
  TerminalCommandDefinition,
  TerminalCommandResolution,
  TerminalCommandSuggestion,
} from '../models/terminal-command.model';
import { DEFAULT_TERMINAL_OPTIONS, type TerminalOptions } from '../models/terminal-options.model';
import type { TerminalState } from '../models/terminal-state.model';
import { TerminalStore } from '../stores/terminal.store';
import { TerminalService } from './terminal.service';

function createOptions(overrides: Partial<TerminalOptions> = {}): TerminalOptions {
  return {
    ...DEFAULT_TERMINAL_OPTIONS,
    ...overrides,
  };
}

function createCommandDefinition(
  overrides: Partial<TerminalCommandDefinition> = {},
): TerminalCommandDefinition {
  return {
    name: 'help',
    description: 'Show help',
    execute: (): void => {
      // Intentionally empty for tests.
    },
    ...overrides,
  };
}

function createResolution(
  overrides: Partial<TerminalCommandResolution> = {},
): TerminalCommandResolution {
  return {
    parsed: {
      rawInput: '',
      commandName: null,
      arguments: [],
      activeToken: '',
      activeTokenIndex: 0,
      endsWithWhitespace: false,
    },
    command: null,
    suggestions: [] as readonly TerminalCommandSuggestion[],
    ghostCompletion: null,
    ...overrides,
  };
}

function createState(overrides: Partial<TerminalState> = {}): TerminalState {
  return {
    inputValue: '',
    suggestions: [],
    options: createOptions(),
    ...overrides,
  } as TerminalState;
}
describe('TerminalService', () => {
  let service: TerminalService;

  let storeMock: {
    ensureTerminal: ReturnType<typeof vi.fn>;
    getStates: ReturnType<typeof vi.fn>;
    getStateSnapshot: ReturnType<typeof vi.fn>;
    setOptions: ReturnType<typeof vi.fn>;
    appendLine: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    setAutoScrollEnabled: ReturnType<typeof vi.fn>;
    setInputValue: ReturnType<typeof vi.fn>;
    setSuggestions: ReturnType<typeof vi.fn>;
    moveHistory: ReturnType<typeof vi.fn>;
    pushHistory: ReturnType<typeof vi.fn>;
    resetSuggestions: ReturnType<typeof vi.fn>;
    appendError: ReturnType<typeof vi.fn>;
  };

  let engineMock: {
    resolve: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
  };

  let registryMock: {
    find: ReturnType<typeof vi.fn>;
  };

  let statesSignal: Signal<Record<string, TerminalState>>;

  beforeEach(() => {
    statesSignal = signal<Record<string, TerminalState>>({});

    storeMock = {
      ensureTerminal: vi.fn(),
      getStates: vi.fn(() => statesSignal),
      getStateSnapshot: vi.fn(),
      setOptions: vi.fn(),
      appendLine: vi.fn(),
      clear: vi.fn(),
      setAutoScrollEnabled: vi.fn(),
      setInputValue: vi.fn(),
      setSuggestions: vi.fn(),
      moveHistory: vi.fn(),
      pushHistory: vi.fn(),
      resetSuggestions: vi.fn(),
      appendError: vi.fn(),
    };

    engineMock = {
      resolve: vi.fn(),
      execute: vi.fn(),
    };

    registryMock = {
      find: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TerminalService,
        { provide: TerminalStore, useValue: storeMock },
        { provide: CommandEngine, useValue: engineMock },
        { provide: CommandRegistry, useValue: registryMock },
      ],
    });

    service = TestBed.inject(TerminalService);
  });

  describe('simple delegations', () => {
    it('should delegate ensureTerminal to the store', () => {
      service.ensureTerminal('main');

      expect(storeMock.ensureTerminal).toHaveBeenCalledExactlyOnceWith('main');
    });

    it('should return the states signal from the store', () => {
      const result = service.getStates();

      expect(result).toBe(statesSignal);
      expect(storeMock.getStates).toHaveBeenCalledOnce();
    });

    it('should return a terminal snapshot from the store', () => {
      const state = createState();
      storeMock.getStateSnapshot.mockReturnValue(state);

      const result = service.getStateSnapshot('main');

      expect(result).toBe(state);
      expect(storeMock.getStateSnapshot).toHaveBeenCalledExactlyOnceWith('main');
    });

    it('should configure terminal options through the store', () => {
      service.configure('main', { maxLines: 250 });

      expect(storeMock.setOptions).toHaveBeenCalledExactlyOnceWith('main', {
        maxLines: 250,
      });
    });

    it('should print output through the store', () => {
      service.print('main', 'hello');

      expect(storeMock.appendLine).toHaveBeenCalledExactlyOnceWith('main', 'hello', 'output');
    });

    it('should clear the terminal through the store', () => {
      service.clear('main');

      expect(storeMock.clear).toHaveBeenCalledExactlyOnceWith('main');
    });

    it('should update auto-scroll through the store', () => {
      service.setAutoScrollEnabled('main', true);

      expect(storeMock.setAutoScrollEnabled).toHaveBeenCalledExactlyOnceWith('main', true);
    });

    it('should set commands through store options', () => {
      const commands = [createCommandDefinition({ name: 'help' })];

      service.setCommands('main', commands);

      expect(storeMock.setOptions).toHaveBeenCalledExactlyOnceWith('main', {
        commands,
      });
    });

    it('should set filter through store options', () => {
      service.setFilter('main', 'abc');

      expect(storeMock.setOptions).toHaveBeenCalledExactlyOnceWith('main', {
        filterText: 'abc',
      });
    });

    it('should set max lines through store options', () => {
      service.setMaxLines('main', 50);

      expect(storeMock.setOptions).toHaveBeenCalledExactlyOnceWith('main', {
        maxLines: 50,
      });
    });
  });

  describe('updateInput', () => {
    it('should do nothing when terminal state does not exist', () => {
      storeMock.getStateSnapshot.mockReturnValue(undefined);

      service.updateInput('main', 'help');

      expect(engineMock.resolve).not.toHaveBeenCalled();
      expect(storeMock.setInputValue).not.toHaveBeenCalled();
      expect(storeMock.setSuggestions).not.toHaveBeenCalled();
    });

    it('should resolve input and update value and suggestions', () => {
      const commands = [createCommandDefinition({ name: 'help' })];
      const state = createState({
        options: createOptions({ commands }),
      });
      const resolution = createResolution({
        suggestions: [{ value: 'help' }],
        ghostCompletion: 'help',
      });

      storeMock.getStateSnapshot.mockReturnValue(state);
      engineMock.resolve.mockReturnValue(resolution);

      service.updateInput('main', 'he');

      expect(engineMock.resolve).toHaveBeenCalledExactlyOnceWith('he', commands);
      expect(storeMock.setInputValue).toHaveBeenCalledExactlyOnceWith('main', 'he');
      expect(storeMock.setSuggestions).toHaveBeenCalledExactlyOnceWith(
        'main',
        resolution.suggestions,
        resolution.ghostCompletion,
      );
    });
  });

  describe('moveHistory', () => {
    it('should return next value when terminal state does not exist', () => {
      storeMock.moveHistory.mockReturnValue('previous');
      storeMock.getStateSnapshot.mockReturnValue(undefined);

      const result = service.moveHistory('main', 'up');

      expect(result).toBe('previous');
      expect(engineMock.resolve).not.toHaveBeenCalled();
      expect(storeMock.setSuggestions).not.toHaveBeenCalled();
    });

    it('should resolve moved history value and update suggestions', () => {
      const commands = [createCommandDefinition({ name: 'help' })];
      const state = createState({
        options: createOptions({ commands }),
      });
      const resolution = createResolution({
        suggestions: [{ value: 'help' }],
        ghostCompletion: 'lp',
      });

      storeMock.moveHistory.mockReturnValue('help');
      storeMock.getStateSnapshot.mockReturnValue(state);
      engineMock.resolve.mockReturnValue(resolution);

      const result = service.moveHistory('main', 'up');

      expect(result).toBe('help');
      expect(engineMock.resolve).toHaveBeenCalledExactlyOnceWith('help', commands);
      expect(storeMock.setSuggestions).toHaveBeenCalledExactlyOnceWith(
        'main',
        resolution.suggestions,
        resolution.ghostCompletion,
      );
    });
  });

  describe('applyFirstSuggestion', () => {
    it('should return null when terminal state does not exist', () => {
      storeMock.getStateSnapshot.mockReturnValue(undefined);

      const result = service.applyFirstSuggestion('main');

      expect(result).toBeNull();
    });

    it('should return null when no suggestion is available', () => {
      storeMock.getStateSnapshot.mockReturnValue(
        createState({
          inputValue: 'he',
          suggestions: [],
        }),
      );

      const result = service.applyFirstSuggestion('main');

      expect(result).toBeNull();
      expect(engineMock.resolve).not.toHaveBeenCalled();
    });

    it('should replace the first token when active token index is 0', () => {
      const commands = [createCommandDefinition({ name: 'help' })];
      const state = createState({
        inputValue: 'he',
        suggestions: [{ value: 'help' }],
        options: createOptions({ commands }),
      });
      const resolution = createResolution({
        parsed: {
          rawInput: 'he',
          commandName: 'he',
          arguments: [],
          activeToken: 'he',
          activeTokenIndex: 0,
          endsWithWhitespace: false,
        },
      });

      storeMock.getStateSnapshot.mockReturnValue(state);
      engineMock.resolve.mockReturnValue(resolution);

      const updateInputSpy = vi.spyOn(service, 'updateInput').mockImplementation((): void => {});

      const result = service.applyFirstSuggestion('main');

      expect(result).toBe('help');
      expect(engineMock.resolve).toHaveBeenCalledExactlyOnceWith('he', commands);
      expect(updateInputSpy).toHaveBeenCalledExactlyOnceWith('main', 'help');
    });

    it('should replace the active argument token when active token index is greater than 0', () => {
      const commands = [createCommandDefinition({ name: 'open' })];
      const state = createState({
        inputValue: 'open fil',
        suggestions: [{ value: 'file.txt' }],
        options: createOptions({ commands }),
      });
      const resolution = createResolution({
        parsed: {
          rawInput: 'open fil',
          commandName: 'open',
          arguments: ['fil'],
          activeToken: 'fil',
          activeTokenIndex: 1,
          endsWithWhitespace: false,
        },
      });

      storeMock.getStateSnapshot.mockReturnValue(state);
      engineMock.resolve.mockReturnValue(resolution);

      const updateInputSpy = vi.spyOn(service, 'updateInput').mockImplementation((): void => {});

      const result = service.applyFirstSuggestion('main');

      expect(result).toBe('open file.txt');
      expect(updateInputSpy).toHaveBeenCalledExactlyOnceWith('main', 'open file.txt');
    });
  });

  describe('submitCommand', () => {
    it('should treat empty trimmed input as handled without clearing', () => {
      const result = service.submitCommand('main', '   ');

      expect(result).toEqual({
        handled: true,
        cleared: false,
        rawInput: '   ',
      });

      expect(storeMock.getStateSnapshot).not.toHaveBeenCalled();
      expect(storeMock.pushHistory).not.toHaveBeenCalled();
    });

    it('should return not handled when terminal state does not exist', () => {
      storeMock.getStateSnapshot.mockReturnValue(undefined);

      const result = service.submitCommand('main', '   help   ');

      expect(result).toEqual({
        handled: false,
        cleared: false,
        rawInput: 'help',
      });

      expect(storeMock.getStateSnapshot).toHaveBeenCalledExactlyOnceWith('main');
      expect(storeMock.pushHistory).not.toHaveBeenCalled();
    });

    it('should append command and error when command is not found', () => {
      const commands = [createCommandDefinition({ name: 'help' })];
      const state = createState({
        options: createOptions({ commands }),
      });
      const resolution = createResolution({
        parsed: {
          rawInput: 'unknown',
          commandName: 'unknown',
          arguments: [],
          activeToken: 'unknown',
          activeTokenIndex: 0,
          endsWithWhitespace: false,
        },
      });

      storeMock.getStateSnapshot.mockReturnValue(state);
      engineMock.resolve.mockReturnValue(resolution);
      registryMock.find.mockReturnValue(undefined);

      const result = service.submitCommand('main', '  unknown  ');

      expect(engineMock.resolve).toHaveBeenCalledExactlyOnceWith('unknown', commands);
      expect(registryMock.find).toHaveBeenCalledExactlyOnceWith('unknown', commands);

      expect(storeMock.pushHistory).toHaveBeenCalledExactlyOnceWith('main', 'unknown');
      expect(storeMock.setInputValue).toHaveBeenCalledExactlyOnceWith('main', '');
      expect(storeMock.resetSuggestions).toHaveBeenCalledExactlyOnceWith('main');

      expect(storeMock.appendLine).toHaveBeenCalledExactlyOnceWith('main', 'unknown', 'command');
      expect(storeMock.appendError).toHaveBeenCalledExactlyOnceWith(
        'main',
        `[i][color="var(--termora-color-error)"]command 'unknown' not found[/color][/i]`,
      );

      expect(result).toEqual({
        handled: false,
        cleared: false,
        rawInput: 'unknown',
      });

      expect(engineMock.execute).not.toHaveBeenCalled();
    });

    it('should append command and execute a known non-clear command', () => {
      const command = createCommandDefinition({ name: 'help' });
      const commands = [command];
      const state = createState({
        options: createOptions({ commands }),
      });
      const resolution = createResolution({
        parsed: {
          rawInput: 'help',
          commandName: 'help',
          arguments: [],
          activeToken: 'help',
          activeTokenIndex: 0,
          endsWithWhitespace: false,
        },
      });

      storeMock.getStateSnapshot.mockReturnValue(state);
      engineMock.resolve.mockReturnValue(resolution);
      registryMock.find.mockReturnValue(command);

      const result = service.submitCommand('main', '  help  ');

      expect(storeMock.pushHistory).toHaveBeenCalledExactlyOnceWith('main', 'help');
      expect(storeMock.setInputValue).toHaveBeenCalledExactlyOnceWith('main', '');
      expect(storeMock.resetSuggestions).toHaveBeenCalledExactlyOnceWith('main');
      expect(storeMock.appendLine).toHaveBeenCalledExactlyOnceWith('main', 'help', 'command');

      expect(engineMock.execute).toHaveBeenCalledOnce();

      const executeArgs = engineMock.execute.mock.calls[0];
      const writeOutput = executeArgs[3] as (value: string) => void;
      const clearTerminal = executeArgs[4] as () => void;

      expect(executeArgs[0]).toBe('main');
      expect(executeArgs[1]).toBe('help');
      expect(executeArgs[2]).toBe(command);

      writeOutput('output line');
      clearTerminal();

      expect(storeMock.appendLine).toHaveBeenNthCalledWith(2, 'main', 'output line', 'output');
      expect(storeMock.clear).toHaveBeenCalledExactlyOnceWith('main');

      expect(result).toEqual({
        handled: true,
        cleared: false,
        rawInput: 'help',
      });
    });

    it('should execute clear command without appending the command line', () => {
      const command = createCommandDefinition({ name: 'CLEAR' });
      const commands = [command];
      const state = createState({
        options: createOptions({ commands }),
      });
      const resolution = createResolution({
        parsed: {
          rawInput: 'clear',
          commandName: 'clear',
          arguments: [],
          activeToken: 'clear',
          activeTokenIndex: 0,
          endsWithWhitespace: false,
        },
      });

      storeMock.getStateSnapshot.mockReturnValue(state);
      engineMock.resolve.mockReturnValue(resolution);
      registryMock.find.mockReturnValue(command);

      const result = service.submitCommand('main', ' clear ');

      expect(storeMock.pushHistory).toHaveBeenCalledExactlyOnceWith('main', 'clear');
      expect(storeMock.setInputValue).toHaveBeenCalledExactlyOnceWith('main', '');
      expect(storeMock.resetSuggestions).toHaveBeenCalledExactlyOnceWith('main');

      expect(storeMock.appendLine).not.toHaveBeenCalledWith('main', 'clear', 'command');
      expect(engineMock.execute).toHaveBeenCalledOnce();

      expect(result).toEqual({
        handled: true,
        cleared: true,
        rawInput: 'clear',
      });
    });
  });
});
