const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { Organizer } = require('./organizer');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ad: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  kategori: {
    type: DataTypes.STRING,
    allowNull: false
  },
  baslangic_tarih: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfter: new Date().toISOString()
    }
  },
  bitis_tarih: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isAfter: new Date().toISOString()
    }
  },
  yer: {
    type: DataTypes.STRING,
    allowNull: false
  },
  adres: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  il: {
    type: DataTypes.STRING,
    allowNull: false
  },
  banner: {
    type: DataTypes.STRING,
    validate: {
      isUrl: true
    }
  },
  sosyal_medya: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  aciklama: {
    type: DataTypes.TEXT
  },
  kapasite: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1
    }
  },
  bilet_tipleri: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  durum: {
    type: DataTypes.ENUM('taslak', 'yayinda', 'iptal', 'tamamlandi'),
    defaultValue: 'taslak'
  },
  organizerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Organizers',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  validate: {
    tarihKontrolu() {
      if (this.bitis_tarih <= this.baslangic_tarih) {
        throw new Error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır');
      }
    }
  }
});

Event.belongsTo(Organizer);
Organizer.hasMany(Event);

module.exports = { Event }; 