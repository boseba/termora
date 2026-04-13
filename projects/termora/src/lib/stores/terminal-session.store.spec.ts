import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type { TerminalCommandSuggestion } from '../models/terminal-command.model';
import { TerminalSessionStore } from './terminal-session.store';

describe('TerminalSessionStore', () => {
  let store: TerminalSessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TerminalSessionStore],
    });

    store = TestBed.inject(TerminalSessionStore);
  });

  it('should initialize the global terminal once', () => {
    store.ensureTerminal(undefined);
    store.ensureTerminal(undefined);

    const states = store.getStates()();

    expect(Object.keys(states)).toEqual(['__termora_global__']);
    expect(states['__termora_global__'].id).toBeNull();
  });

  it('should initialize a named terminal', () => {
    store.ensureTerminal('main');

    const state = store.getStateSnapshot('main');

    expect(state?.id).toBe('main');
    expect(state?.inputValue).toBe('');
    expect(state?.history).toEqual([]);
    expect(state?.suggestions).toEqual([]);
  });

  it('should set options only when values change', () => {
    store.ensureTerminal('main');

    const before = store.getStateSnapshot('main');

    store.setOptions('main', { maxLines: 123 });

    const after = store.getStateSnapshot('main');

    expect(after?.options.maxLines).toBe(123);
    expect(after).not.toBe(before);
  });

  it('should not replace state when setOptions does not change anything', () => {
    store.ensureTerminal('main');

    const before = store.getStateSnapshot('main');

    store.setOptions('main', {});

    const after = store.getStateSnapshot('main');

    expect(after).toBe(before);
  });

  it('should update auto scroll', () => {
    store.ensureTerminal('main');

    store.setAutoScrollEnabled('main', false);

    expect(store.getStateSnapshot('main')?.autoScrollEnabled).toBe(false);
  });

  it('should update input value', () => {
    store.ensureTerminal('main');

    store.setInputValue('main', 'hello');

    expect(store.getStateSnapshot('main')?.inputValue).toBe('hello');
  });

  it('should push history and reset history index', () => {
    store.ensureTerminal('main');

    store.pushHistory('main', 'help');
    store.pushHistory('main', 'open');

    expect(store.getStateSnapshot('main')?.history).toEqual(['help', 'open']);
    expect(store.getStateSnapshot('main')?.historyIndex).toBeNull();
  });

  it('should not push blank history entries', () => {
    store.ensureTerminal('main');

    store.pushHistory('main', '   ');

    expect(store.getStateSnapshot('main')?.history).toEqual([]);
  });

  it('should not duplicate the last history entry and should reset history index', () => {
    store.ensureTerminal('main');

    store.pushHistory('main', 'help');
    store.moveHistory('main', 'up');

    store.pushHistory('main', 'help');

    const state = store.getStateSnapshot('main');

    expect(state?.history).toEqual(['help']);
    expect(state?.historyIndex).toBeNull();
  });

  it('should move through history up and down', () => {
    store.ensureTerminal('main');
    store.pushHistory('main', 'first');
    store.pushHistory('main', 'second');

    expect(store.moveHistory('main', 'up')).toBe('second');
    expect(store.moveHistory('main', 'up')).toBe('first');
    expect(store.moveHistory('main', 'down')).toBe('second');
    expect(store.moveHistory('main', 'down')).toBe('');
  });

  it('should keep current input when history is empty', () => {
    store.ensureTerminal('main');
    store.setInputValue('main', 'draft');

    expect(store.moveHistory('main', 'up')).toBe('draft');
  });

  it('should set suggestions and ghost completion', () => {
    const suggestions: readonly TerminalCommandSuggestion[] = [{ value: 'help' }];

    store.ensureTerminal('main');
    store.setSuggestions('main', suggestions, 'lp');

    const state = store.getStateSnapshot('main');

    expect(state?.suggestions).toBe(suggestions);
    expect(state?.ghostCompletion).toBe('lp');
  });

  it('should reset suggestions', () => {
    store.ensureTerminal('main');
    store.setSuggestions('main', [{ value: 'help' }], 'lp');

    store.resetSuggestions('main');

    const state = store.getStateSnapshot('main');

    expect(state?.suggestions).toEqual([]);
    expect(state?.ghostCompletion).toBeNull();
  });

  it('should not replace state when resetSuggestions is already clean', () => {
    store.ensureTerminal('main');

    const before = store.getStateSnapshot('main');

    store.resetSuggestions('main');

    const after = store.getStateSnapshot('main');

    expect(after).toBe(before);
  });
});
