const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Jobsrecommendationlog', {
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
    timestamp: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'jobsrecommendationlog',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobsrecommendationlog_pkey",
        unique: true,
        fields: [
          { name: "job_id" },
        ]
      },
    ]
  });
};
