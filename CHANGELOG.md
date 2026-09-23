# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Added `TerminalService.printBatch()` for efficient history replay and bulk log imports.
- Added `appendLines()` support across the log and terminal stores, with one signal update per batch.
- Added the `printBatch` event for batched output through `provideTermora()` sources.
- Added Angular CDK virtual scrolling for terminal output to reduce DOM work with large log histories.

### Changed

- `appendLine()` remains available for real-time, one-line streaming and now delegates to the batched append path.
- Terminal output uses Angular CDK 21 fixed-size virtual scrolling. Lines use a fixed height and horizontal overflow for predictable viewport calculations.
- Removed a redundant visible-line array copy when no output filter is active.

### Performance

- Bulk appends render each line once but update the stored channel and dependent state once for the whole batch, avoiding repeated array copies and signal invalidations.
