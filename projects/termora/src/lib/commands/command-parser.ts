import { Injectable } from '@angular/core';

import { ParsedCommandInput } from '../models/terminal-command.model';

@Injectable({ providedIn: 'root' })
export class CommandParser {
  public parse(rawInput: string): ParsedCommandInput {
    const trimmedInput: string = rawInput.trimStart();
    const endsWithWhitespace: boolean = /\s$/.test(rawInput);

    if (!trimmedInput) {
      return {
        rawInput,
        commandName: null,
        arguments: [],
        activeToken: '',
        activeTokenIndex: 0,
        endsWithWhitespace,
      };
    }

    const tokens: string[] = this._tokenize(trimmedInput);
    const commandName: string | null = tokens[0] ?? null;
    const argumentsTokens: string[] = tokens.slice(1);

    const activeTokenIndex: number = endsWithWhitespace
      ? tokens.length
      : Math.max(tokens.length - 1, 0);

    const activeToken: string = endsWithWhitespace ? '' : (tokens.at(-1) ?? '');

    return {
      rawInput,
      commandName,
      arguments: argumentsTokens,
      activeToken,
      activeTokenIndex,
      endsWithWhitespace,
    };
  }

  private _tokenize(value: string): string[] {
    const tokens: string[] = [];
    const tokenPattern: RegExp = /"([^"]*)"|[^\s]+/g;

    let match: RegExpExecArray | null = tokenPattern.exec(value);

    while (match) {
      if (match[1] !== undefined) {
        tokens.push(match[1]);
      } else {
        tokens.push(match[0]);
      }

      match = tokenPattern.exec(value);
    }

    return tokens;
  }
}
