const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Jobskill = sequelize.define('Jobskill', {
    jobskillId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'jobskill_id'
    },
    jobskillName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'jobskill_name'
    },
    jobskillNameLower: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: "jobskills_jobskill_name_lower_key",
      field: 'jobskill_name_lower'
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
    tableName: 'jobskills',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "jobskills_jobskill_name_lower_key",
        unique: true,
        fields: [
          { name: "jobskill_name_lower" },
        ]
      },
      {
        name: "jobskills_pkey",
        unique: true,
        fields: [
          { name: "jobskill_id" },
        ]
      },
    ]
  });
  Jobskill.associate = function(model) {
    initRelations(model);
  }
  return Jobskill;
}
const initRelations = (model) =>{
  const Jobskill = model.Jobskill;



}
