import { InjectionToken } from '@angular/core';

import { type TermoraConfig } from '../models/termora-config.model';

export const TERMORA_CONFIG = new InjectionToken<TermoraConfig>('TERMORA_CONFIG');
