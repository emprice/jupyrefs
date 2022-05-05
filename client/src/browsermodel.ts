import { IBrowserModel } from './interfaces';

import * as path from 'path';

import { URLExt } from '@jupyterlab/coreutils';
import { Contents } from '@jupyterlab/services';
import { IDocumentManager } from '@jupyterlab/docmanager';

interface IOptions {
  docmgr: IDocumentManager;
  driveName: string;
}

export class JupyrefsBrowserModel extends IBrowserModel {
  constructor(options: IOptions) {
    super();

    this._docmgr = options.docmgr;
    this._driveName = options.driveName;
    this._currentPath = '';
  }

  public async items(relPath: string = ''): Promise<Contents.IModel[]> {
    const absPath = URLExt.join(this._currentPath, this.stripDriveName(relPath));
    const fullPath = this.prependDriveName(absPath);
    const contents = await this._docmgr.services.contents.get(fullPath, { content: true });

    if (contents.type === 'directory') {
      return (contents.content as Contents.IModel[]);
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

  private _docmgr: IDocumentManager;
  private _driveName: string;
  private _currentPath: string;
}

// vim: set ft=typescript: