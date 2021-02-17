const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Questiontype = sequelize.define('Questiontype', {
    questionTypeId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'question_type_id'
    },
    questionTypeName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "question_type_question_type_name_key",
      field: 'question_type_name'
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'display_name'
    }
  }, {
    sequelize,
    tableName: 'questiontype',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "question_type_pkey",
        unique: true,
        fields: [
          { name: "question_type_id" },
        ]
      },
      {
        name: "question_type_question_type_name_key",
        unique: true,
        fields: [
          { name: "question_type_name" },
        ]
      },
    ]
  });
  Questiontype.associate = function(model) {
    initRelations(model);
  }
  return Questiontype;
}
const initRelations = (model) =>{
  const Questiontype = model.Questiontype;
  const Questionnaire = model.Questionnaire;


  Questiontype.hasMany(Questionnaire, { as: "questionnaires", foreignKey: "questionTypeId"});

}
