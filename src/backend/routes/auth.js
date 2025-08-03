const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const { Organizer } = require('../models/organizer');

const router = express.Router();

// Token Doğrulama
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        durum: 0,
        message: 'Token bulunamadı'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.type === 'user') {
      user = await User.findByPk(decoded.id);
    } else if (decoded.type === 'organizer') {
      user = await Organizer.findByPk(decoded.id);
    }

    if (!user) {
      return res.status(401).json({
        durum: 0,
        message: 'Kullanıcı bulunamadı'
      });
    }

    if (decoded.type === 'organizer' && !user.onaylandi) {
      return res.status(403).json({
        durum: 0,
        message: 'Hesabınız henüz onaylanmamış'
      });
    }

    res.json({
      durum: 1,
      user: {
        id: user.id,
        isim: user.isim,
        soyisim: user.soyisim,
        email: user.email,
        tip: decoded.type
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        durum: 0,
        message: 'Geçersiz veya süresi dolmuş token'
      });
    }
    res.status(500).json({
      durum: 0,
      message: error.message
    });
  }
});

// Kullanıcı Kaydı
router.post('/register', async (req, res) => {
  try {
    const { isim, soyisim, email, sifre, dogum_yili, telefon, sehir } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        durum: 0,
        message: 'Bu e-posta adresi zaten kullanımda'
      });
    }

    const user = await User.create({
      isim,
      soyisim,
      email,
      sifre,
      dogum_yili,
      telefon,
      sehir
    });

    const token = jwt.sign(
      { id: user.id, type: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      durum: 1,
      message: 'Kayıt başarılı',
      user_id: user.id,
      token
    });
  } catch (error) {
    res.status(400).json({
      durum: 0,
      message: error.message
    });
  }
});

// Organizatör Kaydı
router.post('/register/organizer', async (req, res) => {
  try {
    const { isim, soyisim, sirket, telefon, email, sifre } = req.body;

    const existingOrganizer = await Organizer.findOne({ where: { email } });
    if (existingOrganizer) {
      return res.status(400).json({
        durum: 0,
        message: 'Bu e-posta adresi zaten kullanımda'
      });
    }

    const organizer = await Organizer.create({
      isim,
      soyisim,
      sirket,
      telefon,
      email,
      sifre
    });

    const token = jwt.sign(
      { id: organizer.id, type: 'organizer' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      durum: 1,
      message: 'Organizatör kaydı başarılı',
      organizer_id: organizer.id,
      token
    });
  } catch (error) {
    res.status(400).json({
      durum: 0,
      message: error.message
    });
  }
});

// Kullanıcı Girişi
router.post('/login', async (req, res) => {
  try {
    const { email, sifre, tip } = req.body;

    let user;
    if (tip === 'user') {
      user = await User.findOne({ where: { email } });
    } else if (tip === 'organizer') {
      user = await Organizer.findOne({ where: { email } });
    } else {
      return res.status(400).json({
        durum: 0,
        message: 'Geçersiz kullanıcı tipi'
      });
    }

    if (!user) {
      return res.status(401).json({
        durum: 0,
        message: 'E-posta veya şifre hatalı'
      });
    }

    const isValid = await user.validatePassword(sifre);
    if (!isValid) {
      return res.status(401).json({
        durum: 0,
        message: 'E-posta veya şifre hatalı'
      });
    }

    if (tip === 'organizer' && !user.onaylandi) {
      return res.status(403).json({
        durum: 0,
        message: 'Hesabınız henüz onaylanmamış'
      });
    }

    user.son_giris = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user.id, type: tip },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      durum: 1,
      message: 'Giriş başarılı',
      token,
      user: {
        id: user.id,
        isim: user.isim,
        soyisim: user.soyisim,
        email: user.email,
        tip
      }
    });
  } catch (error) {
    res.status(500).json({
      durum: 0,
      message: error.message
    });
  }
});

module.exports = router; 