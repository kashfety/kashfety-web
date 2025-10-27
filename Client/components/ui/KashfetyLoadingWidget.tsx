import React from "react";
import { motion, useAnimation } from "framer-motion";
import { useTheme } from "next-themes";

interface KashfetyLoadingWidgetProps {
  size?: number;
  showText?: boolean;
  loadingText?: string;
}

export const KashfetyLoadingWidget: React.FC<KashfetyLoadingWidgetProps> = ({
  size = 80,
  showText = true,
  loadingText,
}) => {
  const pulseControls = useAnimation();
  const { theme } = useTheme();

  React.useEffect(() => {
    pulseControls.start({
      scale: [0.8, 1.2],
      transition: { duration: 1, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
    });
  }, [pulseControls]);

  const isDarkMode = theme === 'dark';

  return (
    <div className="flex flex-col items-center">
      <motion.img
        animate={pulseControls}
        src={isDarkMode ? "/logo/branding-dark.png" : "/logo/branding-light.png"}
        width={size}
        height={size}
        className="object-contain"
        alt="Loading logo"
      />

      {showText && (
        <>
          <div className="h-4" />
          <motion.p
            animate={{ opacity: [0.6, 1] }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
            className={`text-[18px] font-semibold tracking-[2px] ${
              isDarkMode ? "text-[#2a5f6b]" : "text-[#4DBCC4]"
            }`}
          >
            {loadingText ?? "kashfety"}
          </motion.p>
          <div className="h-2" />
          <div className="w-[60px]">
            <div className="w-full bg-gray-300/30 dark:bg-gray-600/30 h-[6px] rounded-full overflow-hidden">
              <div
                className={`h-full w-1/2 animate-pulse ${
                  isDarkMode ? "bg-[#2a5f6b]" : "bg-[#4DBCC4]"
                }`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Alternative loading widget
interface KashfetyLogoLoadingWidgetProps {
  size?: number;
  showText?: boolean;
  loadingText?: string;
}

export const KashfetyLogoLoadingWidget: React.FC<KashfetyLogoLoadingWidgetProps> = ({
  size = 80,
  showText = true,
  loadingText,
}) => {
  const pulseControls = useAnimation();
  const { theme } = useTheme();

  React.useEffect(() => {
    pulseControls.start({
      scale: [0.9, 1.1],
      transition: { duration: 1.2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
    });
  }, [pulseControls]);

  const isDarkMode = theme === 'dark';

  return (
    <div className="flex flex-col items-center">
      <motion.img
        animate={pulseControls}
        src={
          isDarkMode
            ? "/logo/branding1-light.png"
            : "/logo/branding2-dark.png"
        }
        width={size}
        height={size}
        className="object-contain"
        alt="Kashfety Logo"
      />

      {showText && (
        <>
          <div className="h-4" />
          <motion.p
            animate={{ opacity: [0.6, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse" }}
            className={`text-[16px] font-medium ${
              isDarkMode ? "text-gray-200" : "text-gray-800"
            }`}
          >
            {loadingText ?? "Loading..."}
          </motion.p>
          <div className="h-3" />
          <div className="w-[80px]">
            <div className="w-full bg-gray-300/30 dark:bg-gray-600/30 h-[6px] rounded-full overflow-hidden">
              <div
                className={`h-full w-1/2 animate-pulse ${
                  isDarkMode ? "bg-[#2a5f6b]" : "bg-[#4DBCC4]"
                }`}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};