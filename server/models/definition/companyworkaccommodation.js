const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Companyworkaccommodation = sequelize.define('Companyworkaccommodation', {
    companyWorkaccommodationId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'company_workaccommodation_id'
    },
    workaccommodationId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'workaccommodations',
          schema: 'hris'
        },
        key: 'workaccommodation_id'
      },
      field: 'workaccommodation_id'
    },
    companyId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'company',
          schema: 'hris'
        },
        key: 'company_id'
      },
      field: 'company_id'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
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
    tableName: 'companyworkaccommodations',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "companyworkaccommodations_pkey",
        unique: true,
        fields: [
          { name: "company_workaccommodation_id" },
        ]
      },
    ]
  });
  Companyworkaccommodation.associate = function(model) {
    initRelations(model);
  }
  return Companyworkaccommodation;
}
const initRelations = (model) =>{
  const Companyworkaccommodation = model.Companyworkaccommodation;
  const Company = model.Company;
  const Workaccommodation = model.Workaccommodation;


  Companyworkaccommodation.belongsTo(Company, { as: "company", foreignKey: "companyId"});
  Companyworkaccommodation.belongsTo(Workaccommodation, { as: "workaccommodation", foreignKey: "workaccommodationId"});

}
