const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Autismcategory = sequelize.define('Autismcategory', {
    autismCatId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'autism_cat_id'
    },
    categoryName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'category_name'
    }
  }, {
    sequelize,
    tableName: 'autismcategories',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "autism_categories_pkey",
        unique: true,
        fields: [
          { name: "autism_cat_id" },
        ]
      },
    ]
  });
  Autismcategory.associate = function(model) {
    initRelations(model);
  }
  return Autismcategory;
}
const initRelations = (model) =>{
  const Autismcategory = model.Autismcategory;



}
