import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { IFileBrowserFactory, FileBrowser } from '@jupyterlab/filebrowser';
import { LabIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';

//import * as d3 from 'd3';
//import * as Plot from '@observablehq/plot';

import jupyrefsIconStr from './assets/iconmod.svg';

const jupyrefsIcon = new LabIcon({
  name: 'jupyrefs:icon',
  svgstr: jupyrefsIconStr
});

/**
 * Create the main content widget
 */
function createMainWidget(app: JupyterFrontEnd): Widget {
  const content = new Widget();
  const widget = new MainAreaWidget({ content });
  widget.id = 'jupyrefs:main';
  widget.title.label = 'Reference Manager';
  widget.title.closable = true;

  if (!widget.isAttached) {
    app.shell.add(widget, 'main');
  }

  return widget;
}

/**
 * Create the file browser widget
 */
function createFileBrowserWidget(
  app: JupyterFrontEnd,
  factory: IFileBrowserFactory
): FileBrowser {
  const widget = factory.createFileBrowser('jupyrefs:browse');
  widget.title.icon = jupyrefsIcon;

  if (!widget.isAttached) {
    app.shell.add(widget, 'left');
  }

  return widget;
}

/**
 * Initialization data for the jupyrefs extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyrefs:plugin',
  autoStart: true,
  requires: [ILauncher, IFileBrowserFactory],
  activate: async (
    app: JupyterFrontEnd,
    launcher: ILauncher,
    factory: IFileBrowserFactory
  ) => {
    // Add the command to the app
    const command = 'jupyrefs:open';
    app.commands.addCommand(command, {
      label: 'Start Reference Manager',
      icon: jupyrefsIcon,
      execute: () => {
        const browser = createFileBrowserWidget(app, factory);
        const main = createMainWidget(app);

        // Define the cleanup for the main widget
        main.disposed.connect((sender, args) => {
          browser.dispose();
        });

        // All done -- activate!
        app.shell.activateById(main.id);
      }
    });

    // Add the command to the launcher
    launcher.add({
      command: command,
      category: 'Reference Manager',
      rank: 0
    });
  }
};

export default plugin;

// vim: set ft=typescript:
