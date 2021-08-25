const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Onboardingfixedtask', {
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
};
