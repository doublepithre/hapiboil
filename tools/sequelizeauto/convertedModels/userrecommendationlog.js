const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Userrecommendationlog = sequelize.define('Userrecommendationlog', {
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'user',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'user_id'
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'userrecommendationlog',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "userrecommendationlog_pkey",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
  Userrecommendationlog.associate = function(model) {
    initRelations(model);
  }
  return Userrecommendationlog;
}
const initRelations = (model) =>{
  const Userrecommendationlog = model.Userrecommendationlog;
  const User = model.User;


  Userrecommendationlog.belongsTo(User, { as: "user", foreignKey: "userId"});

}
