const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Gendercategory = sequelize.define('Gendercategory', {
    genderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'gender_id'
    },
    categoryName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'category_name'
    }
  }, {
    sequelize,
    tableName: 'gendercategories',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "gender_categories_pkey",
        unique: true,
        fields: [
          { name: "gender_id" },
        ]
      },
    ]
  });
  Gendercategory.associate = function(model) {
    initRelations(model);
  }
  return Gendercategory;
}
const initRelations = (model) =>{
  const Gendercategory = model.Gendercategory;



}
