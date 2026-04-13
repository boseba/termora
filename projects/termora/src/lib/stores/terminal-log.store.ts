import { Injectable, type Signal, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

import { type TerminalLine, type TerminalLineKind } from '../models/terminal-line.model';
import { TerminalMarkupRenderer } from '../rendering/terminal-markup-renderer';
import { getTerminalChannelKey } from '../utils/terminal-channel';

const DEFAULT_MAX_STORED_LINES = 1000;

@Injectable({ providedIn: 'root' })
export class TerminalLogStore {
  private readonly _renderer = inject(TerminalMarkupRenderer);
  private readonly _sanitizer = inject(DomSanitizer);

  private readonly _linesByChannel = signal<Record<string, readonly TerminalLine[]>>({});
  private readonly _maxStoredLines = signal<number>(DEFAULT_MAX_STORED_LINES);

  public getLinesByChannel(): Signal<Record<string, readonly TerminalLine[]>> {
    return this._linesByChannel.asReadonly();
  }

  public configureMaxStoredLines(maxStoredLines: number): void {
    const normalizedMaxStoredLines: number = Math.max(1, Math.trunc(maxStoredLines));

    if (this._maxStoredLines() === normalizedMaxStoredLines) {
      return;
    }

    this._maxStoredLines.set(normalizedMaxStoredLines);

    this._linesByChannel.update((linesByChannel: Record<string, readonly TerminalLine[]>) => {
      const nextLinesByChannel: Record<string, readonly TerminalLine[]> = {};

      for (const [channelKey, lines] of Object.entries(linesByChannel)) {
        nextLinesByChannel[channelKey] = lines.slice(-normalizedMaxStoredLines);
      }

      return nextLinesByChannel;
    });
  }

  public appendLine(
    terminalId: string | null | undefined,
    raw: string,
    kind: TerminalLineKind = 'output',
  ): void {
    const channelKey: string = getTerminalChannelKey(terminalId);
    const rendered = this._renderer.render(raw);

    const safeHtml: SafeHtml = this._sanitizer.bypassSecurityTrustHtml(rendered.renderedHtml);

    const line: TerminalLine = {
      id: this._createLineId(),
      raw,
      plainText: rendered.plainText,
      renderedHtml: safeHtml,
      kind,
      timestamp: Date.now(),
    };

    this._linesByChannel.update((linesByChannel: Record<string, readonly TerminalLine[]>) => {
      const currentLines: readonly TerminalLine[] = linesByChannel[channelKey] ?? [];

      return {
        ...linesByChannel,
        [channelKey]: [...currentLines, line].slice(-this._maxStoredLines()),
      };
    });
  }

  public clear(terminalId: string | null | undefined): void {
    const channelKey: string = getTerminalChannelKey(terminalId);

    this._linesByChannel.update((linesByChannel: Record<string, readonly TerminalLine[]>) => ({
      ...linesByChannel,
      [channelKey]: [],
    }));
  }

  private _createLineId(): string {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
