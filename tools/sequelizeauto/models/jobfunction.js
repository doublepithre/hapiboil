const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Jobfunction', {
    jobFunctionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'job_function_id'
    },
    jobFunctionName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'job_function_name'
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
