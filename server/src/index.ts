import cors from 'cors';
import createApplication from 'express';
import { Application, Router, json } from 'express';
import { MongoClient, Db } from 'mongodb';

class JupyrefsRestMongo {
  constructor(connectionString: string) {
    this._db = null;
    this._client = new MongoClient(connectionString);

    this._router = Router();
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
    this._app.use(json());
    this._app.use(this._router);
  }

  async go(port: number): Promise<void> {
    await this._client.connect()
    this._db = this._client.db();
    console.log('connected!');

    this._app.listen(port, () => {
      console.log(`running on port ${port}`);
    });
  }

  private _app: Application;
  private _db: Db | null;
  private _client: MongoClient;
  private _router: Router;
}

const port: number = 5000;
const connectionString: string = 'mongodb://localhost:27017/sample_airbnb';

const rest = new JupyrefsRestMongo(connectionString);
rest.go(port);

// vim: set ft=typescript:
