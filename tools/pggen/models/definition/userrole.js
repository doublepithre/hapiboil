/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    const Userrole = sequelize.define('Userrole', {
        roleId: {
            type: DataTypes.INTEGER,
            field: 'role_id',
            allowNull: false,
            primaryKey: true
        },
        roleName: {
            type: DataTypes.STRING,
            field: 'role_name',
            allowNull: false
        },
        displayName: {
            type: DataTypes.STRING,
            field: 'display_name',
            allowNull: true
        },
        roleAccess: {
            type: DataTypes.JSON,
            field: 'role_access',
            allowNull: true
        }
    }, {
        schema: 'hris',
        tableName: 'userrole',
        timestamps: false
    });
    Userrole.associate = function(model) {
        initRelations(model)
    }
    return Userrole;
};

const initRelations = (model) => {};
