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

let file2 = fs.readFileSync('./convertedModels/questionnaire.js',{encoding:'utf-8'});
file2 = file2.replace('foreignKey: "empauwerAllQid", otherKey: "empauwerMeQid"','foreignKey: "empauwerAllQid", otherKey: "empauwerMeQid", as:"ea2em"');
file2 = file2.replace('foreignKey: "empauwerMeQid", otherKey: "empauwerAllQid"','foreignKey: "empauwerMeQid", otherKey: "empauwerAllQid", as:"em2ea"');
fs.writeFileSync('./convertedModels/questionnaire.js',file2);