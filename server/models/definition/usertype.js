/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Usertype', {
        userTypeId: {
            type: DataTypes.INTEGER,
            field: 'user_type_id',
            allowNull: false,
            primaryKey: true
        },
        userTypeName: {
            type: DataTypes.STRING,
            field: 'user_type_name',
            allowNull: false
        }
    }, {
        schema: 'hris',
        tableName: 'usertype',
        timestamps: false
    });
};

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.

    const model = require('../index');
    const Usertype = model.Usertype;
    const Userinfo = model.Userinfo;
    const Company = model.Company;
    const User = model.User;

    Usertype.hasMany(Userinfo, {
        as: 'UserinfoUserTypeIdFkeys',
        foreignKey: 'user_type_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Usertype.belongsToMany(Company, {
        as: 'UserinfoCompanies',
        through: Userinfo,
        foreignKey: 'user_type_id',
        otherKey: 'company_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Usertype.belongsToMany(Company, {
        as: 'UserinfoCompanyUus',
        through: Userinfo,
        foreignKey: 'user_type_id',
        otherKey: 'company_uuid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Usertype.belongsToMany(User, {
        as: 'UserinfoUsers',
        through: Userinfo,
        foreignKey: 'user_type_id',
        otherKey: 'user_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    Usertype.belongsToMany(User, {
        as: 'UserinfoUserUus',
        through: Userinfo,
        foreignKey: 'user_type_id',
        otherKey: 'user_uuid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
