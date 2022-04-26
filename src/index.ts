import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { IDocumentManager } from '@jupyterlab/docmanager';
import {
  FileBrowser,
  FilterFileBrowserModel,
  DirListing
} from '@jupyterlab/filebrowser';
import { Contents } from '@jupyterlab/services';
import { LabIcon } from '@jupyterlab/ui-components';

import { Widget } from '@lumino/widgets';

import extIconStr from './assets/iconmod.svg';
import { ForceGraph } from './plots';

type FileBrowserOptions = FileBrowser.IOptions;
type DirListingOptions = DirListing.IOptions;
type ContentsModel = Contents.IModel;

const extName = 'jupyrefs';
const extIcon = new LabIcon({
  name: `${extName}:icon`,
  svgstr: extIconStr
});

class JupyrefsManager extends Widget {
  constructor() {
    super();
    this.makeForceGraph().then(chart => {
      this.node.appendChild(chart);
    });
  }

  async makeForceGraph() {
    const doi = '10.1088/0004-637X/744/2/162';
    const refs: { nodes: Set<string>; links: Set<string[]> } =
      await this.buildReferences(doi, 0, 1);
    const cits: { nodes: Set<string>; links: Set<string[]> } =
      await this.buildCitations(doi, 0, 1);

    const nodes = new Set<string>();
    refs.nodes.forEach((item: string) => nodes.add(item));
    cits.nodes.forEach((item: string) => nodes.add(item));

    const links = new Set<string[]>();
    refs.links.forEach((item: string[]) => links.add(item));
    cits.links.forEach((item: string[]) => links.add(item));

    const n = Array<{ id: string; group: string }>();
    const l = Array<{ source: string; target: string }>();

    nodes.forEach(async (item: string) => {
      const doi: string = item.toUpperCase();
      const grp: string = doi.split('/')[0];
      n.push({ id: doi, group: grp });
    });
    links.forEach((item: string[]) => {
      const doi1: string = item[0].toUpperCase();
      const doi2: string = item[1].toUpperCase();
      l.push({ source: doi1, target: doi2 });
    });

    const colors: string[] = [
      '#bf616a',
      '#8fbcbb',
      '#d08770',
      '#88c0d0',
      '#ebcb8b',
      '#81a1c1',
      '#a3be8c',
      '#5e81ac',
      '#b48ead'
    ];
    return ForceGraph(
      n,
      l,
      (d: any) => d.id,
      (d: any) => d.group,
      colors
    );
  }

  async buildReferences(doi: string, level: number, maxLevel: number) {
    const allnodes = new Set<string>([doi]);
    const alllinks = new Set<string[]>();

    if (level < maxLevel) {
      const url = `https://opencitations.net/index/coci/api/v1/references/${doi}?format=json`;
      const response = await fetch(url);
      const data = await response.json();
      data.forEach(async (d: any) => {
        const refs = await this.buildReferences(d.cited, level + 1, maxLevel);
        refs.nodes.forEach((item: string) => {
          allnodes.add(item);
          alllinks.add([doi, item]);
        });
        refs.links.forEach((item: string[]) => alllinks.add(item));
      });
    }

    return { nodes: allnodes, links: alllinks };
  }

  async buildCitations(doi: string, level: number, maxLevel: number) {
    const allnodes = new Set<string>([doi]);
    const alllinks = new Set<string[]>();

    if (level < maxLevel) {
      const url = `https://opencitations.net/index/coci/api/v1/citations/${doi}?format=json`;
      const response = await fetch(url);
      const data = await response.json();
      data.forEach(async (d: any) => {
        const refs = await this.buildCitations(d.citing, level + 1, maxLevel);
        refs.nodes.forEach((item: string) => {
          allnodes.add(item);
          alllinks.add([doi, item]);
        });
        refs.links.forEach((item: string[]) => alllinks.add(item));
      });
    }

    return { nodes: allnodes, links: alllinks };
  }
}

class JupyrefsDirListing extends DirListing {
  constructor(options: DirListingOptions) {
    super(options);
  }

  protected handleOpen(item: ContentsModel): void {
    if (item.type === 'directory') {
      super.handleOpen(item);
    } else {
      console.log('yo');
    }
  }
}

class JupyrefsBrowser extends FileBrowser {
  constructor(options: FileBrowserOptions) {
    super(options);
  }

  protected createDirListing(options: DirListingOptions): DirListing {
    return new JupyrefsDirListing(options);
  }
}

async function activate(
  app: JupyterFrontEnd,
  launcher: ILauncher,
  restorer: ILayoutRestorer,
  docmgr: IDocumentManager
): Promise<void> {
  let main: MainAreaWidget<JupyrefsManager>;
  let browser: JupyrefsBrowser;

  // Add the command to the app
  const command = `${extName}:start`;
  app.commands.addCommand(command, {
    label: 'Start Reference Manager',
    icon: extIcon,
    execute: () => {
      if (!main || main.isDisposed) {
        const content = new JupyrefsManager();
        main = new MainAreaWidget({ content });
        main.id = `${extName}:main`;
        main.title.label = 'Reference Manager';
        main.title.closable = true;
      }

      if (!browser || browser.isDisposed) {
        const model = new FilterFileBrowserModel({
          manager: docmgr,
          filter: value => value.mimetype === 'application/pdf'
        });

        browser = new JupyrefsBrowser({ id: `${extName}:browser`, model: model });
        browser.title.icon = extIcon;
      }

      // Define the cleanup for the main widget
      main.disposed.connect((sender, args) => {
        browser.dispose();
      });


      if (!tracker.has(main)) {
        tracker.add(main);
      }

      if (!main.isAttached) {
        app.shell.add(main, 'main');
      }

      if (!browser.isAttached) {
        app.shell.add(browser, 'left');
      }

      main.content.update();
      browser.update();

      // All done -- activate!
      app.shell.activateById(main.id);
      app.shell.activateById(browser.id);
    }
  });

  // Add the command to the launcher
  launcher.add({
    command: command,
    category: 'Reference Manager',
    rank: 0
  });

  // Track and restore the widget state
  const tracker = new WidgetTracker<MainAreaWidget<JupyrefsManager>>({
    namespace: `${extName}`
  });

  restorer.restore(tracker, {
    command,
    name: () => `${extName}`
  });
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: `${extName}:plugin`,
  autoStart: true,
  requires: [ILauncher, ILayoutRestorer, IDocumentManager],
  activate: activate
};

export default plugin;

// vim: set ft=typescript:
