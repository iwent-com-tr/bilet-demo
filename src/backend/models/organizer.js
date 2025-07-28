const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const Organizer = sequelize.define('Organizer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  isim: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  soyisim: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 50]
    }
  },
  sirket: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  telefon: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: /^\+?[1-9]\d{1,14}$/
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  sifre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vergi_no: {
    type: DataTypes.STRING,
    validate: {
      len: [10, 11]
    }
  },
  vergi_dairesi: {
    type: DataTypes.STRING
  },
  adres: {
    type: DataTypes.TEXT
  },
  banka_hesap: {
    type: DataTypes.STRING
  },
  son_giris: {
    type: DataTypes.DATE
  },
  onaylandi: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (organizer) => {
      if (organizer.sifre) {
        const salt = await bcrypt.genSalt(10);
        organizer.sifre = await bcrypt.hash(organizer.sifre, salt);
      }
    },
    beforeUpdate: async (organizer) => {
      if (organizer.changed('sifre')) {
        const salt = await bcrypt.genSalt(10);
        organizer.sifre = await bcrypt.hash(organizer.sifre, salt);
      }
    }
  }
});

Organizer.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.sifre);
};

module.exports = { Organizer }; 