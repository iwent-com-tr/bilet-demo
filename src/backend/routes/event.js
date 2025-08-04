const express = require('express');
const { Event } = require('../models/event');
const { organizerOnly, authMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Etkinlik Oluşturma (Organizatör)
router.post('/create', authMiddleware, organizerOnly, async (req, res) => {
  try {
    const {
      ad,
      kategori,
      baslangic_tarih,
      bitis_tarih,
      yer,
      adres,
      il,
      banner,
      sosyal_medya,
      aciklama,
      kapasite,
      bilet_tipleri
    } = req.body;

    const event = await Event.create({
      ad,
      kategori,
      baslangic_tarih,
      bitis_tarih,
      yer,
      adres,
      il,
      banner,
      sosyal_medya,
      aciklama,
      kapasite,
      bilet_tipleri,
      organizerId: req.user.id
    });

    res.status(201).json({
      durum: 1,
      message: 'Etkinlik oluşturuldu',
      event_id: event.id
    });
  } catch (error) {
    res.status(400).json({
      durum: 0,
      message: error.message
    });
  }
});

// Etkinlik Güncelleme (Organizatör)
router.put('/:id', authMiddleware, organizerOnly, async (req, res) => {
  try {
    const event = await Event.findOne({
      where: {
        id: req.params.id,
        organizerId: req.user.id
      }
    });

    if (!event) {
      return res.status(404).json({
        durum: 0,
        message: 'Etkinlik bulunamadı'
      });
    }

    const updatedEvent = await event.update(req.body);

    res.json({
      durum: 1,
      message: 'Etkinlik güncellendi',
      event: updatedEvent
    });
  } catch (error) {
    res.status(400).json({
      durum: 0,
      message: error.message
    });
  }
});

// Etkinlik Silme (Organizatör)
router.delete('/:id', authMiddleware, organizerOnly, async (req, res) => {
  try {
    const event = await Event.findOne({
      where: {
        id: req.params.id,
        organizerId: req.user.id
      }
    });

    if (!event) {
      return res.status(404).json({
        durum: 0,
        message: 'Etkinlik bulunamadı'
      });
    }

    await event.update({ durum: 'iptal' });

    res.json({
      durum: 1,
      message: 'Etkinlik iptal edildi'
    });
  } catch (error) {
    res.status(400).json({
      durum: 0,
      message: error.message
    });
  }
});

// Etkinlik Listesi
router.get('/', async (req, res) => {
  try {
    const {
      kategori,
      il,
      baslangic_tarih,
      bitis_tarih,
      sayfa = 1,
      limit = 10
    } = req.query;

    const where = {
      durum: 'yayinda',
      bitis_tarih: {
        [Op.gte]: new Date()
      }
    };

    if (kategori) where.kategori = kategori;
    if (il) where.il = il;
    if (baslangic_tarih) {
      where.baslangic_tarih = {
        [Op.gte]: new Date(baslangic_tarih)
      };
    }
    if (bitis_tarih) {
      where.bitis_tarih = {
        [Op.lte]: new Date(bitis_tarih)
      };
    }

    const { count, rows } = await Event.findAndCountAll({
      where,
      order: [['baslangic_tarih', 'ASC']],
      limit: parseInt(limit),
      offset: (parseInt(sayfa) - 1) * parseInt(limit)
    });

    res.json({
      durum: 1,
      toplam: count,
      sayfa: parseInt(sayfa),
      sayfa_sayisi: Math.ceil(count / limit),
      events: rows
    });
  } catch (error) {
    res.status(500).json({
      durum: 0,
      message: error.message
    });
  }
});

// Etkinlik Detayı
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        durum: 0,
        message: 'Etkinlik bulunamadı'
      });
    }

    res.json({
      durum: 1,
      event
    });
  } catch (error) {
    res.status(500).json({
      durum: 0,
      message: error.message
    });
  }
});

module.exports = router; 