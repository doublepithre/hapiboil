const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Questionmapping', {
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
};
