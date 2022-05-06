import { makeClass } from './common';
import { JupyrefsDrive } from './drive';
import { JupyrefsBrowser } from './browser';
import { JupyrefsBrowserModel } from './browsermodel';
import { JupyrefsPDFViewer } from './pdfviewer';

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { IStateDB } from '@jupyterlab/statedb';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { LabIcon } from '@jupyterlab/ui-components';

import { Widget, SingletonLayout } from '@lumino/widgets';
import { Message } from '@lumino/messaging';
import { ReadonlyPartialJSONArray } from '@lumino/coreutils';

import { extName } from './common';
import extIconStr from '!./assets/icon_primary.svg';

const extIcon = new LabIcon({
  name: `${extName}:icon`,
  svgstr: extIconStr
});

class JupyrefsManager extends Widget {
  constructor(
    statedb: IStateDB,
    docmgr: IDocumentManager,
    mimereg: IRenderMimeRegistry
  ) {
    super();

    this._statedb = statedb;
    this._docmgr = docmgr;
    this._mimereg = mimereg;

    this._documents = new Array<string>();

    this.addClass(makeClass('manager'));
    this.layout = new SingletonLayout({ fitPolicy: 'set-no-constraint' });

    return (async () => {
      const docs = (await this._statedb.fetch(
        JupyrefsManager.idOpenDocs
      )) as string[];
      if (docs) {
        docs.forEach(async (item: string) => {
          await this.openDocument(item);
        });
      }
      return this;
    })() as unknown as JupyrefsManager;
  }

  async openDocument(path: string): Promise<void> {
    const model = await this._docmgr.services.contents.get(path, {
      content: true
    });
    const renderer = this._mimereg.createRenderer(model.mimetype);
    const mimemodel = this._mimereg.createModel({ data: { ...model } });
    await renderer.renderModel(mimemodel);
    this.layout.widget = renderer;

    this._documents.push(path);
    await this._statedb.save(
      JupyrefsManager.idOpenDocs,
      this._documents as ReadonlyPartialJSONArray
    );
  }

  async processMessage(msg: Message): Promise<void> {
    if (msg.type === 'close-request') {
      await this._statedb.remove(JupyrefsManager.idOpenDocs);
    }
    super.processMessage(msg);
  }

  public layout: SingletonLayout;

  private _statedb!: IStateDB;
  private _docmgr!: IDocumentManager;
  private _mimereg!: IRenderMimeRegistry;
  private _documents: string[];

  static idOpenDocs = `${extName}:openDocuments`;
}

async function activate(
  app: JupyterFrontEnd,
  launcher: ILauncher,
  restorer: ILayoutRestorer,
  statedb: IStateDB,
  docmgr: IDocumentManager,
  mimereg: IRenderMimeRegistry
): Promise<void> {
  const factory = {
    safe: false,
    mimeTypes: [JupyrefsPDFViewer.mimeType],
    defaultRank: 100,
    createRenderer: (options: any) => new JupyrefsPDFViewer()
  };

  mimereg.addFactory(factory);

  const drive = new JupyrefsDrive({
    name: `${extName}drive`,
    host: 'http://localhost:5000'
  });
  docmgr.services.contents.addDrive(drive);

  let main: MainAreaWidget<JupyrefsManager>;
  let browser: JupyrefsBrowser;

  // Add the command to the app
  const startCmd = `${extName}:start`;
  app.commands.addCommand(startCmd, {
    label: 'Start Reference Manager',
    icon: extIcon,
    execute: async (options: any) => {
      if (!main || main.isDisposed) {
        const content = await new JupyrefsManager(statedb, docmgr, mimereg);
        main = new MainAreaWidget<JupyrefsManager>({ content: content });
        main.id = `${extName}:main`;
        main.title.label = 'Reference Manager';
        main.title.icon = extIcon;
        main.title.closable = true;
      }

      if (!browser || browser.isDisposed) {
        const model = new JupyrefsBrowserModel({
          driveName: drive.name,
          docmgr: docmgr
        });
        browser = await new JupyrefsBrowser({
          id: `${extName}:browser`,
          model: model
        });
        browser.title.icon = extIcon;
      }

      browser.fileOpened.connect(async (sender, args) => {
        await main.content.openDocument(args);
      });

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
    command: startCmd,
    category: 'Reference Manager',
    rank: 0
  });

  const tracker = new WidgetTracker<MainAreaWidget<JupyrefsManager>>({
    namespace: extName
  });

  restorer.restore(tracker, {
    command: startCmd,
    name: () => extName
  });
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: `${extName}:plugin`,
  autoStart: true,
  requires: [
    ILauncher,
    ILayoutRestorer,
    IStateDB,
    IDocumentManager,
    IRenderMimeRegistry
  ],
  activate: activate
};

export default plugin;

// vim: set ft=typescript:
