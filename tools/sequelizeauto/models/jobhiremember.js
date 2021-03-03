const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Jobhiremember', {
    accessLevel: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'access_level'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'created_at'
    },
    jobHireMemberId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'job_hire_member_id'
    },
    jobId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'jobs',
          schema: 'hris'
        },
        key: 'job_id'
      },
      field: 'job_id'
    },
    scopes: {
      type: DataTypes.JSON,
      allowNull: true
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
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'jobhiremember',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobhiremember_pkey",
        unique: true,
        fields: [
          { name: "job_id" },
          { name: "user_id" },
        ]
      },
    ]
  });
};
