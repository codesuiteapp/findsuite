# FindSuite - Development Guide

## Project Overview

**FindSuite** is a Visual Studio Code extension that integrates powerful command-line search tools (Ripgrep, fd, and Everything) directly into VS Code, providing ultra-fast file and text searching capabilities across the entire system.

**Key Value Proposition:**
- Search files and text beyond workspace boundaries
- Pipeline-style operations like "fd | rg" or "everything | rg" within VS Code
- Lightning-fast search powered by industry-standard CLI tools
- Cross-platform support (Windows, macOS, Linux)

**Repository:** https://github.com/codesuiteapp/findsuite
**License:** GNU General Public License v2.0
**Publisher:** utocode

## Architecture

### Technology Stack

- **Language:** TypeScript 5.3.3 (ES2022, strict mode)
- **Runtime:** Node.js (Node16 module system)
- **Platform:** VS Code Extension API (v1.49.0+)
- **Bundler:** Webpack 5 with Terser minification
- **Bundled Tools:**
  - Ripgrep v14.1.0 (all platforms)
  - fd v9.0.0 (all platforms)

### Project Structure

```
findsuite/
├── bin/                           # Bundled binaries (ripgrep, fd)
│   ├── 14_1_0/                   # Ripgrep binaries by platform
│   └── 9_0_0/                    # fd binaries by platform
├── images/                        # Extension icons and assets
├── src/                          # Source code (~2,302 lines)
│   ├── commands/                 # Command registration and handlers
│   │   ├── everything-cmd.ts     # Everything command handlers
│   │   ├── fd-cmd.ts            # fd command handlers
│   │   ├── rg-cmd.ts            # Ripgrep command handlers
│   │   └── index.ts             # Command exports
│   ├── config/                   # Configuration management
│   │   └── settings.ts          # Centralized settings access with AJV validation
│   ├── model/                    # Data models and interfaces
│   │   ├── button.ts            # QuickPick button definitions
│   │   ├── fd.ts                # fd query models
│   │   └── ripgrep.ts           # Ripgrep result models
│   ├── svc/                      # Service layer (core business logic)
│   │   ├── constants.ts         # Constants and enums
│   │   ├── diff.ts              # File comparison service
│   │   ├── everything.ts        # Everything integration (Windows only)
│   │   ├── fd.ts                # fd integration
│   │   └── ripgrep.ts           # Ripgrep integration
│   ├── ui/                       # UI components
│   │   └── ui.ts                # Progress notifications
│   ├── utils/                    # Utility functions
│   │   ├── converter.ts         # Data formatting (bytes, etc.)
│   │   ├── editor.ts            # Editor operations
│   │   ├── logger.ts            # Logging utilities
│   │   ├── output.ts            # Output channel management
│   │   └── vsc.ts               # VS Code API helpers
│   ├── extension.ts             # Main entry point
│   └── vsc-ns.ts                # VS Code namespaces
├── dist/                         # Webpack output
├── package.json                  # Extension manifest
├── tsconfig.json                # TypeScript configuration
└── webpack.config.js            # Webpack configuration
```

## Core Components

### 1. Extension Activation (`src/extension.ts`)

**Entry Point:** `activate(context: ExtensionContext)`

**Responsibilities:**
- Initialize service instances (FdFind, RipgrepSearch, Everything)
- Register all commands via `registerFd()`, `registerRg()`, `registerEverything()`
- Set up configuration change listeners
- Handle color theme changes for match highlighting

**Key Services:**
```typescript
const fd = new FdFind(context);          // File finder service
const rg = new RipgrepSearch(context);   // Text search service
const everything = new Everything();      // Windows-only fast indexer
```

### 2. Service Layer (`src/svc/`)

#### FdFind Service (`fd.ts`)
**Purpose:** Execute fd command-line tool for file searching

**Key Features:**
- Multiple search modes (files, directories, workspace)
- Platform-specific binary management
- 200MB buffer for large result sets
- Exclude pattern support
- Handles both internal (bundled) and external fd installations

