const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Joblocation = sequelize.define('Joblocation', {
    jobLocationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'job_location_id'
    },
    jobLocationName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'job_location_name'
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
    tableName: 'joblocation',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "joblocation_pkey",
        unique: true,
        fields: [
          { name: "job_location_id" },
        ]
      },
    ]
  });
  Joblocation.associate = function(model) {
    initRelations(model);
  }
  return Joblocation;
}
const initRelations = (model) =>{
  const Joblocation = model.Joblocation;
  const Job = model.Job;
  const Userdemographic = model.Userdemographic;


  Joblocation.hasMany(Job, { as: "jobs", foreignKey: "jobLocationId"});
  Joblocation.hasMany(Userdemographic, { as: "userdemographics", foreignKey: "personLocation"});
  Joblocation.hasMany(Userdemographic, { as: "preferredJobLocationUserdemographics", foreignKey: "preferredJobLocation"});

}
