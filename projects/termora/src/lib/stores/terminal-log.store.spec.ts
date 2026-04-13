import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TerminalMarkupRenderer } from '../rendering/terminal-markup-renderer';
import { TerminalLogStore } from './terminal-log.store';

describe('TerminalLogStore', () => {
  let store: TerminalLogStore;

  beforeEach(() => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-0000-0000-000000000001',
    );

    TestBed.configureTestingModule({
      providers: [TerminalLogStore, TerminalMarkupRenderer],
    });

    store = TestBed.inject(TerminalLogStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should append a line to the global channel when terminal id is missing', () => {
    store.appendLine(undefined, 'hello');

    const linesByChannel = store.getLinesByChannel()();
    const lines = linesByChannel['__termora_global__'];

    expect(lines).toHaveLength(1);
    expect(lines[0].id).toBe('00000000-0000-0000-0000-000000000001');
    expect(lines[0].raw).toBe('hello');
    expect(lines[0].plainText).toBe('hello');
    expect(lines[0].kind).toBe('output');
  });

  it('should append a line to a specific channel', () => {
    store.appendLine('main', 'hello', 'error');

    const lines = store.getLinesByChannel()()['main'];

    expect(lines).toHaveLength(1);
    expect(lines[0].kind).toBe('error');
  });

  it('should trim stored lines according to the configured max size', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-0000-0000-000000000001')
      .mockReturnValueOnce('00000000-0000-0000-0000-000000000002')
      .mockReturnValueOnce('00000000-0000-0000-0000-000000000003');

    store.configureMaxStoredLines(2);

    store.appendLine('main', 'one');
    store.appendLine('main', 'two');
    store.appendLine('main', 'three');

    const lines = store.getLinesByChannel()()['main'];

    expect(lines.map((line) => line.raw)).toEqual(['two', 'three']);
  });

  it('should normalize max stored lines to at least 1', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-0000-0000-000000000001')
      .mockReturnValueOnce('00000000-0000-0000-0000-000000000002');

    store.configureMaxStoredLines(0);

    store.appendLine('main', 'one');
    store.appendLine('main', 'two');

    const lines = store.getLinesByChannel()()['main'];

    expect(lines.map((line) => line.raw)).toEqual(['two']);
  });

  it('should clear a specific channel', () => {
    store.appendLine('main', 'one');
    store.appendLine('other', 'two');

    store.clear('main');

    const linesByChannel = store.getLinesByChannel()();

    expect(linesByChannel['main']).toEqual([]);
    expect(linesByChannel['other'].map((line) => line.raw)).toEqual(['two']);
  });

  it('should trim existing channels when max stored lines changes', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-0000-0000-000000000001')
      .mockReturnValueOnce('00000000-0000-0000-0000-000000000002')
      .mockReturnValueOnce('00000000-0000-0000-0000-000000000003');

    store.appendLine('main', 'one');
    store.appendLine('main', 'two');
    store.appendLine('main', 'three');

    store.configureMaxStoredLines(2);

    const lines = store.getLinesByChannel()()['main'];

    expect(lines.map((line) => line.raw)).toEqual(['two', 'three']);
  });

  it('should not change anything when max stored lines is set to the same value', () => {
    store.appendLine('main', 'one');

    const before = store.getLinesByChannel()();

    store.configureMaxStoredLines(1000);

    const after = store.getLinesByChannel()();

    expect(after).toBe(before);
  });
});
