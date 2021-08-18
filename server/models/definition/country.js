const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Country = sequelize.define('Country', {
    countryId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'country_id'
    },
    countryShort: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: "country_country_short_key",
      field: 'country_short'
    },
    countryFull: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "country_country_full_key",
      field: 'country_full'
    },
    countryCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'country_code'
    }
  }, {
    sequelize,
    tableName: 'country',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "country_country_full_key",
        unique: true,
        fields: [
          { name: "country_full" },
        ]
      },
      {
        name: "country_country_short_key",
        unique: true,
        fields: [
          { name: "country_short" },
        ]
      },
      {
        name: "country_pkey",
        unique: true,
        fields: [
          { name: "country_id" },
        ]
      },
    ]
  });
  Country.associate = function(model) {
    initRelations(model);
  }
  return Country;
}
const initRelations = (model) =>{
  const Country = model.Country;
  const Company = model.Company;
  const Resource = model.Resource;


  Country.hasMany(Company, { as: "companies", foreignKey: "countryId"});
  Country.hasMany(Resource, { as: "resources", foreignKey: "countryId"});

}
