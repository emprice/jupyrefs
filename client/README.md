# jupyrefs client plugin

- [Features and todos](#construction-features-and-todos)
- [Credits and acknowledgements](#sparkles-credits-and-acknowledgements)
- [Installing and uninstalling](#wrench-installing-and-uninstalling)
  - [Requirements](#requirements)
  - [Install](#install)
  - [Uninstall](#uninstall)
  - [Contributing](#contributing)

## :construction: Features and todos

- [x] Extend and override JupyterLab behavior
- [x] Open PDF documents with Mozilla's `pdf.js`
- [ ] Annotate PDF documents with `annotpdf`
- [x] Browse files in a tree layout instead of simple list
- [ ] Cache results from the file server to reduce duplicate requests
- [ ] Notes interface using Markdown

## :sparkles: Credits and acknowledgements

- Primary icon by [FreeVector.com](https://www.freevector.com/chemistry-symbols-vector-27726),
  with slight modification for compatibility with JupyterLab's light/dark theme settings
- Other user interface icons by [Anu Rocks](https://freeicons.io/profile/730) on
  [freeicons.io](https://freeicons.io/icon-list/regular-life-icons) with slight
  modification to enable resizing

## :wrench: Installing and uninstalling

### Requirements

- JupyterLab >= 3.0

### Install

To install the extension, execute:

```bash
pip install jupyrefs
```

### Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyrefs
```

### Contributing

#### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyrefs directory
# Install package in development mode
pip install -e .
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

#### Development uninstall

```bash
pip uninstall jupyrefs
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyrefs` within that folder.

#### Packaging the extension

See [RELEASE](RELEASE.md)

<!-- vim: set ft=markdown: -->
