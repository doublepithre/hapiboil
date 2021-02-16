/**
 * Use this script to rename any variables generated in convertedModels
 */
const fs = require('fs');

let file = fs.readFileSync('./convertedModels/usermetum.js',{encoding:'utf-8'});
file = file.replace(/usermetum/g,'usermeta');
file = file.replace(/Usermetum/g,'Usermeta');
fs.writeFileSync('./convertedModels/usermeta.js',file);
fs.unlink('./convertedModels/usermetum.js', (err) => {//deleted file
    if (err) throw err;
  });