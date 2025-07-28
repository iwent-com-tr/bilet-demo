const express = require('express');
const { ChatMessage } = require('../models/chat');
const { Event } = require('../models/event');
const { organizerOnly } = require('../middleware/auth');

const router = express.Router();

// Mesaj Gönderme
router.post('/message', async (req, res) => {
  try {
    const { event_id, mesaj } = req.body;

    const event = await Event.findByPk(event_id);
    if (!event) {
      return res.status(404).json({
        durum: 0,
        message: 'Etkinlik bulunamadı'
      });
    }

    const chatMessage = await ChatMessage.create({
      eventId: event_id,
      gonderenId: req.user.id,
      gonderenTipi: req.userType,
      mesaj
    });

    // Socket.IO ile mesajı yayınla
    req.app.get('io').to(`event-${event_id}`).emit('new-message', {
      id: chatMessage.id,
      gonderenId: chatMessage.gonderenId,
      gonderenTipi: chatMessage.gonderenTipi,
      mesaj: chatMessage.mesaj,
      createdAt: chatMessage.createdAt
    });

    res.status(201).json({
      durum: 1,
      message: 'Mesaj gönderildi'
    });
  } catch (error) {
    res.status(400).json({
      durum: 0,
      message: error.message
    });
  }
});

// Mesaj Silme (Organizatör veya kendi mesajı)
router.delete('/message/:id', async (req, res) => {
  try {
    const message = await ChatMessage.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({
        durum: 0,
        message: 'Mesaj bulunamadı'
      });
    }

    const event = await Event.findByPk(message.eventId);
    const isOrganizer = req.userType === 'organizer' && event.organizerId === req.user.id;
    const isOwner = message.gonderenId === req.user.id;

    if (!isOrganizer && !isOwner) {
      return res.status(403).json({
        durum: 0,
        message: 'Bu mesajı silme yetkiniz yok'
      });
    }

    await message.update({ durum: 'silindi' });

    // Socket.IO ile mesaj silme bilgisini yayınla
    req.app.get('io').to(`event-${message.eventId}`).emit('delete-message', {
      message_id: message.id
    });

    res.json({
      durum: 1,
      message: 'Mesaj silindi'
    });
  } catch (error) {
    res.status(400).json({
      durum: 0,
      message: error.message
    });
  }
});

// Etkinlik Mesajları
router.get('/event/:event_id', async (req, res) => {
  try {
    const { sayfa = 1, limit = 50 } = req.query;

    const event = await Event.findByPk(req.params.event_id);
    if (!event) {
      return res.status(404).json({
        durum: 0,
        message: 'Etkinlik bulunamadı'
      });
    }

    const messages = await ChatMessage.findAll({
      where: { eventId: req.params.event_id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(sayfa) - 1) * parseInt(limit)
    });

    res.json({
      durum: 1,
      messages: messages.map(m => ({
        id: m.id,
        gonderenId: m.gonderenId,
        gonderenTipi: m.gonderenTipi,
        mesaj: m.mesaj,
        createdAt: m.createdAt
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