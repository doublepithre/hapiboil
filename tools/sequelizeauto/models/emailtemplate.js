const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Emailtemplate', {
    id: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    templateName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "emailtemplates_template_name_status_owner_id_key",
      field: 'template_name'
    },
    html: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: "emailtemplates_template_name_status_owner_id_key"
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
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ownerId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      unique: "emailtemplates_template_name_status_owner_id_key",
      field: 'owner_id'
    },
    desc: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    displayName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'display_name'
    },
    emailBody: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'email_body'
    },
    emailFooter: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'email_footer'
    },
    emailVars: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'email_vars'
    },
    isUserTemplate: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_user_template'
    },
    companyId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      unique: "emailtemplates_template_name_status_company_id_key",
      field: 'company_id'
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'product_name'
    },
    isDefaultTemplate: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_default_template'
    },
    isCompanyLevel: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_company_level'
    }
  }, {
    sequelize,
    tableName: 'emailtemplates',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "emailtemplates_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "emailtemplates_template_name_status_company_id_key",
        unique: true,
        fields: [
          { name: "template_name" },
          { name: "status" },
          { name: "company_id" },
        ]
      },
      {
        name: "emailtemplates_template_name_status_owner_id_key",
        unique: true,
        fields: [
          { name: "template_name" },
          { name: "status" },
          { name: "owner_id" },
        ]
      },
    ]
  });
};
