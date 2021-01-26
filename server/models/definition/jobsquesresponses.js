/* eslint new-cap: "off", global-require: "off" */

module.exports = (sequelize, DataTypes) => {
    const Jobsquesresponse = sequelize.define('Jobsquesresponse', {
        responseId: {
            type: DataTypes.BIGINT,
            field: 'response_id',
            allowNull: false,
            autoIncrement: true
        },
        questionId: {
            type: DataTypes.BIGINT,
            field: 'question_id',
            allowNull: false,
            primaryKey: true
        },
        responseVal: {
            type: DataTypes.JSONB,
            field: 'response_val',
            allowNull: false
        },
        jobId: {
            type: DataTypes.BIGINT,
            field: 'job_id',
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'jobs',
                key: 'job_id'
            },
            onUpdate: 'NO ACTION',
            onDelete: 'NO ACTION'
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
        tableName: 'jobsquesresponses',
        timestamps: false
    });
    Jobsquesresponse.associate = function(model) {
        initRelations(model)
    }
    return Jobsquesresponse;
};

const initRelations = (model) => {
    const Jobsquesresponse = model.Jobsquesresponse;
    const Job = model.Job;

    Jobsquesresponse.belongsTo(Job, {
        as: 'Job',
        foreignKey: 'job_id',
        onDelete: 'NO ACTION',
        onUpdate: 'NO ACTION'
    });

};
