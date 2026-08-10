import { getTelegramWebApp } from '../../telegram/webApp';

/** Bo'lim 4.2: /start bosmagan yoki telefon tasdiqlamagan foydalanuvchi uchun ogohlantirish. */
export function WarningBanner() {
  const openBot = () => {
    const botUsername = import.meta.env.VITE_BOT_USERNAME;
    if (!botUsername) return;
    getTelegramWebApp()?.openTelegramLink(`https://t.me/${botUsername}`);
  };

  return (
    <div className="warning-banner">
      <p>
        Murojaat yuborish uchun avval botga o'ting, "/start" bosing va telefon
        raqamingizni tasdiqlang.
      </p>
      <button type="button" onClick={openBot}>
        Botni ochish
      </button>
    </div>
  );
}
