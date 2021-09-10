const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const AutismCategory = sequelize.define('AutismCategory', {
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
    tableName: 'autism_categories',
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
  AutismCategory.associate = function(model) {
    initRelations(model);
  }
  return AutismCategory;
}
const initRelations = (model) =>{
  const AutismCategory = model.AutismCategory;



}
