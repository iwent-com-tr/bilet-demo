const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
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
  dogum_yili: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1900,
      max: new Date().getFullYear()
    }
  },
  telefon: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      is: /^\+?[1-9]\d{1,14}$/
    }
  },
  sehir: {
    type: DataTypes.STRING,
    allowNull: false
  },
  son_giris: {
    type: DataTypes.DATE
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.sifre) {
        const salt = await bcrypt.genSalt(10);
        user.sifre = await bcrypt.hash(user.sifre, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('sifre')) {
        const salt = await bcrypt.genSalt(10);
        user.sifre = await bcrypt.hash(user.sifre, salt);
      }
    }
  }
});

User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.sifre);
};

module.exports = { User }; 