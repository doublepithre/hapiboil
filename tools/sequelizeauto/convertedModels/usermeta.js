const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Usermeta = sequelize.define('Usermeta', {
    umetaId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'umeta_id'
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      unique: "usermeta_user_id_meta_key_key",
      field: 'user_id'
    },
    metaKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "usermeta_user_id_meta_key_key",
      field: 'meta_key'
    },
    metaValue: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'meta_value'
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
    tableName: 'usermeta',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "usermeta_pkey",
        unique: true,
        fields: [
          { name: "umeta_id" },
        ]
      },
      {
        name: "usermeta_user_id_meta_key_key",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "meta_key" },
        ]
      },
    ]
  });
  Usermeta.associate = function(model) {
    initRelations(model);
  }
  return Usermeta;
}
const initRelations = (model) =>{
  const Usermeta = model.Usermeta;
  const Userinfo = model.Userinfo;


  Usermeta.belongsTo(Userinfo, { as: "user", foreignKey: "userId"});

}
