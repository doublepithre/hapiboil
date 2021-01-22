/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    return sequelize.define('Emaillogs', {
        id: {
            type: DataTypes.BIGINT,
            field: 'id',
            allowNull: false,
            primaryKey: true,
        },
        appId: {
            type: DataTypes.BIGINT,
            field: 'app_id',
            allowNull: false,
        },
        templateName: {
            type: DataTypes.STRING,
            field: 'template_name',
            allowNull: false,
        },
        ownerId: {
            type: DataTypes.BIGINT,
            field: 'owner_id',
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
        status: {
            type: DataTypes.STRING,
            field: 'status',
            allowNull: true,
        },
        message: {
            type: DataTypes.STRING,
            field: 'message',
            allowNull: true,
        },
        toAddresses: {
            type: DataTypes.STRING,
            field: 'to_addresses',
            allowNull: true,
        },
        ccAddresses: {
            type: DataTypes.STRING,
            field: 'cc_addresses',
            allowNull: true,
        },
        bccAddresses: {
            type: DataTypes.STRING,
            field: 'bcc_addresses',
            allowNull: true,
        },
        profileId: {
            type: DataTypes.BIGINT,
            field: 'profile_id',
            allowNull: true,
        },
        meta: {
            type: DataTypes.JSON,
            field: 'meta',
            allowNull: true,
        },
        emailDeliveryInfo: {
            type: DataTypes.JSON,
            field: 'email_delivery_info',
            allowNull: true,
        },
        isOpen: {
            type: DataTypes.BOOLEAN,
            field: 'is_open',
            allowNull: true,
        },
        openDate: {
            type: DataTypes.DATE,
            field: 'open_date',
            allowNull: true,
        },
        displayName: {
            type: DataTypes.STRING,
            field: 'display_name',
            allowNull: true,
        },
    }, {
        schema: 'hris',
        tableName: 'emaillogs',
        timestamps: false
    });
}

module.exports.initRelations = () => {
    delete module.exports.initRelations; // Destroy itself to prevent repeated calls.
}