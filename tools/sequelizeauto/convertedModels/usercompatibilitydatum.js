const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Usercompatibilitydatum = sequelize.define('Usercompatibilitydatum', {
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'user_id'
    },
    compatibility: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'usercompatibilitydata',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "usercompatibilitydata_pkey",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
  Usercompatibilitydatum.associate = function(model) {
    initRelations(model);
  }
  return Usercompatibilitydatum;
}
const initRelations = (model) =>{
  const Usercompatibilitydatum = model.Usercompatibilitydatum;
  const Userinfo = model.Userinfo;


  Usercompatibilitydatum.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});

}
