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
};
