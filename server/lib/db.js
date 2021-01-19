import { Pool } from 'pg';
import config from 'config';

const pool = new Pool({
  connectionString: config.db.connectionString,
});

export const query = (text, params, callback) => {
  return pool.query(text, params, callback);
};
