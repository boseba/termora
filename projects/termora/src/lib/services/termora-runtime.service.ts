import {
  DestroyRef,
  EnvironmentInjector,
  Injectable,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { type Subscription } from 'rxjs';

import { type TermoraEvent } from '../models/termora-event.model';
import { TERMORA_CONFIG } from '../tokens/termora-config.token';
import { TerminalService } from './terminal.service';

@Injectable({ providedIn: 'root' })
export class TermoraRuntimeService {
  private readonly _terminalService = inject(TerminalService);
  private readonly _config = inject(TERMORA_CONFIG, { optional: true });
  private readonly _environmentInjector = inject(EnvironmentInjector);
  private readonly _destroyRef = inject(DestroyRef);

  private _initialized = false;

  public initialize(): void {
    if (this._initialized) {
      return;
    }

    this._initialized = true;

    if (typeof this._config?.maxStoredLines === 'number') {
      this._terminalService.setMaxStoredLines(this._config.maxStoredLines);
    }

    for (const sourceFactory of this._config?.sources ?? []) {
      const source$ = runInInjectionContext(this._environmentInjector, sourceFactory);

      const subscription: Subscription = source$.subscribe((event: TermoraEvent) => {
        this._handleEvent(event);
      });

      this._destroyRef.onDestroy(() => {
        subscription.unsubscribe();
      });
    }
  }

  private _handleEvent(event: TermoraEvent): void {
    switch (event.type) {
      case 'clear':
        this._terminalService.clear(event.terminalId);
        return;

      case 'print':
        this._terminalService.print(event.value, {
          terminalId: event.terminalId,
          kind: event.kind,
        });
        return;
    }
  }
}
