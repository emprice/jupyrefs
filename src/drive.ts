// JupyterLab components and interfaces
import { Contents, Drive } from '@jupyterlab/services';

interface IJupyrefsDriveOptions extends Drive.IOptions {
  basePath: string;
}

export class JupyrefsDrive extends Drive {
  constructor(options: IJupyrefsDriveOptions) {
    super(options);
    this._basePath = options.basePath;
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
    const url = this.prependBasePath(localPath);
    const gotten = await super.get(url, options);

    const mod = Object.assign(gotten, { path: localPath });

    if (mod.type === 'directory') {
      const content = mod.content.map((item: any) =>
        Object.assign(item, {
          path: this.stripBasePath((item as Contents.IModel).path)
        })
      );
      return Object.assign(mod, { content: content });
    }

    return mod;
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

  protected prependBasePath(pth: string): string {
    const pre = this._basePath + '/';
    if (pth.startsWith(pre)) {
      return pth;
    } else {
      return pre + pth;
    }
  }

  protected stripBasePath(pth: string): string {
    const pre = this._basePath + '/';
    if (pth.startsWith(pre)) {
      return pth.slice(pre.length, pth.length);
    } else {
      return pth;
    }
  }

  private _basePath: string;
}

// vim: set ft=typescript:
