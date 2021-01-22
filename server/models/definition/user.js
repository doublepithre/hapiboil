/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        userId: {
            type: DataTypes.BIGINT,
            field: 'user_id',
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        userUuid: {
            type: DataTypes.UUID,
            field: 'user_uuid',
            defaultValue: sequelize.UUIDV4,
            allowNull: true
        },
        email: {
            type: DataTypes.STRING(255),
            field: 'email',
            allowNull: false
        },
        password: {
            type: DataTypes.STRING,
            field: 'password',
            allowNull: true
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
        tableName: 'user',
        timestamps: false
    });
    User.associate = function(model) {
        initRelations(model)
    }
    return User;
};

const initRelations = (model) => {
    const User = model.User;
    const Job = model.Job;
    const Userinfo = model.Userinfo;
    const Company = model.Company;
    const Usertype = model.Usertype;

    User.hasMany(Job, {
        as: 'CreatorIdFkeys',
        foreignKey: 'creator_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    User.hasMany(Userinfo, {
        as: 'InfoUserIdFkeys',
        foreignKey: 'user_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    User.hasMany(Userinfo, {
        as: 'InfoUserUuidFkeys',
        foreignKey: 'user_uuid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    User.belongsToMany(Company, {
        as: 'UserinfoCompanies',
        through: Userinfo,
        foreignKey: 'user_id',
        otherKey: 'company_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    User.belongsToMany(Company, {
        as: 'UserinfoCompanyUus',
        through: Userinfo,
        foreignKey: 'user_id',
        otherKey: 'company_uuid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    User.belongsToMany(Usertype, {
        as: 'UserinfoUserTypes',
        through: Userinfo,
        foreignKey: 'user_id',
        otherKey: 'user_type_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    User.belongsToMany(User, {
        as: 'UserinfoUserUus',
        through: Userinfo,
        foreignKey: 'user_id',
        otherKey: 'user_uuid',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

    User.belongsToMany(User, {
        as: 'UserinfoUsers',
        through: Userinfo,
        foreignKey: 'user_uuid',
        otherKey: 'user_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
