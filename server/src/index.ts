import config from '../../jupyrefs.config.js';
import { contentsGet } from './contents.js';

import cors from 'cors';
import createApplication from 'express';
import { Application, Request, Response, json } from 'express';
import { MongoClient, Db } from 'mongodb';

class JupyrefsRestApi {
  constructor(mongoConn: string, staticsPath: string) {
    this._db = null;
    this._client = new MongoClient(mongoConn);

    this._mongoApi = createApplication();
    this._mongoApi.route('/listings').get(async (req: Request, res: Response) => {
      if (this._db) {
        this._db
          .collection('listingsAndReviews')
          .find({}).limit(50)
          .toArray(function (err, result) {
            if (err) {
              res.status(400).send('Could not fetch listings!');
            } else {
              res.json(result);
            }
          });
      }
    });

    this._contentsApi = createApplication();
    this._contentsApi.route('/').get(contentsGet(staticsPath));

    this._app = createApplication();
    this._app.use(cors());
    this._app.use(json());

    this._app.use('/drive/api/contents', this._contentsApi);
    this._app.use('/mongo/api', this._mongoApi);
  }

  async go(port: number): Promise<void> {
    await this._client.connect()
    this._db = this._client.db();
    console.log('connected!');

    this._app.listen(port, () => {
      console.log(`running on port ${port}`);
    });
  }

  private _db: Db | null;
  private _client: MongoClient;

  private _app: Application;
  private _mongoApi: Application;

  private _contentsApi: Application;
}

const mongoConn: string =
  `${config.mongoHost}:${config.mongoPort}/${config.mongoDatabase}`;
const rest = new JupyrefsRestApi(mongoConn, config.staticsPath);
rest.go(config.listenPort);

// vim: set ft=typescript:
