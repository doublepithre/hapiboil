const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Qaattribute = sequelize.define('Qaattribute', {
    qaaId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'qaa_id'
    },
    answerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'questionnaireanswers',
          schema: 'hris'
        },
        key: 'answer_id'
      },
      field: 'answer_id'
    },
    attributeId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'attributeset',
          schema: 'hris'
        },
        key: 'attribute_id'
      },
      field: 'attribute_id'
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
    },
    attributeValue: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'attribute_value'
    }
  }, {
    sequelize,
    tableName: 'qaattribute',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "qac_pkey",
        unique: true,
        fields: [
          { name: "qaa_id" },
        ]
      },
    ]
  });
  Qaattribute.associate = function(model) {
    initRelations(model);
  }
  return Qaattribute;
}
const initRelations = (model) =>{
  const Qaattribute = model.Qaattribute;
  const Attributeset = model.Attributeset;
  const Questionnaireanswer = model.Questionnaireanswer;


  Qaattribute.belongsTo(Attributeset, { as: "attribute", foreignKey: "attributeId"});
  Qaattribute.belongsTo(Questionnaireanswer, { as: "answer", foreignKey: "answerId"});

}
