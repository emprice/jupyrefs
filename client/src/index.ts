import { makeId, makeClass } from './common';
import { JupyrefsDrive } from './drive';
import { JupyrefsSidebar } from './sidebar';
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
import { IThemeManager } from '@jupyterlab/apputils';
import { LabIcon, closeIcon } from '@jupyterlab/ui-components';

import { h, VirtualElement } from '@lumino/virtualdom';
import { Widget, TabPanel, TabBar } from '@lumino/widgets';
import { Message } from '@lumino/messaging';
import { ReadonlyPartialJSONArray } from '@lumino/coreutils';

import { extName, makeName } from './common';
import extIconStr from '!./assets/icon_primary.svg';
import pdfIconStr from '!./assets/icon_document_pdf.svg';

const extIcon = new LabIcon({
  name: makeName('mainicon'),
  svgstr: extIconStr
});

const pdfIcon = new LabIcon({
  name: makeName('pdficon'),
  svgstr: pdfIconStr
});

class JupyrefsClosableTabRenderer extends TabBar.Renderer {
  public renderCloseIcon(data: TabBar.IRenderData<any>): VirtualElement {
    const classes = [
      'lm-TabBar-tabCloseIcon',
      'p-TabBar-tabCloseIcon',
      'jp-icon-hover',
      makeClass('manager', 'tabpanel', 'closeicon')
    ];
    return h.div(
      {
        className: classes.join(' ')
      },
      closeIcon
    );
  }
}

class JupyrefsManager extends TabPanel {
  constructor(
    statedb: IStateDB,
    docmgr: IDocumentManager,
    mimereg: IRenderMimeRegistry,
    thememgr: IThemeManager
  ) {
    const renderer = new JupyrefsClosableTabRenderer();
    super({
      renderer: renderer,
      tabsMovable: true
    });

    this._statedb = statedb;
    this._docmgr = docmgr;
    this._mimereg = mimereg;
    this._thememgr = thememgr;

    this._documents = new Map<string, Widget>();

    this.addClass(makeClass('manager'));

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
    if (this._documents.has(path) === true) {
      // document is already open
      this.currentWidget = this._documents.get(path) || null;
    } else {
      // open the document and track it
      const model = await this._docmgr.services.contents.get(path, {
        content: true,
        format: 'base64'
      });

      const renderer = this._mimereg.createRenderer(model.mimetype);
      const mimemodel = this._mimereg.createModel({ data: { ...model } });
      await renderer.renderModel(mimemodel);

      renderer.title.label = path;
      renderer.title.icon = pdfIcon;
      renderer.title.closable = true;

      const current = this._thememgr.theme || '';
      (renderer as JupyrefsPDFViewer).lightTheme =
        this._thememgr.isLight(current);

      this._thememgr.themeChanged.connect((mgr, args) => {
        const current = mgr.theme;
        if (current) {
          (renderer as JupyrefsPDFViewer).lightTheme = mgr.isLight(current);
        }
      });

      this.addWidget(renderer);
      this.currentWidget = renderer;

      (renderer as JupyrefsPDFViewer).closed.connect(async widget => {
        const path = widget.filePath;
        if (path) {
          this._documents.delete(path);
          await this.updateDocList();
        }
      });

      this._documents.set(path, renderer);
      await this.updateDocList();
    }
  }

  protected async updateDocList(): Promise<void> {
    const doclist = Array.from(this._documents.keys());
    await this._statedb.save(
      JupyrefsManager.idOpenDocs,
      doclist as ReadonlyPartialJSONArray
    );
  }

  protected async onCloseRequest(msg: Message): Promise<void> {
    await this._statedb.remove(JupyrefsManager.idOpenDocs);
    super.onCloseRequest(msg);
  }

  private _statedb!: IStateDB;
  private _docmgr!: IDocumentManager;
  private _mimereg!: IRenderMimeRegistry;
  private _thememgr!: IThemeManager;
  private _documents: Map<string, Widget>;

  static idOpenDocs = makeName('openDocuments');
}

class JupyrefsMain extends MainAreaWidget<JupyrefsManager> {
  protected async onCloseRequest(msg: Message): Promise<void> {
    await this.content.processMessage(msg);
    super.onCloseRequest(msg);
  }
}

async function activate(
  app: JupyterFrontEnd,
  launcher: ILauncher,
  restorer: ILayoutRestorer,
  statedb: IStateDB,
  docmgr: IDocumentManager,
  mimereg: IRenderMimeRegistry,
  thememgr: IThemeManager
): Promise<void> {
  let main: JupyrefsMain;
  let sidebar: JupyrefsSidebar;

  // Add the command to the app
  const startCmd = makeName('start');
  app.commands.addCommand(startCmd, {
    label: 'Start Reference Manager',
    icon: extIcon,
    execute: async (options: any) => {
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

      if (!main || main.isDisposed) {
        const content = await new
          JupyrefsManager(statedb, docmgr, mimereg, thememgr);
        main = new JupyrefsMain({ content: content });
        main.id = makeId('main');
        main.title.label = 'Reference Manager';
        main.title.icon = extIcon;
        main.title.closable = true;
      }

      if (!sidebar || sidebar.isDisposed) {
        sidebar = await new JupyrefsSidebar({
          driveName: drive.name,
          tabsMovable: false,
          documentManager: docmgr
        });
        sidebar.id = makeId('sidebar');
        sidebar.title.icon = extIcon;
      }

      sidebar.browser.fileOpened.connect(async (sender, args) => {
        await main.content.openDocument(args);
      });

      // Define the cleanup for the main widget
      main.disposed.connect((sender, args) => {
        sidebar.dispose();
      });

      if (!tracker.has(main)) {
        tracker.add(main);
      }

      if (!main.isAttached) {
        app.shell.add(main, 'main');
      }

      if (!sidebar.isAttached) {
        app.shell.add(sidebar, 'left');
      }

      main.content.update();
      sidebar.update();

      // All done -- activate!
      app.shell.activateById(main.id);
      app.shell.activateById(sidebar.id);
    }
  });

  // Add the command to the launcher
  launcher.add({
    command: startCmd,
    category: 'Reference Manager',
    rank: 0
  });

  const tracker = new WidgetTracker<JupyrefsMain>({
    namespace: extName
  });

  restorer.restore(tracker, {
    command: startCmd,
    name: () => extName
  });
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: makeName('plugin'),
  autoStart: true,
  requires: [
    ILauncher,
    ILayoutRestorer,
    IStateDB,
    IDocumentManager,
    IRenderMimeRegistry,
    IThemeManager
  ],
  activate: activate
};

export default plugin;

// vim: set ft=typescript:
