const generateEventReport = (event, tickets) => {
  // Demo sürümünde basit bir JSON raporu oluşturuyoruz
  // Gerçek uygulamada Excel veya PDF formatında rapor oluşturulabilir

  const report = {
    event: {
      id: event.id,
      ad: event.ad,
      kategori: event.kategori,
      baslangic_tarih: event.baslangic_tarih,
      bitis_tarih: event.bitis_tarih,
      yer: event.yer,
      il: event.il
    },
    istatistikler: {
      toplam_bilet: tickets.length,
      kullanilan_bilet: tickets.filter(t => t.durum === 'kullanildi').length,
      iptal_edilen: tickets.filter(t => t.durum === 'iptal').length,
      toplam_kazanc: tickets.reduce((sum, t) => sum + parseFloat(t.fiyat), 0)
    },
    bilet_tipleri: {},
    gise_raporu: {},
    saatlik_giris: {},
    biletler: tickets.map(t => ({
      id: t.id,
      bilet_tipi: t.bilet_tipi,
      fiyat: t.fiyat,
      durum: t.durum,
      giris_zamani: t.giris_zamani,
      gise: t.gise,
      cihaz_id: t.cihaz_id
    }))
  };

  // Bilet tipi bazında istatistikler
  tickets.forEach(ticket => {
    if (!report.bilet_tipleri[ticket.bilet_tipi]) {
      report.bilet_tipleri[ticket.bilet_tipi] = {
        adet: 0,
        kazanc: 0,
        kullanilan: 0
      };
    }
    report.bilet_tipleri[ticket.bilet_tipi].adet++;
    report.bilet_tipleri[ticket.bilet_tipi].kazanc += parseFloat(ticket.fiyat);
    if (ticket.durum === 'kullanildi') {
      report.bilet_tipleri[ticket.bilet_tipi].kullanilan++;
    }
  });

  // Gişe bazında istatistikler
  tickets
    .filter(t => t.durum === 'kullanildi')
    .forEach(ticket => {
      if (!report.gise_raporu[ticket.gise]) {
        report.gise_raporu[ticket.gise] = {
          giris_sayisi: 0,
          bilet_tipleri: {}
        };
      }
      report.gise_raporu[ticket.gise].giris_sayisi++;
      
      if (!report.gise_raporu[ticket.gise].bilet_tipleri[ticket.bilet_tipi]) {
        report.gise_raporu[ticket.gise].bilet_tipleri[ticket.bilet_tipi] = 0;
      }
      report.gise_raporu[ticket.gise].bilet_tipleri[ticket.bilet_tipi]++;
    });

  // Saatlik giriş istatistikleri
  tickets
    .filter(t => t.durum === 'kullanildi' && t.giris_zamani)
    .forEach(ticket => {
      const saat = new Date(ticket.giris_zamani).getHours();
      if (!report.saatlik_giris[saat]) {
        report.saatlik_giris[saat] = 0;
      }
      report.saatlik_giris[saat]++;
    });

  return report;
};

module.exports = {
  generateEventReport
}; 