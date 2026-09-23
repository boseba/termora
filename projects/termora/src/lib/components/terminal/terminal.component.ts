import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import {
  type AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { type TerminalCommandDefinition } from '../../models/terminal-command.model';
import { type TerminalState } from '../../models/terminal-state.model';
import { TerminalService } from '../../services/terminal.service';
import { TerminalInputComponent } from '../terminal-input/terminal-input.component';

@Component({
  selector: 'termora-terminal',
  standalone: true,
  imports: [
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
    TerminalInputComponent,
  ],
  templateUrl: './terminal.component.html',
  styleUrl: './terminal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalComponent implements AfterViewChecked {
  public readonly terminalId = input<string | null>(null);
  public readonly showInput = input<boolean>(true);
  public readonly filterText = input<string>('');
  public readonly maxLines = input<number>(500);
  public readonly commands = input<readonly TerminalCommandDefinition[]>([]);

  public readonly commandSubmitted = output<string>();

  protected readonly viewport = viewChild.required<CdkVirtualScrollViewport>('viewport');

  protected readonly terminalInput = viewChild<TerminalInputComponent>('terminalInput');

  private readonly _terminalService = inject(TerminalService);

  protected readonly state = computed(
    (): TerminalState => this._terminalService.getStateSnapshot(this.terminalId()),
  );

  constructor() {
    effect(() => {
      this._terminalService.ensureTerminal(this.terminalId());
    });

    effect(() => {
      this._terminalService.configure(this.terminalId(), {
        showInput: this.showInput(),
        filterText: this.filterText(),
        maxLines: this.maxLines(),
        commands: this.commands(),
      });
    });
  }

  public ngAfterViewChecked(): void {
    if (!this.state().autoScrollEnabled) {
      return;
    }

    const viewport: CdkVirtualScrollViewport = this.viewport();
    viewport.scrollTo({ bottom: 0 });
  }

  protected onScroll(): void {
    const viewport: CdkVirtualScrollViewport = this.viewport();
    const threshold = 10;
    const distance: number = viewport.measureScrollOffset('bottom');
    const isAtBottom: boolean = distance <= threshold;

    this._terminalService.setAutoScrollEnabled(this.terminalId(), isAtBottom);
  }

  protected focusInput(event?: MouseEvent): void {
    const inputComponent: TerminalInputComponent | undefined = this.terminalInput();

    if (!inputComponent) {
      return;
    }

    inputComponent.focusFromContainer(event);
  }

  protected forwardCommand(command: string): void {
    this.commandSubmitted.emit(command);
  }

  protected trackLine(_index: number, line: TerminalState['lines'][number]): string {
    return line.id;
  }
}
