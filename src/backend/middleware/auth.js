const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const { Organizer } = require('../models/organizer');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        durum: 0,
        message: 'Yetkilendirme başarısız'
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

    req.user = user;
    req.userType = decoded.type;
    next();
  } catch (error) {
    return res.status(401).json({
      durum: 0,
      message: 'Geçersiz token'
    });
  }
};

const organizerOnly = (req, res, next) => {
  if (req.userType !== 'organizer') {
    return res.status(403).json({
      durum: 0,
      message: 'Bu işlem için organizatör yetkisi gerekli'
    });
  }
  next();
};

module.exports = { authMiddleware, organizerOnly }; 