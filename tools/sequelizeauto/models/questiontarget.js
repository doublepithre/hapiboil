const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Questiontarget', {
    targetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'target_id'
    },
    targetName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'target_name'
    }
  }, {
    sequelize,
    tableName: 'questiontarget',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "targetaudience_pkey",
        unique: true,
        fields: [
          { name: "target_id" },
        ]
      },
      {
        name: "targetaudience_target_name",
        unique: true,
        fields: [
          { name: "target_name" },
        ]
      },
    ]
  });
};
