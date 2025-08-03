const express = require('express');
const axios = require('axios');
const { Ticket } = require('../models/ticket');
const { Event } = require('../models/event');
const { sendTicketEmail } = require('../config/email');
const { organizerOnly } = require('../middleware/auth');

const router = express.Router();

// Bilet Alma
router.post('/purchase', async (req, res) => {
  try {
    const { event_id, bilet_tipi, adet } = req.body;

    const event = await Event.findByPk(event_id);
    if (!event) {
      return res.status(404).json({
        durum: 0,
        message: 'Etkinlik bulunamadı'
      });
    }

    if (event.durum !== 'yayinda') {
      return res.status(400).json({
        durum: 0,
        message: 'Bu etkinlik için bilet satışı yapılmıyor'
      });
    }

    const biletTipi = event.bilet_tipleri.find(b => b.tip === bilet_tipi);
    if (!biletTipi) {
      return res.status(400).json({
        durum: 0,
        message: 'Geçersiz bilet tipi'
      });
    }

    const tickets = [];
    for (let i = 0; i < adet; i++) {
      try {
        const ticket = await Ticket.create({
          eventId: event_id,
          userId: req.user.id,
          bilet_tipi,
          fiyat: biletTipi.fiyat
        });

        const qrData = {
          ticket_id: ticket.id,
          event_id: event_id,
          user_id: req.user.id,
          bilet_tipi
        };

        // Generate QR code using goQR.me API
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(JSON.stringify(qrData))}&size=200x200&ecc=H&format=png&margin=10`;
        
        await ticket.update({ qr_kod: qrCodeUrl });

        await sendTicketEmail({
          to: req.user.email,
          eventName: event.ad,
          ticketType: bilet_tipi,
          qrCodeUrl,
          userName: req.user.isim,
          userSurname: req.user.soyisim
        });

        tickets.push(ticket);
      } catch (error) {
        console.error('Error creating ticket:', error);
        // If any ticket fails, delete all created tickets
        for (const t of tickets) {
          await t.destroy();
        }
        throw new Error('Bilet oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }

    res.status(201).json({
      durum: 1,
      message: 'Bilet alındı, QR kod e-postanıza gönderildi',
      tickets: tickets.map(t => ({
        ticket_id: t.id,
        qr_code: t.qr_kod
      }))
    });
  } catch (error) {
    console.error('Purchase endpoint error:', error);
    res.status(400).json({
      durum: 0,
      message: error.message || 'Bilet alınırken bir hata oluştu'
    });
  }
});

// Bilet Kontrolü (Giriş)
router.post('/check-in', organizerOnly, async (req, res) => {
  try {
    const { ticket_id, device_id, gise } = req.body;

    const ticket = await Ticket.findOne({
      where: { id: ticket_id },
      include: [{ model: Event }]
    });

    if (!ticket) {
      return res.status(404).json({
        durum: 0,
        message: 'Bilet bulunamadı'
      });
    }

    if (ticket.Event.organizerId !== req.user.id) {
      return res.status(403).json({
        durum: 0,
        message: 'Bu etkinlik için yetkiniz yok'
      });
    }

    if (ticket.durum !== 'aktif') {
      return res.status(400).json({
        durum: 0,
        message: 'Bu bilet daha önce kullanılmış veya iptal edilmiş'
      });
    }

    // Verify QR code using goQR.me API
    try {
      const verifyResponse = await axios.get(`https://api.qrserver.com/v1/read-qr-code/?fileurl=${encodeURIComponent(ticket.qr_kod)}`);
      const qrData = JSON.parse(verifyResponse.data[0].symbol[0].data);
      
      if (qrData.ticket_id !== ticket_id) {
        return res.status(400).json({
          durum: 0,
          message: 'Geçersiz QR kod'
        });
      }
    } catch (error) {
      return res.status(400).json({
        durum: 0,
        message: 'QR kod doğrulanamadı'
      });
    }

    await ticket.update({
      durum: 'kullanildi',
      giris_zamani: new Date(),
      gise,
      cihaz_id: device_id
    });

    res.json({
      durum: 1,
      message: 'Giriş başarılı',
      check_in_time: ticket.giris_zamani
    });
  } catch (error) {
    res.status(400).json({
      durum: 0,
      message: error.message
    });
  }
});

// Kullanıcının Biletleri
router.get('/my-tickets', async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      where: { userId: req.user.id },
      include: [{ model: Event }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      durum: 1,
      tickets: tickets.map(t => ({
        id: t.id,
        event: t.Event.ad,
        bilet_tipi: t.bilet_tipi,
        durum: t.durum,
        qr_kod: t.qr_kod,
        giris_zamani: t.giris_zamani
      }))
    });
  } catch (error) {
    res.status(500).json({
      durum: 0,
      message: error.message
    });
  }
});

// Etkinliğin Biletleri (Organizatör)
router.get('/event/:event_id', organizerOnly, async (req, res) => {
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
      include: [{ model: Event }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      durum: 1,
      tickets: tickets.map(t => ({
        id: t.id,
        bilet_tipi: t.bilet_tipi,
        durum: t.durum,
        giris_zamani: t.giris_zamani,
        gise: t.gise
      }))
    });
  } catch (error) {
    res.status(500).json({
      durum: 0,
      message: error.message
    });
  }
});

module.exports = router; 