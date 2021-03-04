const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Jobapplication', {
    applicationId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'application_id'
    },
    jobId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'jobs',
          schema: 'hris'
        },
        key: 'job_id'
      },
      unique: "jobapplications_job_id_user_id_key",
      field: 'job_id'
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
      unique: "jobapplications_job_id_user_id_key",
      field: 'user_id'
    },
    isApplied: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_applied'
    },
    isWithdrawn: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_withdrawn'
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
    tableName: 'jobapplications',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobapplications_job_id_user_id_key",
        unique: true,
        fields: [
          { name: "job_id" },
          { name: "user_id" },
        ]
      },
      {
        name: "jobapplications_pkey",
        unique: true,
        fields: [
          { name: "application_id" },
        ]
      },
    ]
  });
};
