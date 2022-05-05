import { Contents } from '@jupyterlab/services';

export abstract class IBrowserModel {
  public abstract items(relPath?: string): Promise<Contents.IModel[]>;
}

// vim: set ft=typescript:
