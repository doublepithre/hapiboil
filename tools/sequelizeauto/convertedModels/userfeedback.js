const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Userfeedback = sequelize.define('Userfeedback', {
    userfeedbackId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'userfeedback_id'
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'user_id'
    },
    feedback: {
      type: DataTypes.STRING,
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'userfeedback',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "userfeedback_pkey",
        unique: true,
        fields: [
          { name: "userfeedback_id" },
        ]
      },
    ]
  });
  Userfeedback.associate = function(model) {
    initRelations(model);
  }
  return Userfeedback;
}
const initRelations = (model) =>{
  const Userfeedback = model.Userfeedback;
  const Userinfo = model.Userinfo;


  Userfeedback.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});

}
