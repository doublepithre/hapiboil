/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Emailtemplates', {
        id: {
            type: DataTypes.BIGINT,
            field: 'id',
            allowNull: false,
            primaryKey: true,
        },
        templateName: {
            type: DataTypes.STRING,
            field: 'template_name',
            allowNull: false,
        },
        html: {
            type: DataTypes.TEXT,
            field: 'html',
            allowNull: false,
        },
        text: {
            type: DataTypes.TEXT,
            field: 'text',
            allowNull: false,
        },
        status: {
            type: DataTypes.STRING,
            field: 'status',
            allowNull: false,
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
        subject: {
            type: DataTypes.STRING,
            field: 'subject',
            allowNull: false,
        },
        ownerId: {
            type: DataTypes.BIGINT,
            field: 'owner_id',
            allowNull: true,
        },
        desc: {
            type: DataTypes.TEXT,
            field: 'desc',
            allowNull: true,
        },
        displayName: {
            type: DataTypes.STRING,
            field: 'display_name',
            allowNull: true,
        },
        emailBody: {
            type: DataTypes.TEXT,
            field: 'email_body',
            allowNull: true,
        },
        emailFooter: {
            type: DataTypes.TEXT,
            field: 'email_footer',
            allowNull: true,
        },
        emailVars: {
            type: DataTypes.JSON,
            field: 'email_vars',
            allowNull: true,
        },
        isUserTemplate: {
            type: DataTypes.BOOLEAN,
            field: 'is_user_template',
            allowNull: true,
        },
        companyId: {
            type: DataTypes.BIGINT,
            field: 'company_id',
            allowNull: true,
        },
        productName: {
            type: DataTypes.STRING,
            field: 'product_name',
            allowNull: true,
        },
    }, {
        schema: 'hris',
        tableName: 'emailtemplates',
        timestamps: false
    });
}

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.
}