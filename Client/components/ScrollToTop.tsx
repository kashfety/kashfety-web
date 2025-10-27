"use client"

import { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

import { useLocale } from "@/components/providers/locale-provider"
const ScrollToTop = () => {
  const { t, isRTL } = useLocale()

  const [isVisible, setIsVisible] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (current) => {
    if (current > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  });

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <motion.button
      className="fixed bottom-8 right-8 z-50 bg-[#4DBCC4] dark:bg-[#2a5f6b] hover:opacity-90 text-white p-3 rounded-full shadow-lg"
      initial={{ opacity: 0, scale: 0, y: 100 }}
      animate={{ 
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0,
        y: isVisible ? 0 : 100
      }}
      transition={{ 
        duration: 0.3,
        ease: "easeOut"
      }}
      whileHover={{ 
        scale: 1.1,
        boxShadow: "0 10px 25px rgba(77, 188, 196, 0.3)"
      }}
      whileTap={{ scale: 0.9 }}
      onClick={scrollToTop}
      style={{ 
        display: isVisible ? 'block' : 'none'
      }}
    >
      <ChevronUp size={24} />
    </motion.button>
  );
};

export default ScrollToTop;
