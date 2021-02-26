const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Questionmapping = sequelize.define('Questionmapping', {
    empauwerAllQid: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'questionnaire',
          schema: 'hris'
        },
        key: 'question_id'
      },
      field: 'empauwer_all_qid'
    },
    empauwerMeQid: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'questionnaire',
          schema: 'hris'
        },
        key: 'question_id'
      },
      field: 'empauwer_me_qid'
    },
    mappingValue: {
      type: DataTypes.REAL,
      allowNull: true,
      defaultValue: 1.0,
      field: 'mapping_value'
    }
  }, {
    sequelize,
    tableName: 'questionmapping',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "questionmapping_pkey",
        unique: true,
        fields: [
          { name: "empauwer_all_qid" },
          { name: "empauwer_me_qid" },
        ]
      },
    ]
  });
  Questionmapping.associate = function(model) {
    initRelations(model);
  }
  return Questionmapping;
}
const initRelations = (model) =>{
  const Questionmapping = model.Questionmapping;
  const Questionnaire = model.Questionnaire;


  Questionmapping.belongsTo(Questionnaire, { as: "empauwerAllQ", foreignKey: "empauwerAllQid"});
  Questionmapping.belongsTo(Questionnaire, { as: "empauwerMeQ", foreignKey: "empauwerMeQid"});

}
