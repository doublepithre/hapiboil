/**
 * NOTE: 
 * This is a hack. 
 * The right way is to format the ORM properly such that it always returns in its orm form.
 * 
 * This function converts all object keys to camel case recursively.
 */

import { camelCase } from 'lodash';

const camelizeKeys = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(v => camelizeKeys(v));
  } else if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce(
      (result, key) => ({
        ...result,
        [camelCase(key)]: camelizeKeys(obj[key]),
      }),
      {},
    );
  }
  return obj;
};

module.exports = {
    camelizeKeys
}