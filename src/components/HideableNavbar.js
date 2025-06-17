import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';

export default function HideableNavbar() {
  const { pathname } = useLocation();
  // don’t show on root ("/") — your login page
  if (pathname === '/') return null;
  return <Navbar />;
}
