import {
  ApplicationInitStatus,
  EnvironmentInjector,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Observable, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TermoraEvent } from '../models/termora-event.model';
import { TERMORA_CONFIG } from '../tokens/termora-config.token';
import { TerminalService } from './terminal.service';
import { TermoraRuntimeService } from './termora-runtime.service';

describe('TermoraRuntimeService', () => {
  let service: TermoraRuntimeService;
  let events$: Subject<TermoraEvent>;

  let terminalServiceMock: {
    setMaxStoredLines: ReturnType<typeof vi.fn>;
    print: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    events$ = new Subject<TermoraEvent>();

    terminalServiceMock = {
      setMaxStoredLines: vi.fn(),
      print: vi.fn(),
      clear: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TermoraRuntimeService,
        { provide: TerminalService, useValue: terminalServiceMock },
        {
          provide: TERMORA_CONFIG,
          useValue: {
            maxStoredLines: 2000,
            sources: [(): Observable<TermoraEvent> => events$],
          },
        },
      ],
    });

    service = TestBed.inject(TermoraRuntimeService);
    TestBed.inject(EnvironmentInjector);
    TestBed.inject(ApplicationInitStatus);
  });

  it('should initialize once and configure max stored lines', () => {
    service.initialize();
    service.initialize();

    expect(terminalServiceMock.setMaxStoredLines).toHaveBeenCalledExactlyOnceWith(2000);
  });

  it('should forward print events', () => {
    service.initialize();

    events$.next({
      type: 'print',
      value: 'hello',
      terminalId: 'main',
      kind: 'warning',
    });

    expect(terminalServiceMock.print).toHaveBeenCalledExactlyOnceWith('hello', {
      terminalId: 'main',
      kind: 'warning',
    });
  });

  it('should forward clear events', () => {
    service.initialize();

    events$.next({
      type: 'clear',
      terminalId: 'main',
    });

    expect(terminalServiceMock.clear).toHaveBeenCalledExactlyOnceWith('main');
  });
});
