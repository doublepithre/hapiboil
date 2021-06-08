const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Reportfilter = sequelize.define('Reportfilter', {
    filterKey: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      field: 'filter_key'
    },
    attributeId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'attributeset',
          schema: 'hris'
        },
        key: 'attribute_id'
      },
      field: 'attribute_id'
    }
  }, {
    sequelize,
    tableName: 'reportfilters',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "reportfilters_pkey",
        unique: true,
        fields: [
          { name: "filter_key" },
          { name: "attribute_id" },
        ]
      },
    ]
  });
  Reportfilter.associate = function(model) {
    initRelations(model);
  }
  return Reportfilter;
}
const initRelations = (model) =>{
  const Reportfilter = model.Reportfilter;
  const Attributeset = model.Attributeset;


  Reportfilter.belongsTo(Attributeset, { as: "attribute", foreignKey: "attributeId"});

}
