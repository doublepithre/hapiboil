const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Onboardingtask', {
    onboardingtaskId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'onboardingtask_id'
    },
    onboardingId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'onboardings',
          schema: 'hris'
        },
        key: 'onboarding_id'
      },
      field: 'onboarding_id'
    },
    taskId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'onboardingfixedtasks',
          schema: 'hris'
        },
        key: 'onboardingfixedtask_id'
      },
      field: 'task_id'
    },
    asignee: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
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
    tableName: 'onboardingtasks',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "onboardingtasks_pkey",
        unique: true,
        fields: [
          { name: "onboardingtask_id" },
        ]
      },
    ]
  });
};
