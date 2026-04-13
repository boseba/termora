import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { TerminalCommandDefinition } from '../models/terminal-command.model';
import { CommandRegistry } from './command-registry';

function createCommand(
  name: string,
  description = `${name} description`,
): TerminalCommandDefinition {
  return {
    name,
    description,
    execute: () => undefined,
  };
}

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CommandRegistry],
    });

    registry = TestBed.inject(CommandRegistry);
  });

  it('should return native commands followed by custom commands', () => {
    const customCommands = [createCommand('help'), createCommand('open')];

    const result = registry.getAll(customCommands);

    expect(result.map((command) => command.name)).toEqual(['clear', 'help', 'open']);
  });

  it('should return null when command name is null', () => {
    expect(registry.find(null, [createCommand('help')])).toBeNull();
  });

  it('should find native commands case-insensitively', () => {
    const result = registry.find('CLEAR', [createCommand('help')]);

    expect(result?.name).toBe('clear');
  });

  it('should find custom commands case-insensitively', () => {
    const result = registry.find('HeLp', [createCommand('help')]);

    expect(result?.name).toBe('help');
  });

  it('should return null when command does not exist', () => {
    expect(registry.find('missing', [createCommand('help')])).toBeNull();
  });

  it('should suggest commands filtered by prefix and sorted alphabetically', () => {
    const commands = [
      createCommand('zoom'),
      createCommand('help'),
      createCommand('hello'),
      createCommand('halt'),
    ];

    const result = registry.suggestCommands('he', commands);

    expect(result.map((command) => command.name)).toEqual(['hello', 'help']);
  });

  it('should include native commands in suggestions', () => {
    const result = registry.suggestCommands('cl', [createCommand('help')]);

    expect(result.map((command) => command.name)).toEqual(['clear']);
  });

  it('should return all commands when prefix is empty', () => {
    const result = registry.suggestCommands('', [createCommand('b'), createCommand('a')]);

    expect(result.map((command) => command.name)).toEqual(['a', 'b', 'clear']);
  });
});
