import { makeId, makeClass, makeName } from './common';
import { JupyrefsBrowser } from './browser';
import { JupyrefsBrowserModel } from './browsermodel';

import { TabPanel, TabBar } from '@lumino/widgets';
import { LabIcon } from '@jupyterlab/ui-components';
import { IDocumentManager } from '@jupyterlab/docmanager';

import diskIconStr from '!./assets/icon_disk.svg';

const diskIcon = new LabIcon({
  name: makeName('diskicon'),
  svgstr: diskIconStr
});

class JupyrefsIconTabRenderer extends TabBar.Renderer {
  public createIconClass(data: TabBar.IRenderData<any>): string {
    const classes = [
      super.createIconClass(data),
      makeClass('sidebar', 'tabbar', 'icon')
    ];
    return classes.join(' ');
  }
}

interface IOptions {
  tabsMovable?: boolean;
  driveName: string;
  documentManager: IDocumentManager;
}

export class JupyrefsSidebar extends TabPanel {
  constructor(options: IOptions) {
    const renderer = new JupyrefsIconTabRenderer();
    super({
      renderer: renderer,
      tabsMovable: options.tabsMovable !== false
    });

    this.tabBar.id = makeId('sidebar', 'tabbar');
    this._browserModel = new JupyrefsBrowserModel({
      driveName: options.driveName,
      documentManager: options.documentManager
    });

    return (async () => {
      this._browser = await new JupyrefsBrowser({
        id: makeId('sidebar', 'browser'),
        model: this._browserModel,
        fitPolicy: 'set-no-constraint'
      });
      this._browser.title.icon = diskIcon;

      this.addWidget(this._browser);
      this.fit();

      return this;
    })() as unknown as JupyrefsSidebar;
  }

  public get browser(): JupyrefsBrowser {
    return this._browser;
  }

  private _browser!: JupyrefsBrowser;
  private _browserModel!: JupyrefsBrowserModel;
}

// vim: set ft=typescript:
