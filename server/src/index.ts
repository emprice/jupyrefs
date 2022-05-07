import { contentsGet } from './contents.js';

import cors from 'cors';
import * as path from 'path';

import createApplication from 'express';
import { Application, Request, Response } from 'express';
import * as http from 'http';
import * as io from 'socket.io';
import { MongoClient, Db } from 'mongodb';

const config = {
  mongoPort: 27017,
  mongoHost: 'mongodb://localhost',
  mongoDatabase: 'sample_airbnb',
  listenPort: 5000,
  staticsPath: path.normalize('../sandbox')
};

class JupyrefsRestApi {
  constructor(mongoConn: string, staticsPath: string) {
    this._db = null;
    this._client = new MongoClient(mongoConn);

    this._mongoApi = createApplication();
    this._mongoApi.get('/listings', async (req: Request, res: Response) => {
      if (this._db) {
        this._db
          .collection('listingsAndReviews')
          .find({})
          .limit(50)
          .toArray((err, result) => {
            if (err) {
              res.status(400).send('Could not fetch listings!');
            } else {
              res.json(result);
            }
          });
      }
    });

    this._contentsApi = createApplication();
    this._contentsApi.get('/*', contentsGet(staticsPath));

    this._app = createApplication();
    this._http = http.createServer(this._app);
    this._io = new io.Server(this._http, {
      cors: {
        origin: true
      }
    });

    this._app.use(cors());
    this._app.use('/api/contents', this._contentsApi);
    this._app.use('/api/mongo', this._mongoApi);

    this._io.on('connection', socket => {
      console.log('[connection event]');
    });
  }

  async go(port: number): Promise<void> {
    await this._client.connect();
    this._db = this._client.db();
    console.log('connected to mongo!');

    this._http.listen(port, () => {
      console.log(`running on port ${port}`);
    });
  }

  private _db: Db | null;
  private _client: MongoClient;

  private _app: Application;
  private _mongoApi: Application;
  private _contentsApi: Application;

  private _io;
  private _http;
}

const mongoConn = `${config.mongoHost}:${config.mongoPort}/${config.mongoDatabase}`;
const rest = new JupyrefsRestApi(mongoConn, config.staticsPath);
rest.go(config.listenPort);

// vim: set ft=typescript:
