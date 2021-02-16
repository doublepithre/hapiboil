# Auto generate sequelize definitions
Ensure that you are in the folder tools/sequelizeauto
```
bash autoseq.sh
```

Note that sequelize auto does not handle many to many associatians well please add the highlighted into questionnaire.js

Questionnaire.belongsToMany(Questionnaire, { `as:"em2ea"`, through: Questionmapping, foreignKey: "empauwerAllQid", otherKey: "empauwerMeQid" });

Questionnaire.belongsToMany(Questionnaire, { `as:"ea2em"`,through: Questionmapping, foreignKey: "empauwerMeQid", otherKey: "empauwerAllQid" });