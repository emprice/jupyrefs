import { IBrowserModel } from './interfaces';

import { URLExt } from '@jupyterlab/coreutils';
import { Contents } from '@jupyterlab/services';
import { IDocumentManager } from '@jupyterlab/docmanager';

interface IOptions {
  documentManager: IDocumentManager;
  driveName: string;
}

export class JupyrefsBrowserModel extends IBrowserModel {
  constructor(options: IOptions) {
    super();

    this._documentManager = options.documentManager;
    this._driveName = options.driveName;
    this._currentPath = '';
  }

  public async items(relPath = ''): Promise<Contents.IModel[]> {
    const absPath = URLExt.join(
      this._currentPath,
      this.stripDriveName(relPath)
    );
    const fullPath = this.prependDriveName(absPath);
    const contents = await this._documentManager.services.contents.get(
      fullPath,
      { content: true }
    );

    if (contents.type === 'directory') {
      return contents.content.filter(
        (item: Contents.IModel) => item.name.startsWith('.') === false
      );
    } else {
      return new Array<Contents.IModel>();
    }
  }

  protected prependDriveName(pth: string): string {
    const drv = this._driveName + ':';
    if (pth.startsWith(drv)) {
      return pth;
    } else {
      return drv + pth;
    }
  }

  protected stripDriveName(pth: string): string {
    const drv = this._driveName + ':';
    if (pth.startsWith(drv)) {
      return pth.slice(drv.length, pth.length);
    } else {
      return pth;
    }
  }

  private _documentManager: IDocumentManager;
  private _driveName: string;
  private _currentPath: string;
}

// vim: set ft=typescript:
