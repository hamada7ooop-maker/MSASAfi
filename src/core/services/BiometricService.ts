import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Device } from '@capacitor/device';
import { t } from '../../i18n/engine';
import { silentFail } from '../utils';

/**
 * BiometricService - Handles biometric authentication using Capacitor.
 */
export const BiometricService = {
  /**
   * Checks if biometrics are available on the device.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const info = await Device.getInfo();
      if (info.platform === 'web') return false;
      
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (err) {
      silentFail('[BiometricService] Not available')(err);
      return false;
    }
  },

  /**
   * Authenticates the user using biometrics.
   */
  async authenticate(reason?: string): Promise<boolean> {
    try {
      const info = await Device.getInfo();
      if (info.platform === 'web') return false;

      await NativeBiometric.verifyIdentity({
        reason: reason || t('biometric.reason') || 'يرجى تأكيد هويتك للمتابعة',
        title: t('biometric.title') || 'تأكيد الهوية في مصاريفي',
        subtitle: t('biometric.subtitle') || 'تسجيل دخول سريع وآمن',
        description: t('biometric.description') || 'استخدم البصمة أو التعرف على الوجه لفتح التطبيق',
        negativeButtonText: t('action.cancel') || 'إلغاء',
      });
      return true;
    } catch (err) {
      silentFail('[BiometricService] Auth error')(err);
      return false;
    }
  }
};
