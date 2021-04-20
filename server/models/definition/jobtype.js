const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Jobtype = sequelize.define('Jobtype', {
    jobTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'job_type_id'
    },
    jobTypeName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'job_type_name'
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
    tableName: 'jobtype',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobtype_pkey",
        unique: true,
        fields: [
          { name: "job_type_id" },
        ]
      },
    ]
  });
  Jobtype.associate = function(model) {
    initRelations(model);
  }
  return Jobtype;
}
const initRelations = (model) =>{
  const Jobtype = model.Jobtype;
  const Job = model.Job;


  Jobtype.hasMany(Job, { as: "jobs", foreignKey: "jobTypeId"});

}
