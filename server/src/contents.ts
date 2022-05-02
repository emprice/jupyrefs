import * as fs from 'fs/promises';
import { constants } from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';

interface Content {
  content?: any;
  created?: string;
  format?: string | null;
  last_modified?: string;
  mimetype?: string;
  name?: string;
  path?: string;
  size?: number | null;
  type?: string;
  writable?: boolean;
}

interface Answer {
  type?: string;
  created?: string | bigint;
  last_modified?: string | bigint;
  path?: string;
  name?: string;
  size?: number | bigint | null;
  mimetype?: string | null;
  writable?: boolean;
  content?: Content | Content[] | string | null;
  format?: string | null;
}

export function contentsGet(root: string) {
  const rootPath = path.normalize(path.resolve(root));

  return async function (req: Request, res: Response) {
    const answer: Answer = {};
    const fullPath = path.normalize(path.join(rootPath, req.path));

    try {
      const stats = await fs.stat(fullPath);

      answer.type = 'json';
      answer.created = stats.birthtime.toISOString();
      answer.last_modified = stats.mtime.toISOString();
      answer.path = req.path;
      answer.name = path.basename(req.path);
      res.set('Last-Modified', stats.mtime.toISOString());

      try {
        await fs.access(fullPath, constants.W_OK);
        answer.writable = true;
      } catch {
        answer.writable = false;
      }

      if (stats.isFile()) {
        console.log('that\'s a file, fren');
        res.status(500).end();
      } else if (stats.isDirectory()) {
        answer.size = null;
        answer.mimetype = null;

        if (req.query.content && Number(req.query.content) == 1) {
          try {
            const files = await fs.readdir(fullPath);
            let content = new Array<Content>();

            for (let item of files) {
              const thisPath = path.normalize(path.join(fullPath, item));
              const part: Content = {
                name: item
              };

              try {
                const stat = await fs.stat(thisPath);

                if (stat.isFile()) {
                  part.type = 'file';
                } else if (stat.isDirectory()) {
                  part.type = 'directory';
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
                part.path = path.join(req.path, item).substring(1);
                part.size = null;
              } catch (what) {
                const err = (what as NodeJS.ErrnoException);
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
              (req.query.format && typeof req.query.format === 'string')
                ? req.query.format
                : 'text';

            if (format === 'text') {
              answer.content = content;
              answer.format = 'json';
              res.status(200).json(answer);
            } else if (format === 'base64') {
              const buf = new Buffer(content);
              answer.content = buf.toString('base64');
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
      } else {
        // neither file nor directory
        res.status(404).send('Not a file or directory');
      }
    } catch (what) {
      const err = (what as NodeJS.ErrnoException);
      if (err.code === 'ENOENT') {
        res.status(404).send('No such file or directory');
      } else if (err.code === 'ENAMETOOLONG') {
        res.status(400).send('File name too long');
      } else {
        res.status(500).send('Unspecified internal error');
      }
    }
  };
};

// vim: set ft=typescript:
