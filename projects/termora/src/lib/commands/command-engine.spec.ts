import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ParsedCommandInput,
  TerminalCommandDefinition,
} from '../models/terminal-command.model';
import { CommandEngine } from './command-engine';
import { CommandParser } from './command-parser';
import { CommandRegistry } from './command-registry';

function createCommand(
  overrides: Partial<TerminalCommandDefinition> = {},
): TerminalCommandDefinition {
  return {
    name: 'help',
    description: 'Show help',
    execute: () => undefined,
    ...overrides,
  };
}

function createParsedInput(overrides: Partial<ParsedCommandInput> = {}): ParsedCommandInput {
  return {
    rawInput: '',
    commandName: null,
    arguments: [],
    activeToken: '',
    activeTokenIndex: 0,
    endsWithWhitespace: false,
    ...overrides,
  };
}

describe('CommandEngine', () => {
  let engine: CommandEngine;

  let parserMock: {
    parse: ReturnType<typeof vi.fn>;
  };

  let registryMock: {
    find: ReturnType<typeof vi.fn>;
    suggestCommands: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    parserMock = {
      parse: vi.fn(),
    };

    registryMock = {
      find: vi.fn(),
      suggestCommands: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CommandEngine,
        { provide: CommandParser, useValue: parserMock },
        { provide: CommandRegistry, useValue: registryMock },
      ],
    });

    engine = TestBed.inject(CommandEngine);
  });

  it('should return an empty resolution when no command name is present', () => {
    const parsed = createParsedInput({ commandName: null });
    parserMock.parse.mockReturnValue(parsed);

    const result = engine.resolve('', []);

    expect(result).toEqual({
      parsed,
      command: null,
      suggestions: [],
      ghostCompletion: null,
    });
  });

  it('should resolve command suggestions for the first token', () => {
    const parsed = createParsedInput({
      rawInput: 'he',
      commandName: 'he',
      activeToken: 'he',
      activeTokenIndex: 0,
      endsWithWhitespace: false,
    });

    const suggestedCommands = [
      createCommand({ name: 'help' }),
      createCommand({ name: 'hello', description: 'Hello command' }),
    ];

    parserMock.parse.mockReturnValue(parsed);
    registryMock.suggestCommands.mockReturnValue(suggestedCommands);
    registryMock.find.mockReturnValue(null);

    const result = engine.resolve('he', []);

    expect(registryMock.suggestCommands).toHaveBeenCalledExactlyOnceWith('he', []);
    expect(result.command).toBeNull();
    expect(result.suggestions).toEqual([
      { value: 'help', description: 'Show help' },
      { value: 'hello', description: 'Hello command' },
    ]);
    expect(result.ghostCompletion).toBe('lp');
  });

  it('should return the full suggestion as ghost completion when current value is empty', () => {
    const parsed = createParsedInput({
      rawInput: '',
      commandName: 'help',
      activeToken: '',
      activeTokenIndex: 0,
      endsWithWhitespace: false,
    });

    parserMock.parse.mockReturnValue(parsed);
    registryMock.suggestCommands.mockReturnValue([createCommand({ name: 'help' })]);
    registryMock.find.mockReturnValue(null);

    const result = engine.resolve('', []);

    expect(result.ghostCompletion).toBe('help');
  });

  it('should return null ghost completion when the first suggestion does not start with the current value', () => {
    const parsed = createParsedInput({
      rawInput: 'zz',
      commandName: 'zz',
      activeToken: 'zz',
      activeTokenIndex: 0,
      endsWithWhitespace: false,
    });

    parserMock.parse.mockReturnValue(parsed);
    registryMock.suggestCommands.mockReturnValue([createCommand({ name: 'help' })]);
    registryMock.find.mockReturnValue(null);

    const result = engine.resolve('zz', []);

    expect(result.ghostCompletion).toBeNull();
  });

  it('should resolve parameter suggestions for enum arguments', () => {
    const command = createCommand({
      name: 'open',
      argumentSpec: [
        {
          type: 'enum',
          values: ['file.txt', 'folder', 'final.log'],
        },
      ],
    });

    const parsed = createParsedInput({
      rawInput: 'open fi',
      commandName: 'open',
      arguments: ['fi'],
      activeTokenIndex: 1,
      endsWithWhitespace: false,
    });

    parserMock.parse.mockReturnValue(parsed);
    registryMock.find.mockReturnValue(command);

    const result = engine.resolve('open fi', []);

    expect(result.command).toBe(command);
    expect(result.suggestions).toEqual([{ value: 'file.txt' }, { value: 'final.log' }]);
    expect(result.ghostCompletion).toBe('le.txt');
  });

  it('should resolve parameter suggestions for one-of arguments', () => {
    const command = createCommand({
      name: 'open',
      argumentSpec: [
        {
          type: 'one-of',
          values: [
            {
              type: 'enum',
              values: ['alpha', 'beta'],
            },
            {
              type: 'quoted-string',
            },
          ],
        },
      ],
    });

    const parsed = createParsedInput({
      rawInput: 'open a',
      commandName: 'open',
      arguments: ['a'],
      activeTokenIndex: 1,
      endsWithWhitespace: false,
    });

    parserMock.parse.mockReturnValue(parsed);
    registryMock.find.mockReturnValue(command);

    const result = engine.resolve('open a', []);

    expect(result.suggestions).toEqual([{ value: 'alpha' }]);
    expect(result.ghostCompletion).toBe('lpha');
  });

  it('should return no suggestions when command is unknown for argument completion', () => {
    const parsed = createParsedInput({
      rawInput: 'open a',
      commandName: 'open',
      arguments: ['a'],
      activeTokenIndex: 1,
      endsWithWhitespace: false,
    });

    parserMock.parse.mockReturnValue(parsed);
    registryMock.find.mockReturnValue(null);

    const result = engine.resolve('open a', []);

    expect(result).toEqual({
      parsed,
      command: null,
      suggestions: [],
      ghostCompletion: null,
    });
  });

  it('should use an empty active argument value when input ends with whitespace', () => {
    const command = createCommand({
      name: 'open',
      argumentSpec: [
        {
          type: 'enum',
          values: ['alpha', 'beta'],
        },
      ],
    });

    const parsed = createParsedInput({
      rawInput: 'open ',
      commandName: 'open',
      arguments: [],
      activeTokenIndex: 1,
      endsWithWhitespace: true,
    });

    parserMock.parse.mockReturnValue(parsed);
    registryMock.find.mockReturnValue(command);

    const result = engine.resolve('open ', []);

    expect(result.suggestions).toEqual([{ value: 'alpha' }, { value: 'beta' }]);
    expect(result.ghostCompletion).toBe('alpha');
  });

  it('should return an execution context with api helpers', () => {
    const command = createCommand();
    const parsed = createParsedInput({
      rawInput: 'help',
      commandName: 'help',
      arguments: ['one'],
    });

    const print = vi.fn();
    const clear = vi.fn();

    parserMock.parse.mockReturnValue(parsed);

    engine.execute('main', 'help', command, print, clear);

    expect(parserMock.parse).toHaveBeenCalledExactlyOnceWith('help');

    const executeSpy = vi.spyOn(command, 'execute');

    engine.execute('main', 'help', command, print, clear);

    expect(executeSpy).toHaveBeenCalledOnce();

    const context = executeSpy.mock.calls[0][0];
    expect(context.terminalId).toBe('main');
    expect(context.rawInput).toBe('help');
    expect(context.arguments).toEqual(['one']);

    context.api.print('hello');
    context.api.clear();

    expect(print).toHaveBeenCalledExactlyOnceWith('hello');
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
