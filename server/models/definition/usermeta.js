/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
  const Usermeta = sequelize.define('Usermeta', {
      umetaId: {
        type: DataTypes.BIGINT,
        field: 'umeta_id',
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.BIGINT,
        field: 'user_id',
        allowNull: false        
      },
      metaKey: {
        type: DataTypes.STRING,
        field: 'meta_key',
        allowNull: false
      },
      metaValue: {
        type: DataTypes.STRING,
        field: 'meta_value',
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at',
        allowNull: true
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at',
        allowNull: true
      }
    }, {
      schema: 'hris',
      tableName: 'usermeta',
      timestamps: false
  });
  Usermeta.associate = function(model) {
      initRelations(model)
  }
  return Usermeta;
};

const initRelations = (model) => {};
