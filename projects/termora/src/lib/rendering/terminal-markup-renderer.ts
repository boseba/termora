import { Injectable } from '@angular/core';

export interface MarkupRenderResult {
  plainText: string;
  renderedHtml: string;
}

interface StyleState {
  fontWeight: string | null;
  fontStyle: 'italic' | null;
  textDecoration: 'underline' | null;
  color: string | null;
  link: string | null;
}

type StyleToken =
  | { type: 'bold'; opening: boolean }
  | { type: 'italic'; opening: boolean }
  | { type: 'underline'; opening: boolean }
  | { type: 'color'; opening: boolean; value?: string }
  | { type: 'weight'; opening: boolean; value?: string }
  | { type: 'link'; opening: boolean; value?: string }
  | null;

@Injectable({ providedIn: 'root' })
export class TerminalMarkupRenderer {
  private static readonly _tokenPattern: RegExp =
    /\[(\/?)(b|i|u|color|weight|link)(?:="([^"]*)")?\]/gi;

  public render(value: string): MarkupRenderResult {
    const htmlParts: string[] = [];
    const plainTextParts: string[] = [];
    const styleStack: StyleState[] = [this._createDefaultStyleState()];

    let cursor = 0;
    let match: RegExpExecArray | null = TerminalMarkupRenderer._tokenPattern.exec(value);

    while (match) {
      const tokenStart: number = match.index;

      if (tokenStart > cursor) {
        const text: string = value.slice(cursor, tokenStart);
        this._appendText(text, styleStack.at(-1)!, htmlParts, plainTextParts);
      }

      const token: StyleToken = this._toToken(match);

      if (token) {
        this._applyToken(token, styleStack);
      } else {
        this._appendText(match[0], styleStack.at(-1)!, htmlParts, plainTextParts);
      }

      cursor = TerminalMarkupRenderer._tokenPattern.lastIndex;
      match = TerminalMarkupRenderer._tokenPattern.exec(value);
    }

    if (cursor < value.length) {
      const trailingText: string = value.slice(cursor);
      this._appendText(trailingText, styleStack.at(-1)!, htmlParts, plainTextParts);
    }

    TerminalMarkupRenderer._tokenPattern.lastIndex = 0;

    const plainText: string = plainTextParts.join('');
    const renderedHtml: string = htmlParts.length > 0 ? htmlParts.join('') : '&nbsp;';

    return {
      plainText,
      renderedHtml,
    };
  }

  private _createDefaultStyleState(): StyleState {
    return {
      fontWeight: null,
      fontStyle: null,
      textDecoration: null,
      color: null,
      link: null,
    };
  }

  private _toToken(match: RegExpExecArray): StyleToken {
    const isClosing: boolean = match[1] === '/';
    const tag: string = match[2].toLowerCase();
    const rawValue: string | undefined = match[3];

    switch (tag) {
      case 'b':
        return { type: 'bold', opening: !isClosing };

      case 'i':
        return { type: 'italic', opening: !isClosing };

      case 'u':
        return { type: 'underline', opening: !isClosing };

      case 'color':
        return {
          type: 'color',
          opening: !isClosing,
          value: rawValue,
        };

      case 'weight':
        return {
          type: 'weight',
          opening: !isClosing,
          value: rawValue,
        };

      case 'link':
        return {
          type: 'link',
          opening: !isClosing,
          value: rawValue,
        };

      default:
        return null;
    }
  }

  private _applyToken(token: StyleToken, styleStack: StyleState[]): void {
    if (!token) {
      return;
    }

    if (token.opening) {
      const currentState: StyleState = styleStack.at(-1)!;
      const nextState: StyleState = { ...currentState };

      switch (token.type) {
        case 'bold':
          nextState.fontWeight = 'bold';
          break;

        case 'italic':
          nextState.fontStyle = 'italic';
          break;

        case 'underline':
          nextState.textDecoration = 'underline';
          break;

        case 'color':
          nextState.color = this._normalizeColorValue(token.value);
          break;

        case 'weight':
          nextState.fontWeight = this._normalizeWeightValue(token.value);
          break;

        case 'link':
          nextState.link = this._normalizeLinkValue(token.value);
          break;
      }

      styleStack.push(nextState);
      return;
    }

    if (styleStack.length > 1) {
      styleStack.pop();
    }
  }

  private _normalizeColorValue(value: string | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmedValue: string = value.trim();

    if (!trimmedValue) {
      return null;
    }

    if (trimmedValue.toLowerCase() === 'default') {
      return null;
    }

    return trimmedValue;
  }

  private _normalizeWeightValue(value: string | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmedValue: string = value.trim();

    if (!trimmedValue) {
      return null;
    }

    if (trimmedValue.toLowerCase() === 'default') {
      return null;
    }

    return trimmedValue;
  }

  private _normalizeLinkValue(value: string | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmedValue: string = value.trim();

    if (!trimmedValue) {
      return null;
    }

    if (
      trimmedValue.startsWith('http://') ||
      trimmedValue.startsWith('https://') ||
      trimmedValue.startsWith('mailto:')
    ) {
      return trimmedValue;
    }

    return null;
  }

  private _appendText(
    text: string,
    style: StyleState,
    htmlParts: string[],
    plainTextParts: string[],
  ): void {
    if (!text) {
      return;
    }

    plainTextParts.push(text);

    const escapedText: string = this._escapeHtml(text);
    const inlineStyle: string = this._buildInlineStyle(style);

    if (style.link) {
      const escapedHref: string = this._escapeHtmlAttribute(style.link);

      if (inlineStyle) {
        htmlParts.push(
          `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer" style="${inlineStyle}">${escapedText}</a>`,
        );
        return;
      }

      htmlParts.push(
        `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer">${escapedText}</a>`,
      );
      return;
    }

    if (!inlineStyle) {
      htmlParts.push(escapedText);
      return;
    }

    htmlParts.push(`<span style="${inlineStyle}">${escapedText}</span>`);
  }

  private _buildInlineStyle(style: StyleState): string {
    const declarations: string[] = [];

    if (style.fontWeight) {
      declarations.push(`font-weight: ${this._escapeCssValue(style.fontWeight)}`);
    }

    if (style.fontStyle) {
      declarations.push(`font-style: ${this._escapeCssValue(style.fontStyle)}`);
    }

    if (style.textDecoration) {
      declarations.push(`text-decoration: ${this._escapeCssValue(style.textDecoration)}`);
    }

    if (style.color) {
      declarations.push(`color: ${this._escapeCssValue(style.color)}`);
    }

    return declarations.join('; ');
  }

  private _escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private _escapeHtmlAttribute(value: string): string {
    return this._escapeHtml(value);
  }

  private _escapeCssValue(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}
