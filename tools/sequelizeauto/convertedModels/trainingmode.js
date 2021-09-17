const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Trainingmode = sequelize.define('Trainingmode', {
    modeId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'mode_id'
    },
    modeName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'mode_name'
    }
  }, {
    sequelize,
    tableName: 'trainingmode',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "trainingmode_pkey",
        unique: true,
        fields: [
          { name: "mode_id" },
        ]
      },
    ]
  });
  Trainingmode.associate = function(model) {
    initRelations(model);
  }
  return Trainingmode;
}
const initRelations = (model) =>{
  const Trainingmode = model.Trainingmode;
  const Trainingcourse = model.Trainingcourse;


  Trainingmode.hasMany(Trainingcourse, { as: "trainingcourses", foreignKey: "modeId"});

}
