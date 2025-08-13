import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './PhoneVerify.css';

const PhoneVerify: React.FC = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const toE164TR = (input: string): string => {
    const digitsOnly = String(input || '').replace(/\D+/g, '');
    if (!digitsOnly) return '';
    if (digitsOnly.startsWith('90') && digitsOnly.length === 12) return `+${digitsOnly}`;
    const local = digitsOnly.replace(/^0+/, '');
    if (local.length === 10) return `+90${local}`;
    if (local.length === 11 && local.startsWith('5')) return `+90${local}`;
    return input.startsWith('+') ? input : `+${digitsOnly}`;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const base = process.env.REACT_APP_API_URL;
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        // Fetch organizer verification status from backend
        const statusRes = await axios.get(`${base}/organizers/verify/status`, { headers });
        const status = statusRes.data;
        if (status?.phoneNumber) setPhoneNumber(status.phoneNumber);
        if (status?.isVerified) setStatusText('Telefon doğrulanmış.');
        // Do not display masked number; no need to show registered number here
      } catch {
        // non-blocking
      }
    };
    init();
  }, []);

  const decodeError = (raw: any) => {
    if (typeof raw === 'string') {
      const text = raw
        .replace(/<br\s*\/?>(\s*)/gi, '\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/<[^>]*>/g, '')
        .trim();
      const m = text.match(/Error:\s*([^\n]+)/i) || text.match(/ZodError:\s*([^\n]+)/i);
      return m ? m[1].trim() : text.split('\n')[0];
    }
    return raw?.error || raw?.message || 'İşlem başarısız';
  };

  const sendCode = async () => {
    try {
      setLoading(true);
      setServerError(null);
      const base = process.env.REACT_APP_API_URL;
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      await axios.post(`${base}/organizers/verify/send`, { phoneNumber: toE164TR(phoneNumber) }, { headers });
      setStatusText('Kod gönderildi. Lütfen SMS ile gelen kodu giriniz.');
    } catch (e: any) {
      setServerError(decodeError(e?.response?.data));
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    try {
      setLoading(true);
      setServerError(null);
      const base = process.env.REACT_APP_API_URL;
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      await axios.post(`${base}/organizers/verify/confirm`, { phoneNumber: toE164TR(phoneNumber), code }, { headers });
      navigate('/');
    } catch (e: any) {
      setServerError(decodeError(e?.response?.data));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      setLoading(true);
      setServerError(null);
      const base = process.env.REACT_APP_API_URL;
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      await axios.post(`${base}/organizers/verify/resend`, undefined, { headers });
      setStatusText('Kod yeniden gönderildi.');
    } catch (e: any) {
      setServerError(decodeError(e?.response?.data));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="phone-verify">
      <div className="phone-verify__container">
        <h1 className="phone-verify__title">Telefon Doğrulama</h1>
        {serverError && (
          <div className="phone-verify__error" role="alert" aria-live="polite">{serverError}</div>
        )}
        {statusText && (
          <div className="phone-verify__status">{statusText}</div>
        )}

        <div className="phone-verify__group">
          <label className="phone-verify__label">Telefon Numarası</label>
          <input
            type="tel"
            placeholder="+905551112233"
            className="phone-verify__input"
            value={phoneNumber}
            disabled
          />
          <button className="phone-verify__button" onClick={sendCode} disabled={statusText === 'Telefon doğrulanmış.' || !phoneNumber}>
            Kod Gönder
          </button>
        </div>

        <div className="phone-verify__group">
          <label className="phone-verify__label">Doğrulama Kodu</label>
          <input
            type="text"
            placeholder="123456"
            className="phone-verify__input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="phone-verify__actions">
            <button className="phone-verify__button" onClick={confirmCode} disabled={loading || !code}>Onayla</button>
            <button className="phone-verify__link" onClick={resend} disabled={loading}>Kodu Yeniden Gönder</button>
          </div>
        </div>

        <button className="phone-verify__back" onClick={() => navigate(-1)}>Geri Dön</button>
      </div>
    </div>
  );
};

export default PhoneVerify;

