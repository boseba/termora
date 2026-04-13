import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { TermoraRuntimeService } from '../services/termora-runtime.service';
import { provideTermora } from './provide-termora';

describe('provideTermora', () => {
  it('should initialize the runtime service through the environment initializer', () => {
    const initialize = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideTermora(),
        {
          provide: TermoraRuntimeService,
          useValue: {
            initialize,
          },
        },
      ],
    });

    TestBed.inject(TermoraRuntimeService);

    expect(initialize).toHaveBeenCalledTimes(1);
  });
});
