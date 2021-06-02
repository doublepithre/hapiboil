const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  const Mentorcandidatemapping = sequelize.define('Mentorcandidatemapping', {
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
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
      field: 'mentor_id'
    },
    candidateId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'userinfo',
          schema: 'hris'
        },
        key: 'user_id'
      },
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
  Mentorcandidatemapping.associate = function(model) {
    initRelations(model);
  }
  return Mentorcandidatemapping;
}
const initRelations = (model) =>{
  const Mentorcandidatemapping = model.Mentorcandidatemapping;
  const Userinfo = model.Userinfo;


  Mentorcandidatemapping.belongsTo(Userinfo, { as: "candidate", foreignKey: "candidateId"});
  Mentorcandidatemapping.belongsTo(Userinfo, { as: "mentor", foreignKey: "mentorId"});

}
