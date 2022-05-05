import { Contents } from '@jupyterlab/services';

export abstract class IBrowserModel {
  public abstract items(): Promise<Contents.IModel[]>;
}

// vim: set ft=typescript:
