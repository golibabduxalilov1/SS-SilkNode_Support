import { IconShieldAlert } from '../components/icons';

/**
 * TALAB 2 / bo'lim 5.1: admin/superadmin uchun Mini App'da faqat neytral
 * xabar — hech qanday tugma, panel havolasi yoki boshqaruv elementi
 * render qilinmaydi (yashirilmaydi, umuman chizilmaydi).
 */
export function AdminNoticeScreen() {
  return (
    <div className="admin-notice">
      <span className="admin-notice-icon">
        <IconShieldAlert width={22} height={22} />
      </span>
      <p>
        Siz texnik mutaxassis sifatida ro'yxatdan o'tgansiz. Yangi murojaatlar haqida
        ushbu bot orqali xabar olib turasiz.
      </p>
      <p>Murojaatlar bilan ishlash uchun Web Admin Panel'dan foydalaning.</p>
    </div>
  );
}
