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
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lowText: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'low_text'
    },
    highText: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'high_text'
    },
    displayLowEnd: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'display_low_end'
    },
    displayHighEnd: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'display_high_end'
    },
    lowTextCompat: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'low_text_compat'
    },
    highTextCompat: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'high_text_compat'
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
