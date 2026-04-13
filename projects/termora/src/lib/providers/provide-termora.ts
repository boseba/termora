import {
  ENVIRONMENT_INITIALIZER,
  type EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';

import { type TermoraConfig } from '../models/termora-config.model';
import { TermoraRuntimeService } from '../services/termora-runtime.service';
import { TERMORA_CONFIG } from '../tokens/termora-config.token';

export function provideTermora(config: TermoraConfig = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: TERMORA_CONFIG,
      useValue: config,
    },
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        inject(TermoraRuntimeService).initialize();
      },
    },
  ]);
}
