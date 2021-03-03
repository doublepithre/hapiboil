const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Jobfunction', {
    jobFunctionId: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'job_function_id'
    },
    jobFunctionName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'job_function_name'
    }
  }, {
    sequelize,
    tableName: 'jobfunction',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobfunction_pkey",
        unique: true,
        fields: [
          { name: "job_function_id" },
        ]
      },
    ]
  });
};
