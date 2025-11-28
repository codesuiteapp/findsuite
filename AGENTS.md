# Project Analysis for AI Agents

## Project Overview

**FindSuite** is a Visual Studio Code extension designed to enhance file and text search capabilities. It integrates powerful external search tools—**Ripgrep (rg)**, **Fd**, and **Everything** (Windows only)—directly into VS Code, allowing for faster and more flexible searching beyond the built-in capabilities.

## Tech Stack

- **Language**: TypeScript
- **Framework**: VS Code Extension API
- **External Tools**:
  - `ripgrep` (rg): For text search.
  - `fd`: For file search (Linux/Mac/Windows).
  - `Everything`: For instant file/folder search (Windows).

## Architecture

### Directory Structure

- `src/`: Source code root.
  - `commands/`: Command handlers registered in `package.json`.
    - `rg-cmd.ts`: Ripgrep related commands.
    - `fd-cmd.ts`: Fd related commands.
    - `everything-cmd.ts`: Everything related commands.
    - `favorite-cmd.ts`: Favorites management commands.
  - `svc/`: Service layer implementing core logic.
    - `ripgrep.ts`: Wrapper and logic for executing Ripgrep.
    - `fd.ts`: Wrapper and logic for executing Fd.
    - `everything.ts`: Client for communicating with Everything HTTP server.
    - `favorite-manager.ts`: Manages favorite files/paths.
  - `model/`: Data models and interfaces.
  - `ui/`: UI components (InputBox, QuickPick helpers).
  - `utils/`: Utility functions.
  - `config/`: Configuration access helpers.
- `package.json`: Extension manifest, defining commands, configuration, and keybindings.

### Key Concepts

- **Search Providers**: The extension abstracts different search tools (rg, fd, everything) as providers that return results to be displayed in VS Code (QuickPick or Output).
- **Favorites**: Users can bookmark frequently accessed files or directories.
- **History**: Keeps track of recent searches for quick reuse.
- **Integration**:
  - **Everything**: Requires an HTTP server running on the Everything instance.
  - **Fd/Ripgrep**: Executed as child processes.

## Configuration

The extension is highly configurable via `vscode.workspace.getConfiguration('findsuite')`. Key settings include:

- `findsuite.everything.host` / `port`: Connection details for Everything.
- `findsuite.fd.program.*`: Path to `fd` executable.
- `findsuite.rg.program.*`: Path to `rg` executable.
- `findsuite.rg.defaultOption`: Default arguments for Ripgrep.

## Development

- **Build**: `npm run compile` (uses `tsc`).
- **Watch**: `npm run watch`.
- **Package**: `vsce package`.

## Guidelines

- **Language**: All new code and comments should be in **Korean** (as per user preference for this project, though this file is in English for AI).
- **Code Style**: Follow standard TypeScript and VS Code extension guidelines.
