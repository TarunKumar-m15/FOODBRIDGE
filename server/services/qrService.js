import QRCode from 'qrcode';

/**
 * Generates a Base64 QR code image string from a secret string
 * @param {string} secret 
 * @returns {Promise<string>}
 */
export const generateQRCodeDataURL = async (secret) => {
  try {
    const dataURL = await QRCode.toDataURL(secret, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });
    return dataURL;
  } catch (error) {
    throw new Error(`Failed to generate QR Code: ${error.message}`);
  }
};

/**
 * Validates scan code payload matches the database records
 * @param {string} scannedSecret 
 * @param {string} actualSecret 
 * @returns {boolean}
 */
export const verifyQRCodeSecret = (scannedSecret, actualSecret) => {
  return scannedSecret === actualSecret;
};
