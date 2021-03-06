import * as zlib from 'zlib';

import io from '../node_modules/socket.io/client-dist/socket.io.js';

import { Signal } from '@lumino/signaling';
import { URLExt } from '@jupyterlab/coreutils';
import { ModelDB } from '@jupyterlab/observables';
import { ServerConnection, Contents } from '@jupyterlab/services';

interface IOptions {
  name: string;
  host: string;
}

export class JupyrefsDrive implements Contents.IDrive {
  constructor(options: IOptions) {
    this.fileChanged = new Signal<JupyrefsDrive, Contents.IChangedArgs>(this);
    this.isDisposed = false;
    this.name = options.name;
    this.serverSettings = ServerConnection.makeSettings();

    this._api = '/api/contents';
    this._baseUrl = options.host;
    this._socket = io(this._baseUrl);
  }

  public fileChanged: Signal<JupyrefsDrive, Contents.IChangedArgs>;
  public readonly isDisposed: boolean;
  public readonly modelDBFactory?: ModelDB.IFactory;
  public readonly name: string;
  public readonly serverSettings: ServerConnection.ISettings;

  private _api: string;
  private _baseUrl: string;
  private _socket;

  protected makeUrl(...args: string[]): string {
    const parts = args.map(path => URLExt.encodeParts(path));
    return URLExt.join(this._baseUrl, this._api, ...parts);
  }

  async copy(localPath: string, toLocalDir: string): Promise<Contents.IModel> {
    throw new Error('not implemented');
  }

  async createCheckpoint(
    localPath: string
  ): Promise<Contents.ICheckpointModel> {
    throw new Error('not implemented');
  }

  async delete(localPath: string): Promise<void> {
    throw new Error('not implemented');
  }

  async deleteCheckpoint(
    localPath: string,
    checkpointId: string
  ): Promise<void> {
    throw new Error('not implemented');
  }

  async dispose(): Promise<void> {
    throw new Error('not implemented');
  }

  async get(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    let url: string = this.makeUrl(localPath);

    const content = options && options.content ? '1' : '0';
    const format = options && options.format ? options.format : 'json';
    const params = Object.assign(Object.assign({}, options), {
      content: content,
      format: format
    });
    url += URLExt.objectToQueryString(params);

    const response = await fetch(url);
    if (!response.ok) {
      throw response.statusText;
    }

    const data = await response.json();
    if (data.format === 'zlib') {
      const compressed = data.content;
      const raw = new Buffer(compressed, 'base64');
      data.content = zlib.inflateSync(raw).toString('base64');
      data.format = 'base64';
    }

    Contents.validateContentsModel(data);
    return data;
  }

  async getDownloadUrl(localPath: string): Promise<string> {
    throw new Error('not implemented');
  }

  async listCheckpoints(
    localPath: string
  ): Promise<Contents.ICheckpointModel[]> {
    throw new Error('not implemented');
  }

  async newUntitled(
    options?: Contents.ICreateOptions
  ): Promise<Contents.IModel> {
    throw new Error('not implemented');
  }

  async rename(
    oldLocalPath: string,
    newLocalPath: string
  ): Promise<Contents.IModel> {
    throw new Error('not implemented');
  }

  async restoreCheckpoint(
    localPath: string,
    checkpointId: string
  ): Promise<void> {
    throw new Error('not implemented');
  }

  async save(
    localPath: string,
    options?: Partial<Contents.IModel>
  ): Promise<Contents.IModel> {
    throw new Error('not implemented');
  }
}

// vim: set ft=typescript:
