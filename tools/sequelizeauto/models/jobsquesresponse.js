const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Jobsquesresponse', {
    responseId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'response_id'
    },
    questionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'questionnaire',
          schema: 'hris'
        },
        key: 'question_id'
      },
      field: 'question_id'
    },
    responseVal: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'response_val'
    },
    jobId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'job_id'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updated_at'
    }
  }, {
    sequelize,
    tableName: 'jobsquesresponses',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobsquesresponses_pkey",
        unique: true,
        fields: [
          { name: "question_id" },
          { name: "job_id" },
        ]
      },
    ]
  });
};
