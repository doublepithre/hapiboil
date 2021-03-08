const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    userId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'user_id'
    },
    userUuid: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      unique: "user_user_uuid_key",
      field: 'user_uuid'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "user_email_key3"
    },
    password: {
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
    tableName: 'user',
    schema: 'hris',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      {
        name: "user_email_key",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "user_email_key1",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "user_email_key2",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "user_email_key3",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "user_pkey",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "user_user_uuid_key",
        unique: true,
        fields: [
          { name: "user_uuid" },
        ]
      },
    ]
  });
  User.associate = function(model) {
    initRelations(model);
  }
  return User;
}
const initRelations = (model) =>{
  const User = model.User;
  const Userinfo = model.Userinfo;


  User.hasOne(Userinfo, { as: "userinfo", foreignKey: "userId"});
  User.hasMany(Userinfo, { as: "userUuUserinfos", foreignKey: "userUuid"});

}
