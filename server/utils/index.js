import { camelCase } from 'lodash';

const formatQueryRes = (r, all = false) => {
  const out = all ? [] : {};
  if (r && Array.isArray(r) && ((r.length === 1) || all)) {
    if(!all) {
      const o = r[0] || {};
      Object.keys(o).forEach(k => {
        const ck = camelCase(k);
        out[ck] = o[k];
      });
    } else {
      r.forEach((e) => {
        const ir = {};
        Object.keys(e).forEach(k => {
          const ck = camelCase(k);
          ir[ck] = e[k];
        });
        out.push(ir);
      });
    }
  }
  return out;
};

export { formatQueryRes };
