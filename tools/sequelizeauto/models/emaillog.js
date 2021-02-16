const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Emaillog', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    appId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'app_id'
    },
    templateName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'template_name'
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'owner_id'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'updated_at'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    message: {
      type: DataTypes.STRING,
      allowNull: true
    },
    toAddresses: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'to_addresses'
    },
    ccAddresses: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'cc_addresses'
    },
    bccAddresses: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'bcc_addresses'
    },
    profileId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: 'profile_id'
    },
    meta: {
      type: DataTypes.JSON,
      allowNull: true
    },
    emailDeliveryInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'email_delivery_info'
    },
    isOpen: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_open'
    },
    openDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'open_date'
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'display_name'
    }
  }, {
    sequelize,
    tableName: 'emaillogs',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "applicationemail_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
