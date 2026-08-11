import { IconSpinner } from '../components/icons';

export function SplashScreen() {
  return (
    <div className="splash-screen">
      <IconSpinner className="splash-spinner" width={30} height={30} />
      <p>Yuklanmoqda...</p>
    </div>
  );
}
