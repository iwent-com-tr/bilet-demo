const express = require('express');
const { Organizer } = require('../models/organizer');
const { Event } = require('../models/event');
const { Ticket } = require('../models/ticket');
const { organizerOnly } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Profil Güncelleme
router.put('/profile', organizerOnly, async (req, res) => {
  try {
    const {
      isim,
      soyisim,
      sirket,
      telefon,
      vergi_no,
      vergi_dairesi,
      adres,
      banka_hesap
    } = req.body;

    const organizer = await Organizer.findByPk(req.user.id);
    await organizer.update({
      isim,
      soyisim,
      sirket,
      telefon,
      vergi_no,
      vergi_dairesi,
      adres,
      banka_hesap
    });

    res.json({
      durum: 1,
      message: 'Profil güncellendi'
    });
  } catch (error) {
    res.status(400).json({
      durum: 0,
      message: error.message
    });
  }
});

// Etkinlik İstatistikleri
router.get('/event/:event_id/stats', organizerOnly, async (req, res) => {
  try {
    const event = await Event.findOne({
      where: {
        id: req.params.event_id,
        organizerId: req.user.id
      }
    });

    if (!event) {
      return res.status(404).json({
        durum: 0,
        message: 'Etkinlik bulunamadı'
      });
    }

    const tickets = await Ticket.findAll({
      where: { eventId: req.params.event_id }
    });

    const stats = {
      toplam_bilet: tickets.length,
      kullanilan_bilet: tickets.filter(t => t.durum === 'kullanildi').length,
      iptal_edilen: tickets.filter(t => t.durum === 'iptal').length,
      toplam_kazanc: tickets.reduce((sum, t) => sum + parseFloat(t.fiyat), 0),
      bilet_tipleri: {}
    };

    tickets.forEach(ticket => {
      if (!stats.bilet_tipleri[ticket.bilet_tipi]) {
        stats.bilet_tipleri[ticket.bilet_tipi] = {
          adet: 0,
          kazanc: 0
        };
      }
      stats.bilet_tipleri[ticket.bilet_tipi].adet++;
      stats.bilet_tipleri[ticket.bilet_tipi].kazanc += parseFloat(ticket.fiyat);
    });

    res.json({
      durum: 1,
      stats
    });
  } catch (error) {
    res.status(500).json({
      durum: 0,
      message: error.message
    });
  }
});

// Etkinlik Raporu
router.get('/event/:event_id/report', organizerOnly, async (req, res) => {
  try {
    const event = await Event.findOne({
      where: {
        id: req.params.event_id,
        organizerId: req.user.id
      }
    });

    if (!event) {
      return res.status(404).json({
        durum: 0,
        message: 'Etkinlik bulunamadı'
      });
    }

    const tickets = await Ticket.findAll({
      where: { eventId: req.params.event_id },
      include: [{ model: Event }]
    });

    // Excel raporu oluşturma işlemi burada yapılacak
    // Demo sürümünde sadece JSON dönüyoruz
    const report = tickets.map(t => ({
      bilet_id: t.id,
      bilet_tipi: t.bilet_tipi,
      fiyat: t.fiyat,
      durum: t.durum,
      giris_zamani: t.giris_zamani,
      gise: t.gise,
      cihaz_id: t.cihaz_id
    }));

    res.json({
      durum: 1,
      report
    });
  } catch (error) {
    res.status(500).json({
      durum: 0,
      message: error.message
    });
  }
});

// Cihaz Yönetimi
router.post('/device', organizerOnly, async (req, res) => {
  try {
    const { telefon } = req.body;

    const organizer = await Organizer.findByPk(req.user.id);
    const devices = organizer.devices || [];

    if (devices.includes(telefon)) {
      return res.status(400).json({
        durum: 0,
        message: 'Bu cihaz zaten ekli'
      });
    }

    devices.push(telefon);
    await organizer.update({ devices });

    res.status(201).json({
      durum: 1,
      message: 'Cihaz eklendi'
    });
  } catch (error) {
    res.status(400).json({
      durum: 0,
      message: error.message
    });
  }
});

router.delete('/device/:telefon', organizerOnly, async (req, res) => {
  try {
    const organizer = await Organizer.findByPk(req.user.id);
    const devices = organizer.devices || [];

    const index = devices.indexOf(req.params.telefon);
    if (index === -1) {
      return res.status(404).json({
        durum: 0,
        message: 'Cihaz bulunamadı'
      });
    }

    devices.splice(index, 1);
    await organizer.update({ devices });

    res.json({
      durum: 1,
      message: 'Cihaz silindi'
    });
  } catch (error) {
    res.status(400).json({
      durum: 0,
      message: error.message
    });
  }
});

module.exports = router; 