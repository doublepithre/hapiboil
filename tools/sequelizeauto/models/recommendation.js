const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Recommendation', {
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
    score: {
      type: DataTypes.REAL,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'recommendation',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "idx_score",
        fields: [
          { name: "score" },
        ]
      },
      {
        name: "recommendation_pkey",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "job_id" },
        ]
      },
    ]
  });
};
