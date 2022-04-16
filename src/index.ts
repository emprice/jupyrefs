import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyrefs extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyrefs:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyrefs is activated!');
  }
};

export default plugin;
