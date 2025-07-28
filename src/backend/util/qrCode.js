const QRCode = require('qrcode');

const generateQRCode = async (data) => {
  try {
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(data), {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    return qrCodeUrl;
  } catch (error) {
    throw new Error(`QR kod oluşturma hatası: ${error.message}`);
  }
};

const verifyQRCode = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    
    // Gerekli alanların kontrolü
    if (!data.ticket_id || !data.event_id || !data.user_id || !data.bilet_tipi) {
      throw new Error('Geçersiz QR kod formatı');
    }

    return data;
  } catch (error) {
    throw new Error(`QR kod doğrulama hatası: ${error.message}`);
  }
};

module.exports = {
  generateQRCode,
  verifyQRCode
}; 