**Main Methods:**
- `execute(query: FdQuery, canPickMany: boolean): Promise<QuickPickItem[]>`
- `getBinaryPath(): string` - Returns platform-specific fd binary path

#### RipgrepSearch Service (`ripgrep.ts`)
**Purpose:** Execute ripgrep with JSON output format for text searching

**Key Features:**
- Two search modes:
  - **Input Mode:** Batch search with input box
  - **Incremental Mode:** Real-time search as you type
- JSON result parsing with match position extraction
- Customizable match highlighting (dark/light theme support)
- File preview with decoration
- Configurable result limits (default: 500)

**Main Methods:**
- `execute(paths: string[], customOpt?: string): Promise<void>`
- `executeAfterFind(results: QuickPickItem[]): Promise<void>`
- `setColorForTheme(themeKind: ColorThemeKind): void`

#### Everything Service (`everything.ts`)
**Purpose:** Communicate with Everything HTTP server (Windows only)

**Key Features:**
- HTTP-based communication with Everything server
- Configurable search profiles via `everythingConfig`
- Supports filters, sorting, regex, path-based searches
- Folder/file operations and workspace management
- Configurable result limits (default: 1000)

**Configuration Example:**
```json
{
  "filter1": {
    "enabled": true,
    "query": "ext:js;ts;json",
    "regex": false,
    "fullpath": false,
    "inWorkspace": false,
    "sort": "name",
    "ascending": true,
    "description": "JavaScript/TypeScript files"
  }
}
```

### 3. Command Registration (`src/commands/`)

**Total Commands:** 24 commands across 3 categories

#### fd Commands (`fd-cmd.ts`)
- `findsuite.fd` - Multi-file selection
- `findsuite.fdFile` - Single file search
- `findsuite.fdWs` - Workspace search
- `findsuite.fdFolder` - Directory search
- `findsuite.fd#diff` - File comparison

#### Ripgrep Commands (`rg-cmd.ts`)
- `findsuite.rg` - General text search
- `findsuite.rgws` - Workspace text search
- `findsuite.rgFile` - Current file search
- `findsuite.rgDirectory` - Directory text search

#### Everything Commands (`everything-cmd.ts`)
- `findsuite.everything` - Everything search
- `findsuite.everything#folder` - Folder operations
- `findsuite.everything#workspace` - Workspace file opening
- `findsuite.everything#codeWorkspace` - Open workspace files

#### Pipeline Commands (`extension.ts`)
- `findsuite.rgWithFd` - fd → ripgrep (like `fd -t f | rg`)
- `findsuite.rgWithFdDir` - fd directories → ripgrep (like `fd -t d | rg`)
- `findsuite.rgWithEverything` - Everything → ripgrep (Windows only)

### 4. Configuration System (`src/config/settings.ts`)

**Features:**
- Centralized configuration access via static getters
- JSON schema validation using AJV
- Platform-specific settings (Windows/macOS/Linux)
- Merges global, workspace, and folder settings

**Key Configuration Groups:**
- `findsuite.fd.*` - fd tool settings
- `findsuite.rg.*` - Ripgrep settings
- `findsuite.everything.*` - Everything settings (Windows)
- `findsuite.everythingConfig` - Everything search profiles
- `findsuite.compare.*` - External diff tool settings

## Development Workflow

### Setup

```bash
# Clone the repository
git clone https://github.com/codesuiteapp/findsuite.git
cd findsuite

# Install dependencies
npm install

# Compile in watch mode
npm run watch
```

### Available Scripts

```bash
npm run compile        # Development build with Webpack
npm run watch          # Watch mode for development
npm run compile2       # TypeScript compilation (alternative)
npm run watch2         # TypeScript watch mode
npm run lint           # ESLint checking
npm run test           # Run test suite
npm run vscode:prepublish  # Production build (minified)
```

### Debugging

Two launch configurations available in `.vscode/launch.json`:

1. **Run Extension (F5)**
   - Launches extension in development mode
   - Opens new VS Code window with extension loaded
   - Supports breakpoints and hot reload

2. **Extension Tests**
   - Runs test suite
   - Uses @vscode/test-electron

### Build Configuration

**Webpack Settings:**
- **Mode:** Development (source maps) / Production (minified)
- **Target:** Node.js environment
- **Output:** Single `dist/extension.js` file
- **Optimization:** Terser minification with aggressive settings
- **Externals:** VS Code API (`vscode` module)

**TypeScript Settings:**
- **Target:** ES2022
- **Module:** Node16
- **Strict Mode:** Enabled
- **Source Maps:** Enabled

## Key Keyboard Shortcuts

| Shortcut | Command | Description |
|----------|---------|-------------|
| `Ctrl+F7` | rgWithFd | fd + ripgrep file search |
| `Ctrl+Shift+F7` | rgWithFdDir | fd + ripgrep directory search |
| `Ctrl+Alt+F7` | fdFile | fd file search |
| `Ctrl+Alt+9` | fdWs | fd workspace search |
| `Ctrl+Alt+F` | rgws | Ripgrep in workspace |
| `Ctrl+Alt+0` | rgFile | Ripgrep in current file |
| `Ctrl+F10` | rgWithEverything | Everything + ripgrep (Windows) |
| `Ctrl+Alt+F9` | everything | Everything search (Windows) |
| `Ctrl+Alt+4` | everything#folder | Open folder via Everything (Windows) |
| `Ctrl+k Ctrl+Shift+d` | fd#diff | Compare files with fd |
| `Ctrl+k Ctrl+Alt+d` | everything#diff | Compare files with Everything (Windows) |

*Note: macOS uses `Cmd` instead of `Ctrl`*

## Code Style & Conventions

### Linting & Formatting

- **ESLint:** TypeScript ESLint with strict rules
- **Prettier:**
  - Single quotes
  - Semicolons required
  - 180 character line width
  - 2-space indentation

### Naming Conventions

- **Classes:** PascalCase (e.g., `FdFind`, `RipgrepSearch`)
- **Methods:** camelCase (e.g., `execute`, `getBinaryPath`)
- **Interfaces:** PascalCase with `I` prefix where appropriate
- **Constants:** UPPER_SNAKE_CASE in `constants.ts`

### File Organization

- **Services:** Single responsibility, class-based services in `src/svc/`
- **Commands:** Command handlers grouped by tool in `src/commands/`
- **Utils:** Pure functions, no side effects
- **Models:** TypeScript interfaces and types

## Common Development Tasks

### Adding a New Command

1. Define command in `package.json`:
```json
{
  "command": "findsuite.myCommand",
  "title": "My Command",
  "category": "FindSuite"
}
```

2. Add keybinding (optional):
```json
{
  "command": "findsuite.myCommand",
  "key": "ctrl+shift+f8"
}
```

3. Register command in appropriate file (`src/commands/`):
```typescript
export function registerMyCommands(context: ExtensionContext, service: MyService) {
  context.subscriptions.push(
    commands.registerCommand('findsuite.myCommand', async () => {
      await service.execute();
    })
  );
}
```

### Adding Configuration Options

1. Define in `package.json` under `contributes.configuration.properties`:
```json
"findsuite.myTool.option": {
  "type": "string",
  "default": "value",
  "description": "My option description"
}
```

2. Add getter in `src/config/settings.ts`:
```typescript
static get myToolOption(): string {
  return this.getConfiguration('findsuite.myTool.option', 'default');
}
```

3. Use in service:
```typescript
import { Settings } from '../config/settings';
const option = Settings.myToolOption;
```

### Extending Search Functionality

**Pattern:** All search services follow similar structure:

```typescript
export class MySearchService {
  constructor(private context: ExtensionContext) {}

  async execute(query: MyQuery): Promise<void> {
    // 1. Get configuration
    const config = Settings.myServiceConfig;

    // 2. Build command
    const cmd = this.buildCommand(query, config);

    // 3. Execute command
    const results = await this.runCommand(cmd);

    // 4. Parse results
    const parsed = this.parseResults(results);

    // 5. Show QuickPick UI
    await this.showResults(parsed);

    // 6. Handle user selection
    await this.handleSelection(selected);
  }

  private buildCommand(query: MyQuery, config: MyConfig): string {
    // Command construction logic
  }

  private async runCommand(cmd: string): Promise<Buffer> {
    // Execute child process
  }

  private parseResults(buffer: Buffer): MyResult[] {
    // Parse command output
  }

  private async showResults(results: MyResult[]): Promise<void> {
    // Show QuickPick interface
  }
}
```

## Platform-Specific Considerations

### Windows
- Everything integration requires Everything HTTP server running
- Default Everything server: `127.0.0.1:3380`
- Everything commands only visible on Windows (`"when": "isWindows"`)

### macOS
- Uses `darwin` binaries from `bin/` directory
- Keyboard shortcuts use `Cmd` instead of `Ctrl`
- No Everything support

### Linux
- Uses `linux` binaries (including ARM support)
- Full fd and ripgrep support
- No Everything support

## Testing

### Test Structure
```
src/test/
└── suite/
    └── index.ts
```

### Running Tests
```bash
npm run pretest  # Compile and lint
npm run test     # Run test suite
```

### Test Configuration
- Framework: @vscode/test-cli and @vscode/test-electron
- Tests run with extensions disabled
- Compiled tests located in `dist/test/suite/`

## Internationalization (i18n)

**Supported Languages:**
- English (default)
- Korean (한국어)

**Files:**
- `package.nls.json` - English strings
- `package.nls.ko.json` - Korean strings
- `l10n/` - Localization resources

**Adding Translations:**
1. Add key to `package.nls.json`
2. Reference in `package.json` using `%key%`
3. Add translations to language-specific files

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md` with release notes
3. Run production build: `npm run vscode:prepublish`
4. Test extension thoroughly
5. Package: `vsce package`
6. Publish: `vsce publish`

## Common Issues & Solutions

### Issue: fd or ripgrep binary not found
**Solution:** Ensure `findsuite.fd.internal.enabled` and `findsuite.rg.internal.enabled` are set to `true` to use bundled binaries.

### Issue: Everything not working on Windows
**Solution:**
1. Verify Everything is installed and running
2. Enable HTTP server in Everything settings
3. Configure correct host/port in VS Code settings

### Issue: Large result sets cause performance issues
**Solution:**
- Reduce `findsuite.rg.count` setting (default: 500)
- Reduce `findsuite.everything.count` setting (default: 1000)
- Use more specific search patterns

### Issue: Match colors not visible
**Solution:** Configure `findsuite.rg.matchColor.darkTheme` and `findsuite.rg.matchColor.lightTheme` settings.

## Contributing

### Prerequisites
- Node.js 18.x or higher
- VS Code 1.49.0 or higher
- Git

### Contribution Guidelines
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting: `npm run lint`
5. Test your changes thoroughly
6. Submit a pull request

### Code Review Checklist
- [ ] Code follows TypeScript strict mode
- [ ] ESLint passes without errors
- [ ] Changes are backward compatible
- [ ] Documentation updated if needed
- [ ] Platform-specific behavior tested
- [ ] No hardcoded paths or configuration

## Resources

- **GitHub Repository:** https://github.com/codesuiteapp/findsuite
- **VS Code Marketplace:** https://marketplace.visualstudio.com/items?itemName=utocode.findsuite
- **Ripgrep Documentation:** https://github.com/BurntSushi/ripgrep
- **fd Documentation:** https://github.com/sharkdp/fd
- **Everything:** https://www.voidtools.com/
- **VS Code Extension API:** https://code.visualstudio.com/api

## License

GNU General Public License v2.0 - See [LICENSE](LICENSE) for details.

---

**Last Updated:** 2024-03-10
**Version:** 0.2.1
