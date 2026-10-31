# Siyuan More Code Block Info

A [SiYuan](https://b3log.org/siyuan) plugin that enriches the code block header and adds folding.

## Features

- **Code block name**: click to enter a name (up to 20 characters), persisted per block.
- **Language**: the original language label is kept and moved to the right; click to change as before.
- **Highlight theme**: choose a theme per block, with a global default theme in settings.
- **Copy / More**: original buttons are preserved.
- **Collapse whole block**: show only the header, persisted per block.
- **In-block folding**: fold code regions by braces / indentation like VS Code (folding applies when not editing; click into the code to edit).

## Install

Build the plugin and copy `dist/` into your SiYuan workspace under `data/plugins/`, then enable it from the marketplace. See `docs/` for development instructions.

## Settings

- **Default code highlight theme**: applied to code blocks without an explicit theme. Choose "Follow SiYuan" to keep the native theme.

## License

MIT

