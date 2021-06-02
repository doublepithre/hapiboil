const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Recommendationmetric', {
    metricId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'metric_id'
    },
    metricNameId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'metric_name_id'
    },
    metricName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'metric_name'
    },
    metricHeader: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'metric_header'
    },
    empMeScore: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'emp_me_score'
    },
    empUsScore: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'emp_us_score'
    },
    nett: {
      type: DataTypes.STRING,
      allowNull: true
    },
    recommendationText: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'recommendation_text'
    }
  }, {
    sequelize,
    tableName: 'recommendationmetric',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "recommendationmetric_pkey",
        unique: true,
        fields: [
          { name: "metric_id" },
        ]
      },
    ]
  });
};
