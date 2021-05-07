const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Mentorcandidatemapping', {
    mentorcandidatemappingId: {
      autoIncrement: true,
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true,
      field: 'mentorcandidatemapping_id'
    },
    mentorId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'mentor_id'
    },
    candidateId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'candidate_id'
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
    }
  }, {
    sequelize,
    tableName: 'mentorcandidatemapping',
    schema: 'hris',
    timestamps: false,
    indexes: [
      {
        name: "mentorcandidatemapping_pkey",
        unique: true,
        fields: [
          { name: "mentorcandidatemapping_id" },
        ]
      },
    ]
  });
};
