/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Companyinfo', {
        companyId: {
            type: DataTypes.BIGINT,
            field: 'company_id',
            allowNull: false,
        },
        logo: {
            type: DataTypes.STRING,
            field: 'logo',
            allowNull: true,
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
        },
        emailBg: {
            type: DataTypes.STRING,
            field: 'email_bg',
            allowNull: true,
        },
        banner: {
            type: DataTypes.STRING,
            field: 'banner',
            allowNull: true,
        },
        config: {
            type: DataTypes.JSON,
            field: 'config',
            allowNull: true,
        },
    }, {
        schema: 'hris',
        tableName: 'companyinfo',
        timestamps: false
    });
}

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.
}