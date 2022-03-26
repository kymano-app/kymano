import crypto from 'crypto';
import fs from 'fs';

export async function fileHash(path: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    let hash = crypto.createHash('sha256').setEncoding('hex');
    fs.createReadStream(path)
      .once('error', reject)
      .pipe(hash)
      .once('finish', function () {
        resolve(hash.read());
      });
  });
}

export async function hash(string: string): Promise<string> {
    return new Promise(function (resolve, reject) {
        resolve(crypto.createHash('sha256').update(string).digest('hex'));
    });
  }