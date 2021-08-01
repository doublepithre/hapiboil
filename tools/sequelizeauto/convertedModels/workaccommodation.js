const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Workaccommodation = sequelize.define('Workaccommodation', {
    workaccommodationId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'workaccommodation_id'
    },
    workaccommodationTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'workaccommodation_title'
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
    workaccommodationDescription: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'workaccommodation_description'
    }
  }, {
    sequelize,
    tableName: 'workaccommodations',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "workaccommodations_pkey",
        unique: true,
        fields: [
          { name: "workaccommodation_id" },
        ]
      },
    ]
  });
  Workaccommodation.associate = function(model) {
    initRelations(model);
  }
  return Workaccommodation;
}
const initRelations = (model) =>{
  const Workaccommodation = model.Workaccommodation;



}
