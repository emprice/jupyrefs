import { IBrowserModel } from './interfaces';

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

  public async items(): Promise<Contents.IModel[]> {
    const path = this._driveName + ':' + this._currentPath;
    const contents = await this._docmgr.services.contents.get(path);

    if (contents.type === 'directory') {
      return (contents.content as Contents.IModel[]);
    } else {
      return new Array<Contents.IModel>();
    }
  }

  private _docmgr: IDocumentManager;
  private _driveName: string;
  private _currentPath: string;
}

// vim: set ft=typescript:
