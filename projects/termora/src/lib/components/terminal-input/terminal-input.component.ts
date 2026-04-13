import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { type TerminalState } from '../../models/terminal-state.model';
import { TerminalService } from '../../services/terminal.service';

@Component({
  selector: 'termora-terminal-input',
  standalone: true,
  templateUrl: './terminal-input.component.html',
  styleUrl: './terminal-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalInputComponent {
  public readonly terminalId = input<string | null>(null);
  public readonly commandSubmitted = output<string>();

  protected readonly inputCommandRef =
    viewChild.required<ElementRef<HTMLInputElement>>('inputCommand');

  private readonly _terminalService = inject(TerminalService);

  protected readonly state = computed(
    (): TerminalState => this._terminalService.getStateSnapshot(this.terminalId()),
  );

  constructor() {
    effect(() => {
      this._terminalService.ensureTerminal(this.terminalId());
    });
  }

  public focus(): void {
    this.inputCommandRef().nativeElement.focus();
  }

  public focusFromContainer(event?: MouseEvent): void {
    const input: HTMLInputElement = this.inputCommandRef().nativeElement;

    if (event?.target === input) {
      return;
    }

    requestAnimationFrame(() => {
      input.focus();
    });
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this._terminalService.updateInput(this.terminalId(), target.value);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        this._submit();
        return;

      case 'Tab':
        event.preventDefault();
        this._terminalService.applyFirstSuggestion(this.terminalId());
        return;

      case 'ArrowUp':
        event.preventDefault();
        this._terminalService.moveHistory(this.terminalId(), 'up');
        return;

      case 'ArrowDown':
        event.preventDefault();
        this._terminalService.moveHistory(this.terminalId(), 'down');
        return;

      case 'Escape':
        event.preventDefault();
        this._terminalService.updateInput(this.terminalId(), '');
        return;

      default:
        return;
    }
  }

  protected improvedInput(): string {
    const inputValue: string = this._escapeHtml(this.state().inputValue);
    const ghostCompletion: string | null = this.state().ghostCompletion;

    if (!ghostCompletion) {
      return inputValue;
    }

    return `${inputValue}<span class="suggestion">${this._escapeHtml(ghostCompletion)}</span>`;
  }

  private _escapeHtml(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }

  private _submit(): void {
    const currentValue: string = this.state().inputValue;

    const result = this._terminalService.submitCommand(this.terminalId(), currentValue);

    if (!result.handled && result.rawInput.trim()) {
      this.commandSubmitted.emit(result.rawInput);
    }
  }
}
