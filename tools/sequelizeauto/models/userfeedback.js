const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Userfeedback', {
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
    positiveFeedback: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'positive_feedback'
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
    negativeFeedback: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'negative_feedback'
    },
    companyId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'company',
          schema: 'hris'
        },
        key: 'company_id'
      },
      field: 'company_id'
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
};
