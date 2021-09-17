const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Usertype = sequelize.define('Usertype', {
    userTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'user_type_id'
    },
    userTypeName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'user_type_name'
    }
  }, {
    sequelize,
    tableName: 'usertype',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "usertype_pkey",
        unique: true,
        fields: [
          { name: "user_type_id" },
        ]
      },
    ]
  });
  Usertype.associate = function(model) {
    initRelations(model);
  }
  return Usertype;
}
const initRelations = (model) =>{
  const Usertype = model.Usertype;
  const Trainingcourse = model.Trainingcourse;
  const Trainingcourseaudience = model.Trainingcourseaudience;
  const Userinfo = model.Userinfo;


  Usertype.belongsToMany(Trainingcourse, { through: Trainingcourseaudience, foreignKey: "audience", otherKey: "courseId" });
  Usertype.hasMany(Trainingcourseaudience, { as: "trainingcourseaudiences", foreignKey: "audience"});
  Usertype.hasMany(Userinfo, { as: "userinfos", foreignKey: "userTypeId"});

}
