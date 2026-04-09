import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { TerminalCommandDefinition } from '../../models/terminal-command.model';
import { TerminalState } from '../../models/terminal-state.model';
import { TerminalService } from '../../services/terminal.service';
import { TerminalInputComponent } from '../terminal-input/terminal-input.component';

@Component({
  selector: 'termora-terminal',
  standalone: true,
  imports: [TerminalInputComponent],
  templateUrl: './terminal.component.html',
  styleUrl: './terminal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalComponent implements AfterViewChecked {
  public readonly terminalId = input.required<string>();
  public readonly showInput = input<boolean>(true);
  public readonly filterText = input<string>('');
  public readonly maxLines = input<number>(500);
  public readonly commands = input<readonly TerminalCommandDefinition[]>([]);

  public readonly commandSubmitted = output<string>();

  protected readonly container =
    viewChild.required<ElementRef<HTMLDivElement>>('container');

  protected readonly terminalInput =
    viewChild<TerminalInputComponent>('terminalInput');

  private readonly _terminalService = inject(TerminalService);

  protected readonly states = this._terminalService.getStates();

  protected readonly state = computed((): TerminalState => {
    const state: TerminalState | undefined = this.states()[this.terminalId()];

    if (!state) {
      throw new Error(`Terminal "${this.terminalId()}" is not initialized.`);
    }

    return state;
  });

  constructor() {
    effect(() => {
      const terminalId: string = this.terminalId();
      this._terminalService.ensureTerminal(terminalId);
    });

    effect(() => {
      const terminalId: string = this.terminalId();

      this._terminalService.configure(terminalId, {
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

    const element: HTMLDivElement = this.container().nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  protected onScroll(): void {
    const element: HTMLDivElement = this.container().nativeElement;
    const threshold: number = 10;
    const distance: number = element.scrollHeight - element.scrollTop - element.clientHeight;
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
}