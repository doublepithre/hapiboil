const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Joblocation', {
    jobLocationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'job_location_id'
    },
    jobLocationName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'job_location_name'
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
    }
  }, {
    sequelize,
    tableName: 'joblocation',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "joblocation_pkey",
        unique: true,
        fields: [
          { name: "job_location_id" },
        ]
      },
    ]
  });
};
