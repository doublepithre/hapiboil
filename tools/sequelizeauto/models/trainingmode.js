const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Trainingmode', {
    modeId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'mode_id'
    },
    modeName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'mode_name'
    }
  }, {
    sequelize,
    tableName: 'trainingmode',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "trainingmode_pkey",
        unique: true,
        fields: [
          { name: "mode_id" },
        ]
      },
    ]
  });
};
