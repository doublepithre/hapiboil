const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Questiontarget = sequelize.define('Questiontarget', {
    targetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'target_id'
    },
    targetName: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: "questiontarget_target_name_key",
      field: 'target_name'
    }
  }, {
    sequelize,
    tableName: 'questiontarget',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "questiontarget_pkey",
        unique: true,
        fields: [
          { name: "target_id" },
        ]
      },
      {
        name: "questiontarget_target_name_key",
        unique: true,
        fields: [
          { name: "target_name" },
        ]
      },
    ]
  });
  Questiontarget.associate = function(model) {
    initRelations(model);
  }
  return Questiontarget;
}
const initRelations = (model) =>{
  const Questiontarget = model.Questiontarget;
  const Questionnaire = model.Questionnaire;


  Questiontarget.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "questionTargetId"});

}
