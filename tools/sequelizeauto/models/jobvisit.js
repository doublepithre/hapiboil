const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Jobvisit', {
    jobVisitId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'job_visit_id'
    },
    visitorId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'visitor_id'
    },
    jobId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'jobs',
          schema: 'hris'
        },
        key: 'job_id'
      },
      field: 'job_id'
    },
    visitedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'visited_at'
    }
  }, {
    sequelize,
    tableName: 'jobvisit',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobvisit_pkey",
        unique: true,
        fields: [
          { name: "job_visit_id" },
        ]
      },
    ]
  });
};
