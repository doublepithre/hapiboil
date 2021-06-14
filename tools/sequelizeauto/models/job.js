const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Job', {
    jobId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'job_id'
    },
    jobUuid: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: "job_uuid_key",
      field: 'job_uuid'
    },
    jobDescription: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'job_description'
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'user',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'user_id'
    },
    active: {
      type: DataTypes.BOOLEAN,
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
    },
    companyId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'company_id'
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'is_private'
    },
    jobIndustryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobindustry',
          schema: 'hris'
        },
        key: 'job_industry_id'
      },
      field: 'job_industry_id'
    },
    jobFunctionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobfunction',
          schema: 'hris'
        },
        key: 'job_function_id'
      },
      field: 'job_function_id'
    },
    jobTypeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobtype',
          schema: 'hris'
        },
        key: 'job_type_id'
      },
      field: 'job_type_id'
    },
    minExp: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'min_exp'
    },
    jobLocationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'joblocation',
          schema: 'hris'
        },
        key: 'job_location_id'
      },
      field: 'job_location_id'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    jobNameId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobname',
          schema: 'hris'
        },
        key: 'job_name_id'
      },
      field: 'job_name_id'
    },
    closeDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'close_date'
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'is_deleted'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at'
    }
  }, {
    sequelize,
    tableName: 'jobs',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "job_pkey",
        unique: true,
        fields: [
          { name: "job_id" },
        ]
      },
      {
        name: "job_uuid_key",
        unique: true,
        fields: [
          { name: "job_uuid" },
        ]
      },
    ]
  });
};
