import * as config from '../../config.js';

import cors from 'cors';
import createApplication from 'express';
import * as express from 'express';
import { MongoClient, Db } from 'mongodb';

class JupyrefsRestMongo {
  constructor(mongoConn: string, staticsPath: string) {
    this._db = null;
    this._client = new MongoClient(mongoConn);

    this._router = express.Router();
    this._router.route('/listings').get(async (req, res) => {
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

    this._app = createApplication();
    this._app.use(cors());
    this._app.use(express.json());
    this._app.use(this._router);
    this._app.use('/files', express.static(staticsPath));
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

  private _app: express.Application;
  private _router: express.Router;
}

const mongoConn: string =
  `${config.mongoHost}:${config.mongoPort}/${config.mongoDatabase}`;
const rest = new JupyrefsRestMongo(mongoConn, config.staticsPath);
rest.go(config.listenPort);

// vim: set ft=typescript:
