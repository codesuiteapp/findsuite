# FindSuite (RipGrep, Everything [Windows])

## Overview

Ripgrep (aka rg) is a powerful command-line search tool primarily used for finding text in files. Everything is a powerful and lightning-fast desktop search tool. Combining these two programs provides great power and convenience in manipulating files and strings on your computer without leaving VS Code.

To search, press the shortcut key (e.g., Ctrl+F8 or Ctrl+F10) in the blank space or on the word you want to search. If you want to search for a folder name, press the shortcut key (Ctrl+Alt+4).

[Korean_한국어](README_KO.md)

## Prerequisites

Before using this extension, ensure that you have the following prerequisites installed:

- **Everything program**: The extension relies on the Everything program for fast file searches. Make sure it is installed on your system.

![Everything](images/everything1.png)

- **VSCode Settings**: Please enter the Host and Port configured in the Everything program. Also, configure the Everything Config.

![Setting](images/setting.png)

## Features

### FindSuite Program

It provides easy and fast searching in VS Code by integrating the powerful and convenient Ripgrep program for manipulating text in files. It helps you find files quickly and easily by linking with Everything, which is more powerful than anything else when it comes to finding fold

### Ripgrep Integration

The extension seamlessly integrates with ripgrep, allowing users to search for files containing specific strings efficiently.

## Shortcuts

- **Ctrl + F7**: Search for strings within the current file's folder using ripgrep.
- **Ctrl + F8**: Search for strings within the files in the current workspace using ripgrep.
- **Ctrl + Alt + 0**: Search for strings within the currently open file using ripgrep.

### Everything integration

Ultra-fast file search by indexing every file and folder on your system. Works with Everything to handle large numbers of files quickly and easily in VS Code.

## Shortcut Keys (Requires Everything)

- **Ctrl + F10**: Search for files using Everything and then search within the selected file(s).
- **Ctrl + Alt + F9**: Search for files using Everything.
- **Ctrl + Alt + m**: Open multiple files within a directory searched using Everything.
- **Ctrl + Alt + 4**: Search using Everything and open the selected folder(s).
- **Ctrl + Alt + Shift + w**: Use Everything to search for code-workspace files and open Workspace.

## Usage

1. **Install Everything Program**: Ensure that the Everything program is installed on your system.
2. **Activate Extension**: Launch VS Code and activate the FindSuite extension.
3. **Perform File Search**:
   - Use the provided commands, shortcuts, or the VS Code command palette to initiate file searches.
   - Enter the desired search criteria such as file name, file path, or regular expression.
   - View search results directly within VS Code.

## Issues

Please let me know of any bugs via the issues page

## Release Notes

See [CHANGELOG.md](CHANGELOG.md)

## License

See [LICENSE](LICENSE) for more information.
