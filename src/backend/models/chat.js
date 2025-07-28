const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { Event } = require('./event');
const { User } = require('./user');
const { Organizer } = require('./organizer');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  eventId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Events',
      key: 'id'
    }
  },
  gonderenId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  gonderenTipi: {
    type: DataTypes.ENUM('user', 'organizer'),
    allowNull: false
  },
  mesaj: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  durum: {
    type: DataTypes.ENUM('aktif', 'silindi'),
    defaultValue: 'aktif'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['eventId']
    },
    {
      fields: ['gonderenId', 'gonderenTipi']
    }
  ]
});

ChatMessage.belongsTo(Event);
Event.hasMany(ChatMessage);

ChatMessage.addHook('beforeFind', (options) => {
  if (!options.where) options.where = {};
  options.where.durum = 'aktif';
});

module.exports = { ChatMessage }; 