const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Userrole = sequelize.define('Userrole', {
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'role_id'
    },
    roleName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "userrole_role_name_key",
      field: 'role_name'
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'display_name'
    },
    roleAccess: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'role_access'
    }
  }, {
    sequelize,
    tableName: 'userrole',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "userrole_pkey",
        unique: true,
        fields: [
          { name: "role_id" },
        ]
      },
      {
        name: "userrole_role_name_key",
        unique: true,
        fields: [
          { name: "role_name" },
        ]
      },
    ]
  });
  Userrole.associate = function(model) {
    initRelations(model);
  }
  return Userrole;
}
const initRelations = (model) =>{
  const Userrole = model.Userrole;
  const Userinfo = model.Userinfo;


  Userrole.hasMany(Userinfo, { as: "userinfos", foreignKey: "roleId"});

}
