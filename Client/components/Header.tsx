"use client"

import { Button } from "@/components/ui/button";
import { CircleUserRound, Menu, LogOut } from "lucide-react";
import { useAuth } from "@/lib/providers/auth-provider";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./ui/locale-switcher";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "next-themes";
import Image from "next/image";

interface HeaderProps {
  onMenuToggle?: () => void;
}

const Header = ({ onMenuToggle }: HeaderProps) => {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const { t } = useLocale();
  const { theme } = useTheme();

  const handleAuthAction = () => {
    if (user) {
      logout();
    } else {
      router.push('/login');
    }
  };

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-background/80 backdrop-blur-lg rounded-2xl shadow-lg px-3 sm:px-6 py-3 sm:py-4 border border-border"
    >
      <div className="flex items-center justify-between">
        {/* Left side: Menu + Logo */}
        <div className="flex items-center gap-0">
          {/* Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔘 Menu button clicked, onMenuToggle exists:', !!onMenuToggle);
              if (onMenuToggle) {
                console.log('🔘 Calling onMenuToggle');
                onMenuToggle();
              } else {
                console.error('🔘 onMenuToggle is undefined!');
              }
            }}
            className="text-foreground/80 hover:text-[#4DBCC4] dark:hover:text-[#2a5f6b] transition-colors p-1.5 sm:p-2 z-[60] relative cursor-pointer"
            aria-label="Toggle menu"
            type="button"
          >
            <Menu size={20} className="sm:w-6 sm:h-6" />
          </Button>

          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center -ml-1"
          >
            {/* Logo - switches between light and dark mode */}
            <div className="relative h-8 sm:h-10 lg:h-12 w-32 sm:w-40 lg:w-48">
              <Image
                src={theme === 'dark' ? "/logo/branding-dark.png" : "/logo/branding-light.png"}
                alt="Kashfety Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </motion.div>
        </div>

        {/* Right side: Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>
          <ThemeToggle />
          {loading ? (
            <Button variant="outline" disabled className="px-3 sm:px-6 py-2 text-sm">
              {t('loading') || 'Loading...'}
            </Button>
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden lg:block text-foreground/80 font-medium text-sm">
                {t('header_hello') || 'Hello,'} {user.name}
              </span>
              <Button 
                variant="outline" 
                onClick={handleAuthAction}
                className="border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 px-2 sm:px-4 py-2 flex items-center gap-1 sm:gap-2 text-sm"
              >
                <LogOut size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t('header_logout') || 'Logout'}</span>
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              onClick={handleAuthAction}
              className="border-2 border-[#4DBCC4] dark:border-[#2a5f6b] text-[#4DBCC4] dark:text-[#2a5f6b] hover:bg-[#4DBCC4] dark:hover:bg-[#2a5f6b] hover:text-white transition-all duration-300 px-3 sm:px-6 py-2 text-sm"
            >
              <span className="hidden sm:inline">{t('header_login_signup') || 'Login / Sign up'}</span>
              <span className="sm:hidden">{t('header_login') || 'Login'}</span>
            </Button>
          )}
          {/* Mobile LocaleSwitcher */}
          <div className="sm:hidden">
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;