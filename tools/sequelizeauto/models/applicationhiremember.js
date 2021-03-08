const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Applicationhiremember', {
    applicationHireMemberId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'application_hire_member_id'
    },
    applicationId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'jobapplications',
          schema: 'hris'
        },
        key: 'application_id'
      },
      field: 'application_id'
    },
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
    accessLevel: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'access_level'
    },
    scopes: {
      type: DataTypes.JSON,
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
    tableName: 'applicationhiremember',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "applicationhiremember_pkey",
        unique: true,
        fields: [
          { name: "application_id" },
          { name: "user_id" },
        ]
      },
    ]
  });
};
