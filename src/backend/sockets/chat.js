const jwt = require('jsonwebtoken');
const { User } = require('../models/user');
const { Organizer } = require('../models/organizer');
const { Event } = require('../models/event');

module.exports = (io) => {
  // Kimlik doğrulama middleware'i
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Yetkilendirme başarısız'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let user;

      if (decoded.type === 'user') {
        user = await User.findByPk(decoded.id);
      } else if (decoded.type === 'organizer') {
        user = await Organizer.findByPk(decoded.id);
      }

      if (!user) {
        return next(new Error('Kullanıcı bulunamadı'));
      }

      socket.user = user;
      socket.userType = decoded.type;
      next();
    } catch (error) {
      next(new Error('Geçersiz token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Kullanıcı bağlandı:', socket.user.id);

    // Etkinlik odasına katılma
    socket.on('join-event', async (eventId) => {
      try {
        const event = await Event.findByPk(eventId);
        if (!event) {
          socket.emit('error', { message: 'Etkinlik bulunamadı' });
          return;
        }

        // Önceki odalardan çık
        socket.rooms.forEach(room => {
          if (room.startsWith('event-')) {
            socket.leave(room);
          }
        });

        // Yeni odaya katıl
        socket.join(`event-${eventId}`);
        socket.emit('joined-event', { eventId });

        // Organizatör ise özel odaya da katıl
        if (socket.userType === 'organizer' && event.organizerId === socket.user.id) {
          socket.join(`event-${eventId}-organizer`);
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Etkinlik odasından ayrılma
    socket.on('leave-event', (eventId) => {
      socket.leave(`event-${eventId}`);
      socket.leave(`event-${eventId}-organizer`);
      socket.emit('left-event', { eventId });
    });

    // Bağlantı kapandığında
    socket.on('disconnect', () => {
      console.log('Kullanıcı ayrıldı:', socket.user.id);
    });
  });
}; 