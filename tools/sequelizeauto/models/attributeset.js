const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Attributeset', {
    attributeId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'attribute_id'
    },
    attributeName: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: "attribute_name_unique",
      field: 'attribute_name'
    }
  }, {
    sequelize,
    tableName: 'attributeset',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "attribute_id_pkey",
        unique: true,
        fields: [
          { name: "attribute_id" },
        ]
      },
      {
        name: "attribute_name_unique",
        unique: true,
        fields: [
          { name: "attribute_name" },
        ]
      },
    ]
  });
};
