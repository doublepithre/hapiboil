const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Onboardingtasktype = sequelize.define('Onboardingtasktype', {
    onboardingtasktypeId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'onboardingtasktype_id'
    },
    taskTypeName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'task_type_name'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'onboardingtasktypes',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "onboardingtasktypes_pkey",
        unique: true,
        fields: [
          { name: "onboardingtasktype_id" },
        ]
      },
    ]
  });
  Onboardingtasktype.associate = function(model) {
    initRelations(model);
  }
  return Onboardingtasktype;
}
const initRelations = (model) =>{
  const Onboardingtasktype = model.Onboardingtasktype;
  const Onboardingfixedtask = model.Onboardingfixedtask;


  Onboardingtasktype.hasMany(Onboardingfixedtask, { as: "onboardingfixedtasks", foreignKey: "taskTypeId"});

}
