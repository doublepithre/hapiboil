const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Jobfunction = sequelize.define('Jobfunction', {
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
  Jobfunction.associate = function(model) {
    initRelations(model);
  }
  return Jobfunction;
}
const initRelations = (model) =>{
  const Jobfunction = model.Jobfunction;
  const Job = model.Job;


  Jobfunction.hasMany(Job, { as: "jobs", foreignKey: "jobFunctionId"});

}
