const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Companyvisit', {
    companyVisitId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'company_visit_id'
    },
    visitorId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'visitor_id'
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
    visitedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('now'),
      field: 'visited_at'
    }
  }, {
    sequelize,
    tableName: 'companyvisit',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "companyvisit_pkey",
        unique: true,
        fields: [
          { name: "company_visit_id" },
        ]
      },
    ]
  });
};
