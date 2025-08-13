import QRCode from 'qrcode';

export async function generateQrPngDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', type: 'image/png', margin: 1, scale: 6 });
}

export function dataUrlToBase64(dataUrl: string): { mime: string; base64: string } {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) throw new Error('invalid data url');
  return { mime: match[1], base64: match[2] };
}


