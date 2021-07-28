const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Onboardingfixedtask = sequelize.define('Onboardingfixedtask', {
    onboardingfixedtaskId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'onboardingfixedtask_id'
    },
    taskName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'task_name'
    },
    taskDescription: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'task_description'
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
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    subType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'sub_type'
    }
  }, {
    sequelize,
    tableName: 'onboardingfixedtasks',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "onboardingfixedtasks_pkey",
        unique: true,
        fields: [
          { name: "onboardingfixedtask_id" },
        ]
      },
    ]
  });
  Onboardingfixedtask.associate = function(model) {
    initRelations(model);
  }
  return Onboardingfixedtask;
}
const initRelations = (model) =>{
  const Onboardingfixedtask = model.Onboardingfixedtask;
  const Onboardingtask = model.Onboardingtask;


  Onboardingfixedtask.hasMany(Onboardingtask, { as: "onboardingtasks", foreignKey: "taskId"});

}
