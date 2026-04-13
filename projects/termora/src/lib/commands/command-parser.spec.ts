import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { CommandParser } from './command-parser';

describe('CommandParser', () => {
  let parser: CommandParser;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CommandParser],
    });

    parser = TestBed.inject(CommandParser);
  });

  it('should return an empty parsed result for blank input', () => {
    expect(parser.parse('   ')).toEqual({
      rawInput: '   ',
      commandName: null,
      arguments: [],
      activeToken: '',
      activeTokenIndex: 0,
      endsWithWhitespace: true,
    });
  });

  it('should parse a single command without arguments', () => {
    expect(parser.parse('help')).toEqual({
      rawInput: 'help',
      commandName: 'help',
      arguments: [],
      activeToken: 'help',
      activeTokenIndex: 0,
      endsWithWhitespace: false,
    });
  });

  it('should parse a command with arguments', () => {
    expect(parser.parse('open file.txt now')).toEqual({
      rawInput: 'open file.txt now',
      commandName: 'open',
      arguments: ['file.txt', 'now'],
      activeToken: 'now',
      activeTokenIndex: 2,
      endsWithWhitespace: false,
    });
  });

  it('should detect trailing whitespace and expose an empty active token', () => {
    expect(parser.parse('open file.txt ')).toEqual({
      rawInput: 'open file.txt ',
      commandName: 'open',
      arguments: ['file.txt'],
      activeToken: '',
      activeTokenIndex: 2,
      endsWithWhitespace: true,
    });
  });

  it('should trim only the left side for parsing but preserve raw input', () => {
    expect(parser.parse('   help me')).toEqual({
      rawInput: '   help me',
      commandName: 'help',
      arguments: ['me'],
      activeToken: 'me',
      activeTokenIndex: 1,
      endsWithWhitespace: false,
    });
  });

  it('should parse quoted arguments as a single token', () => {
    expect(parser.parse('open "my file.txt"')).toEqual({
      rawInput: 'open "my file.txt"',
      commandName: 'open',
      arguments: ['my file.txt'],
      activeToken: 'my file.txt',
      activeTokenIndex: 1,
      endsWithWhitespace: false,
    });
  });

  it('should keep parsing regular tokens when no quoted token is present', () => {
    expect(parser.parse('run alpha beta')).toEqual({
      rawInput: 'run alpha beta',
      commandName: 'run',
      arguments: ['alpha', 'beta'],
      activeToken: 'beta',
      activeTokenIndex: 2,
      endsWithWhitespace: false,
    });
  });
});
