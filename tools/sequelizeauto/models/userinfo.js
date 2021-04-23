const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Userinfo', {
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      references: {
        model: {
          tableName: 'user',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'user_id'
    },
    userUuid: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: {
          tableName: 'user',
          schema: 'hris'
        },
        key: 'user_uuid'
      },
      field: 'user_uuid'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "userinfo_email_key"
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'userrole',
          schema: 'hris'
        },
        key: 'role_id'
      },
      field: 'role_id'
    },
    userTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'usertype',
          schema: 'hris'
        },
        key: 'user_type_id'
      },
      field: 'user_type_id'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    companyId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'company',
          schema: 'hris'
        },
        key: 'company_id'
      },
      field: 'company_id'
    },
    companyUuid: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: DataTypes.UUIDV4,
      references: {
        model: {
          tableName: 'company',
          schema: 'hris'
        },
        key: 'company_uuid'
      },
      field: 'company_uuid'
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'first_name'
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'last_name'
    },
    picture: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_admin'
    },
    tzid: {
      type: DataTypes.STRING,
      allowNull: true
    },
    primaryMobile: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'primary_mobile'
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
    privacyClause: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: 'privacy_clause'
    },
    tandc: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    inTalentPool: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'userinfo',
    schema: 'hris',
    hasTrigger: true,
    timestamps: false,
    indexes: [
      {
        name: "userinfo_email_key",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "userinfo_pkey",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
};
