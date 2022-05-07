import * as fs from 'fs/promises';
import { constants } from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { Request, Response } from 'express';
import * as mime from 'mime-types';

interface IContent {
  content?: any;
  created?: string;
  format?: string | null;
  last_modified?: string;
  mimetype?: string | null;
  name?: string;
  path?: string;
  size?: number | null;
  type?: string;
  writable?: boolean;
}

interface IAnswer {
  type?: string;
  created?: string | bigint;
  last_modified?: string | bigint;
  path?: string;
  name?: string;
  size?: number | bigint | null;
  mimetype?: string | null;
  writable?: boolean;
  content?: IContent | IContent[] | string | null;
  format?: string | null;
}

async function doFileAnswer(
  req: Request,
  res: Response,
  fullPath: string,
  answer: IAnswer
): Promise<void> {
  answer.type = 'file';

  if (req.query.content && Number(req.query.content) === 1) {
    try {
      const content = await fs.readFile(fullPath, 'base64');
      const format: string =
        req.query.format && typeof req.query.format === 'string'
          ? req.query.format
          : 'base64';

      if (format === 'zlib') {
        answer.content = zlib.deflateSync(content).toString('base64');
        answer.format = 'zlib';
        res.status(200).json(answer);
      } else if (format === 'base64') {
        answer.content = content;
        answer.format = 'base64';
        res.status(200).json(answer);
      } else {
        res.status(400).send('Unrecognized format');
      }
    } catch {
      res.status(500).send('Unspecified internal error');
    }
  } else {
    // no content requested
    answer.content = null;
    answer.format = null;
    res.status(200).json(answer);
  }
}

async function doDirectoryAnswer(
  req: Request,
  res: Response,
  fullPath: string,
  answer: IAnswer
): Promise<void> {
  answer.type = 'directory';

  if (req.query.content && Number(req.query.content) === 1) {
    try {
      const files = await fs.readdir(fullPath);
      const content = new Array<IContent>();

      for (const item of files) {
        const thisPath = path.normalize(path.join(fullPath, item));
        const part: IContent = {
          name: item
        };

        try {
          const stat = await fs.stat(thisPath);

          if (stat.isFile()) {
            part.type = 'file';
            part.mimetype = mime.lookup(item) || null;
          } else if (stat.isDirectory()) {
            part.type = 'directory';
            part.mimetype = null;
          } else {
            return; // unknown type, skip for now
          }

          try {
            await fs.access(thisPath, constants.W_OK);
            part.writable = true;
          } catch {
            part.writable = false;
          }

          part.content = null;
          part.format = null;
          part.created = stat.birthtime.toISOString();
          part.last_modified = stat.mtime.toISOString();
          part.path = path.join(answer.path || '', item).substring(1);
          part.size = null;
        } catch (what) {
          const err = what as NodeJS.ErrnoException;
          if (err.code === 'ENOENT') {
            res.status(404).send('No such file or directory');
          } else if (err.code === 'ENAMETOOLONG') {
            res.status(400).send('File name too long');
          } else {
            res.status(500).send('Unspecified internal error');
          }
          return; // unknown type, skip for now
        }

        content.push(part);
      }

      const format: string =
        req.query.format && typeof req.query.format === 'string'
          ? req.query.format
          : 'json';

      if (format === 'json') {
        answer.content = content;
        answer.format = 'json';
        res.status(200).json(answer);
      } else {
        res.status(400).send('Unrecognized format');
      }
    } catch {
      res.status(500).send('Unspecified internal error');
    }
  } else {
    // no content requested
    answer.content = null;
    answer.format = null;
    res.status(200).json(answer);
  }
}

export function contentsGet(root: string) {
  const rootPath = path.normalize(path.resolve(root));

  return async function (req: Request, res: Response) {
    const answer: IAnswer = {};
    const localPath = decodeURIComponent(req.path);
    const fullPath = path.normalize(path.join(rootPath, localPath));

    try {
      const stats = await fs.stat(fullPath);

      answer.created = stats.birthtime.toISOString();
      answer.last_modified = stats.mtime.toISOString();
      answer.path = localPath;
      answer.name = path.basename(localPath);
      res.set('Last-Modified', stats.mtime.toISOString());

      try {
        await fs.access(fullPath, constants.W_OK);
        answer.writable = true;
      } catch {
        answer.writable = false;
      }

      if (stats.isFile()) {
        // a file was requested
        answer.size = stats.size;
        answer.mimetype = mime.lookup(answer.name) || null;
        await doFileAnswer(req, res, fullPath, answer);
      } else if (stats.isDirectory()) {
        // a directory was requested
        answer.size = null;
        answer.mimetype = null;
        await doDirectoryAnswer(req, res, fullPath, answer);
      } else {
        // neither file nor directory
        res.status(404).send('Not a file or directory');
      }
    } catch (what) {
      const err = what as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        res.status(404).send('No such file or directory');
      } else if (err.code === 'ENAMETOOLONG') {
        res.status(400).send('File name too long');
      } else {
        res.status(500).send('Unspecified internal error');
      }
    }
  };
}

// vim: set ft=typescript:
