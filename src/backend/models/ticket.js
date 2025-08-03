const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { Event } = require('./event');
const { User } = require('./user');

const Ticket = sequelize.define('Ticket', {
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  bilet_tipi: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fiyat: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  qr_kod: {
    type: DataTypes.TEXT,
    unique: true
  },
  durum: {
    type: DataTypes.ENUM('aktif', 'kullanildi', 'iptal'),
    defaultValue: 'aktif'
  },
  giris_zamani: {
    type: DataTypes.DATE
  },
  gise: {
    type: DataTypes.STRING
  },
  cihaz_id: {
    type: DataTypes.STRING
  },
  referans_kodu: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'Tickets', // Explicitly set the table name
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['qr_kod']
    },
    {
      fields: ['eventId']
    },
    {
      fields: ['userId']
    }
  ]
});

// Update foreign key names to match the database
Ticket.belongsTo(Event, {
  foreignKey: 'eventId'
});
Event.hasMany(Ticket, {
  foreignKey: 'eventId'
});

Ticket.belongsTo(User, {
  foreignKey: 'userId'
});
User.hasMany(Ticket, {
  foreignKey: 'userId'
});

module.exports = { Ticket }; 