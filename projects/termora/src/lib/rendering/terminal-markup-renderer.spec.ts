import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TerminalMarkupRenderer } from './terminal-markup-renderer';

describe('TerminalMarkupRenderer', () => {
  let renderer: TerminalMarkupRenderer;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TerminalMarkupRenderer],
    });

    renderer = TestBed.inject(TerminalMarkupRenderer);
  });

  it('should return plain text and html unchanged when there is no markup', () => {
    const result = renderer.render('hello');

    expect(result.plainText).toBe('hello');
    expect(result.renderedHtml).toBe('hello');
  });

  it('should escape html characters', () => {
    const result = renderer.render('<b>&"\'</b>');

    expect(result.plainText).toBe('<b>&"\'</b>');
    expect(result.renderedHtml).toContain('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
  });

  it('should render bold text', () => {
    const result = renderer.render('[b]hello[/b]');

    expect(result.plainText).toBe('hello');
    expect(result.renderedHtml).toBe('<span style="font-weight: bold">hello</span>');
  });

  it('should render nested styles', () => {
    const result = renderer.render('[b][i]hello[/i][/b]');

    expect(result.plainText).toBe('hello');
    expect(result.renderedHtml).toBe(
      '<span style="font-weight: bold; font-style: italic">hello</span>',
    );
  });

  it('should render underline and color', () => {
    const result = renderer.render('[u][color="red"]hello[/color][/u]');

    expect(result.renderedHtml).toBe(
      '<span style="text-decoration: underline; color: red">hello</span>',
    );
  });

  it('should reset color and weight when value is default', () => {
    const colorResult = renderer.render('[color="default"]hello[/color]');
    const weightResult = renderer.render('[weight="default"]hello[/weight]');

    expect(colorResult.renderedHtml).toBe('hello');
    expect(weightResult.renderedHtml).toBe('hello');
  });

  it('should ignore empty color and weight values', () => {
    const colorResult = renderer.render('[color="   "]hello[/color]');
    const weightResult = renderer.render('[weight="   "]hello[/weight]');

    expect(colorResult.renderedHtml).toBe('hello');
    expect(weightResult.renderedHtml).toBe('hello');
  });

  it('should render a custom weight', () => {
    const result = renderer.render('[weight="600"]hello[/weight]');

    expect(result.renderedHtml).toBe('<span style="font-weight: 600">hello</span>');
  });

  it('should render a valid https link', () => {
    const result = renderer.render('[link="https://example.com"]hello[/link]');

    expect(result.plainText).toBe('hello');
    expect(result.renderedHtml).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">hello</a>',
    );
  });

  it('should render a link with additional styles', () => {
    const result = renderer.render('[color="red"][link="https://example.com"]hello[/link][/color]');

    expect(result.renderedHtml).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer" style="color: red">hello</a>',
    );
  });

  it('should reject unsupported links', () => {
    const result = renderer.render('[link="javascript:alert(1)"]hello[/link]');

    expect(result.renderedHtml).toBe('hello');
  });

  it('should keep unknown tags as plain text', () => {
    const result = renderer.render('[unknown]hello[/unknown]');

    expect(result.plainText).toBe('[unknown]hello[/unknown]');
    expect(result.renderedHtml).toBe('[unknown]hello[/unknown]');
  });

  it('should not pop the root style state on closing tags', () => {
    const result = renderer.render('[/b]hello');

    expect(result.renderedHtml).toBe('hello');
  });

  it('should append trailing text after the last token', () => {
    const result = renderer.render('[b]hello[/b] world');

    expect(result.plainText).toBe('hello world');
    expect(result.renderedHtml).toBe('<span style="font-weight: bold">hello</span> world');
  });
});
