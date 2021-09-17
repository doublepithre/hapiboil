const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Education', {
    educationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'education_id'
    },
    educationName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'education_name'
    }
  }, {
    sequelize,
    tableName: 'education',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "education_pkey",
        unique: true,
        fields: [
          { name: "education_id" },
        ]
      },
    ]
  });
};
