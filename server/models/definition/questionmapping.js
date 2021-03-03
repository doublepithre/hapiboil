const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Questionmapping = sequelize.define('Questionmapping', {
    qmId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'qm_id'
    },
    empauwerAllQid: {
      type: DataTypes.BIGINT,
      allowNull: true,
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
      allowNull: true,
      references: {
        model: {
          tableName: 'questionnaire',
          schema: 'hris'
        },
        key: 'question_id'
      },
      field: 'empauwer_me_qid'
    }
  }, {
    sequelize,
    tableName: 'questionmapping',
    schema: 'hris',
    timestamps: false
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
