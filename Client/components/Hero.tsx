import Image from "next/image";
import { Check } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

interface HeroProps {
  onBookAppointment?: () => void;
}

const Hero = ({ onBookAppointment }: HeroProps) => {
  const { t } = useLocale();
  return (
    <section className="py-12 sm:py-16 lg:py-20 xl:py-32">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
        {/* Left Side: Text Content */}
        <div className="text-center lg:text-left order-2 lg:order-1">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight">
            {t('hero_title_line1') || 'Your Path to'} <br />
            <span className="bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] bg-clip-text text-transparent">{t('hero_title_highlight') || 'Better Health'}</span>
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
            {t('hero_subtitle') || "Our professional doctors will take care of your health. Choose your desired time below and we'll help out."}
          </p>
          <div className="mt-6 sm:mt-8 flex justify-center lg:justify-start">
            <button 
              onClick={onBookAppointment}
              className="bg-[#4DBCC4] dark:bg-[#2a5f6b] text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity text-center"
            >
              {t('hero_book') || 'Book Appointment'}
            </button>
          </div>
        </div>

        {/* Right Side: Image and Decorative Elements */}
        <div className="relative flex justify-center lg:justify-end order-1 lg:order-2">
          <div className="relative w-72 h-80 sm:w-80 sm:h-96 lg:w-96 lg:h-[500px]">
            {/* Decorative background shapes */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#4DBCC4]/20 to-[#4DBCC4]/30 rounded-3xl transform rotate-6"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#4DBCC4]/30 to-[#4DBCC4]/40 rounded-3xl transform -rotate-3"></div>
            
            {/* Doctor Image */}
            <div className="relative z-10 w-full h-full rounded-3xl overflow-hidden bg-background shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=600&fit=crop&crop=top"
                alt="Professional doctor smiling"
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Experience Badge */}
            <div className="absolute -bottom-4 -left-4 sm:-bottom-6 sm:-left-6 z-20 flex items-center gap-2 sm:gap-3 bg-background backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg border border-border">
              <div className="bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] rounded-full p-1.5 sm:p-2">
                <Check size={16} className="text-white sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm sm:text-base">{t('hero_experience_years') || '18+ Years'}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('hero_experience') || 'Experience'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
