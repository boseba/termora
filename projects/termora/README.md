# Termora

Modern Angular terminal UI component library.

[![npm version](https://img.shields.io/npm/v/termora.svg)](https://www.npmjs.com/package/termora)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Angular](https://img.shields.io/badge/angular-21-DD0031.svg)](https://angular.dev/)

Termora is a modern, lightweight, and extensible terminal component library for Angular.
It provides a ready-to-use terminal UI, command handling, command history, autocomplete, ghost suggestions, formatted output, and programmatic log streaming.

It is designed for applications that need an embedded terminal-like experience: developer tools, admin dashboards, internal consoles, log viewers, command palettes, media tools, automation panels, and interactive debugging interfaces.

## Table of Contents

- [Key Principles](#key-principles)
- [Features](#features)
- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Programmatic Output](#programmatic-output)
- [Commands](#commands)
- [Command Arguments and Suggestions](#command-arguments-and-suggestions)
- [External Event Sources](#external-event-sources)
- [Multiple Terminals](#multiple-terminals)
- [Formatted Output](#formatted-output)
- [Theming](#theming)
- [Component API](#component-api)
- [Service API](#service-api)
- [Models](#models)
- [Development](#development)
- [Philosophy](#philosophy)
- [Roadmap](#roadmap)
- [License](#license)

## Key Principles

- Angular-first design
- Standalone components
- Signal-based state management
- Lightweight runtime
- No forced application architecture
- Programmatic output API
- Declarative command definitions
- Built-in command history and autocomplete
- Safe formatted output through a restricted markup syntax
- Themeable through CSS custom properties
- Suitable for multiple independent terminal instances

## Features

### Terminal UI

Termora provides a standalone `<termora-terminal>` component with:

- scrollable output area
- prompt rendering for submitted commands
- optional input area
- auto-scroll behavior
- line filtering
- maximum visible line control
- command forwarding for unknown commands
- support for multiple terminal instances through `terminalId`

### Input Experience

The terminal input supports:

- command submission with `Enter`
- autocomplete with `Tab`
- command history with `ArrowUp` and `ArrowDown`
- input reset with `Escape`
- ghost completion rendering
- focus forwarding when the terminal container is clicked

### Command System

Termora includes a command model designed for strongly typed Angular applications.

A command can define:

- a name
- a description
- an optional argument specification
- optional argument help
- an execution callback

Command execution receives a context containing:

- the terminal id
- the raw input
- parsed arguments
- a small API with `print()` and `clear()` helpers

### Output Rendering

Output can be written through `TerminalService.print()` and rendered as terminal lines.

Each line stores:

- raw content
- plain text content
- rendered safe HTML
- line kind
- timestamp
- unique id

### Formatted Markup

Termora supports a restricted markup syntax for terminal-friendly output styling:

```txt
[b]bold[/b]
[i]italic[/i]
[u]underline[/u]
[color="var(--termora-color-success)"]success text[/color]
[weight="600"]semi-bold text[/weight]
[link="https://example.com"]external link[/link]
```

This allows application code to produce styled terminal output without injecting raw HTML directly.

### External Event Sources

Termora can subscribe to observable event sources through `provideTermora()`.

This makes it possible to connect the terminal to:

- WebSocket messages
- Socket.IO messages
- server logs
- application events
- background jobs
- build or automation output

## Installation

```bash
npm install termora
```

or with pnpm:

```bash
pnpm add termora
```

If the package is not published yet, install it from the repository or use it through the Angular workspace during development.

## Basic Usage

Register Termora in your application configuration:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideTermora } from 'termora';

export const appConfig: ApplicationConfig = {
    providers: [
        provideTermora(),
    ],
};
```

Use the terminal component in a standalone component:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TerminalComponent, type TerminalCommandDefinition } from 'termora';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [TerminalComponent],
    template: `
        <termora-terminal
            terminalId="main"
            [commands]="commands"
            (commandSubmitted)="onCommandSubmitted($event)"
        />
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
    protected readonly commands: readonly TerminalCommandDefinition[] = [
        {
            name: 'hello',
            description: 'Prints a greeting message.',
            execute: ({ api }) => {
                api.print('[color="var(--termora-color-success)"]Hello from Termora[/color]');
            },
        },
        {
            name: 'clear',
            description: 'Clears the terminal.',
            execute: ({ api }) => {
                api.clear();
            },
        },
    ];

    protected onCommandSubmitted(command: string): void {
        console.warn(`Unhandled command: ${command}`);
    }
}
```

## Programmatic Output

You can write directly to a terminal from any injectable service or component.

```ts
import { Injectable, inject } from '@angular/core';
import { TerminalService } from 'termora';

@Injectable({ providedIn: 'root' })
export class BuildLogService {
    private readonly _terminalService = inject(TerminalService);

    public printBuildStarted(): void {
        this._terminalService.print('Build started...', {
            terminalId: 'build',
            kind: 'info',
        });
    }

    public printBuildCompleted(): void {
        this._terminalService.print('[b][color="var(--termora-color-success)"]Build completed[/color][/b]', {
            terminalId: 'build',
            kind: 'info',
        });
    }
}
```

Legacy-style overload is also available:

```ts
this._terminalService.print('build', 'Build started...');
```

## Commands

Commands are declared as plain objects.

```ts
import { type TerminalCommandDefinition } from 'termora';

export const commands: readonly TerminalCommandDefinition[] = [
    {
        name: 'status',
        description: 'Displays the current application status.',
        execute: ({ api }) => {
            api.print('Application status: [color="var(--termora-color-success)"]online[/color]');
        },
    },
];
```

The execution context exposes the parsed command state:

```ts
{
    name: 'echo',
    description: 'Prints the provided arguments.',
    execute: ({ arguments: args, api }) => {
        api.print(args.join(' '));
    },
}
```

## Command Arguments and Suggestions

Termora supports argument specifications that can drive suggestions and autocomplete.

### Enum Argument

```ts
{
    name: 'theme',
    description: 'Changes the active theme.',
    argumentSpec: [
        {
            type: 'enum',
            values: ['dark', 'light', 'system'],
        },
    ],
    argumentHelp: ['Theme name'],
    execute: ({ arguments: args, api }) => {
        api.print(`Theme changed to ${args[0] ?? 'system'}`);
    },
}
```

### Quoted String Argument

```ts
{
    name: 'say',
    description: 'Prints a quoted message.',
    argumentSpec: [
        {
            type: 'quoted-string',
        },
    ],
    execute: ({ arguments: args, api }) => {
        api.print(args[0] ?? '');
    },
}
```

Example input:

```txt
say "Hello world"
```

### One-Of Argument

```ts
{
    name: 'open',
    description: 'Opens a known target.',
    argumentSpec: [
        {
            type: 'one-of',
            values: [
                {
                    type: 'enum',
                    values: ['settings', 'logs', 'jobs'],
                },
                {
                    type: 'quoted-string',
                },
            ],
        },
    ],
    execute: ({ arguments: args, api }) => {
        api.print(`Opening ${args[0] ?? 'default target'}`);
    },
}
```

## External Event Sources

Use `provideTermora()` with observable event sources when logs or terminal events are produced outside the component.

```ts
import { ApplicationConfig, inject } from '@angular/core';
import { map } from 'rxjs';
import { provideTermora, type TermoraEvent } from 'termora';

import { SocketLogService } from './socket-log.service';

export const appConfig: ApplicationConfig = {
    providers: [
        provideTermora({
            maxStoredLines: 2000,
            sources: [
                () => {
                    const socketLogService = inject(SocketLogService);

                    return socketLogService.logs$.pipe(
                        map((message): TermoraEvent => ({
                            type: 'print',
                            terminalId: 'server',
                            kind: 'info',
                            value: `[color="var(--termora-color-info)"]${message}[/color]`,
                        })),
                    );
                },
            ],
        }),
    ],
};
```

Clear events are also supported:

```ts
const event: TermoraEvent = {
    type: 'clear',
    terminalId: 'server',
};
```

## Multiple Terminals

Each terminal can have its own state by using a `terminalId`.

```html
<termora-terminal terminalId="server" />
<termora-terminal terminalId="jobs" />
<termora-terminal terminalId="downloads" />
```

Programmatic output can target a specific instance:

```ts
this._terminalService.print('Server connected', {
    terminalId: 'server',
    kind: 'success',
});

this._terminalService.print('Download queued', {
    terminalId: 'downloads',
    kind: 'info',
});
```

When no `terminalId` is provided, Termora uses the default terminal channel.

## Formatted Output

Termora does not expect raw HTML from the application. Instead, it parses a small terminal-oriented markup language.

Supported tags:

| Tag | Purpose | Example |
| --- | --- | --- |
| `[b]...[/b]` | Bold text | `[b]Important[/b]` |
| `[i]...[/i]` | Italic text | `[i]Loading...[/i]` |
| `[u]...[/u]` | Underlined text | `[u]Link label[/u]` |
| `[color="..."]...[/color]` | Text color | `[color="red"]Error[/color]` |
| `[weight="..."]...[/weight]` | Font weight | `[weight="600"]Title[/weight]` |
| `[link="..."]...[/link]` | External link | `[link="https://example.com"]Open[/link]` |

The renderer escapes text content and only supports links with safe URL schemes:

- `http://`
- `https://`
- `mailto:`

## Theming

Termora is designed to be styled with CSS custom properties.

Recommended variables:

```scss
:root {
    --termora-color-background: #0f172a;
    --termora-color-surface: #111827;
    --termora-color-border: #263445;
    --termora-color-text: #d6e4f0;
    --termora-color-muted: #7b8a9a;
    --termora-color-prompt: #38bdf8;
    --termora-color-success: #34d399;
    --termora-color-info: #60a5fa;
    --termora-color-warning: #fbbf24;
    --termora-color-error: #fb7185;
}
```

Example formatted line using theme variables:

```ts
this._terminalService.print(
    '[color="var(--termora-color-success)"]Connection established[/color]',
    {
        terminalId: 'server',
        kind: 'success',
    },
);
```

## Component API

### `<termora-terminal>`

Inputs:

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `terminalId` | `string \| null` | `null` | Identifies the terminal channel. |
| `showInput` | `boolean` | `true` | Shows or hides the command input. |
| `filterText` | `string` | `''` | Filters visible lines by plain text content. |
| `maxLines` | `number` | `500` | Maximum number of visible retained lines for this terminal state. |
| `commands` | `readonly TerminalCommandDefinition[]` | `[]` | Commands available in the terminal. |

Outputs:

| Output | Type | Description |
| --- | --- | --- |
| `commandSubmitted` | `string` | Emits unknown or unhandled command input. |

Example:

```html
<termora-terminal
    terminalId="main"
    [showInput]="true"
    [maxLines]="500"
    [filterText]="filterText()"
    [commands]="commands"
    (commandSubmitted)="handleUnknownCommand($event)"
/>
```

### `<termora-terminal-input>`

The input component is exported for advanced composition, but most applications should use `<termora-terminal>` directly.

Inputs:

| Input | Type | Default | Description |
| --- | --- | --- | --- |
| `terminalId` | `string \| null` | `null` | Identifies the terminal channel used by the input. |

Outputs:

| Output | Type | Description |
| --- | --- | --- |
| `commandSubmitted` | `string` | Emits unknown or unhandled command input. |

## Service API

### `TerminalService`

The service is provided in root and exposes the terminal runtime API.

```ts
import { TerminalService } from 'termora';
```

Core methods:

| Method | Description |
| --- | --- |
| `ensureTerminal(terminalId?)` | Ensures that a terminal state exists. |
| `getStates()` | Returns a signal containing all terminal states. |
| `getStateSnapshot(terminalId?)` | Returns the current state for one terminal. |
| `configure(terminalId, options)` | Applies partial options to a terminal. |
| `setMaxStoredLines(maxStoredLines)` | Configures global retained log storage. |
| `print(value, options?)` | Prints a line to the default or targeted terminal. |
| `print(terminalId, value)` | Prints a line to a specific terminal using the overload form. |
| `clear(terminalId?)` | Clears a terminal. |
| `setCommands(terminalId, commands)` | Replaces terminal commands. |
| `setFilter(terminalId, filterText)` | Updates the line filter. |
| `setMaxLines(terminalId, maxLines)` | Updates the maximum visible lines. |

## Models

### `TerminalCommandDefinition`

```ts
export interface TerminalCommandDefinition {
    name: string;
    description: string;
    argumentSpec?: readonly TerminalArgumentDefinition[];
    argumentHelp?: readonly string[];
    execute: (context: TerminalCommandExecutionContext) => void;
}
```

### `TerminalCommandExecutionContext`

```ts
export interface TerminalCommandExecutionContext {
    terminalId: string | null;
    rawInput: string;
    arguments: string[];
    api: {
        print: (value: string) => void;
        clear: () => void;
    };
}
```

### `TerminalLineKind`

```ts
export type TerminalLineKind = 'output' | 'command' | 'system' | 'error' | 'warning' | 'info';
```

### `TermoraEvent`

```ts
export interface TermoraPrintEvent {
    type: 'print';
    value: string;
    terminalId?: string | null;
    kind?: TerminalLineKind;
}

export interface TermoraClearEvent {
    type: 'clear';
    terminalId?: string | null;
}

export type TermoraEvent = TermoraPrintEvent | TermoraClearEvent;
```

## Development

Install dependencies:

```bash
pnpm install
```

Build the library:

```bash
pnpm build
```

Run the build in watch mode:

```bash
pnpm watch
```

Run unit tests:

```bash
pnpm test
```

Run linting:

```bash
pnpm lint
```

The publishable Angular library lives in:

```txt
projects/termora
```

## Philosophy

Termora is not a full shell emulator. It is a UI library for building terminal-like experiences inside Angular applications.

It focuses on:

- rendering terminal output cleanly
- making command input feel natural
- exposing a simple programmatic API
- keeping commands declarative
- allowing the host application to stay in control
- remaining small, predictable, and framework-native

This means Termora does not try to execute operating system commands by itself. Application code decides what commands exist, what they do, and how their output is produced.

## Roadmap

Potential future improvements:

- richer command help display
- built-in help command generator
- command groups and aliases
- async command execution helpers
- structured log formatter integration
- optional syntax highlighting for code blocks
- copy-to-clipboard helpers
- configurable prompt symbol
- more complete theme presets
- accessibility refinements
- documentation website and live examples

## License

MIT License

© Sébastien Bosmans
