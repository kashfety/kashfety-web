import { MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocale } from "@/components/providers/locale-provider";

interface BookingFormProps {
  onBookAppointment?: () => void;
}

const BookingForm = ({ onBookAppointment }: BookingFormProps) => {
  const { t } = useLocale();
  return (
    <Card className="w-full bg-background/95 backdrop-blur-lg shadow-2xl border">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-foreground text-center lg:text-left">{t('booking_title') || 'Book an appointment'}</h3>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Checkbox id="send-sms" />
            <label
              htmlFor="send-sms"
              className="text-xs sm:text-sm font-medium text-foreground cursor-pointer"
            >
              {t('booking_send_sms') || 'Send message on phone'}
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 items-end">
          {/* Form Input Fields */}
          <BookingInput icon={MapPin} label={t('booking_location_label') || 'Location'} value="Cairo, Egypt" />
          <BookingInput icon={Calendar} label={t('booking_date_label') || 'Appointment date'} value="02 Aug, 2025" />
          <BookingInput icon={Users} label={t('booking_persons_label') || 'Persons'} value="2 adults, 1 child" />

          {/* Submit Button */}
          <Button 
            onClick={onBookAppointment}
            size="lg" 
            className="w-full h-12 sm:h-14 text-sm sm:text-base bg-[#4DBCC4] dark:bg-[#2a5f6b] hover:opacity-90 transition-opacity text-white"
          >
            {t('booking_submit') || 'Book now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// A helper component for the form fields to avoid repetition
const BookingInput = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string }) => {
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted hover:bg-muted/80 rounded-xl transition-colors cursor-pointer">
      <Icon className="text-[#4DBCC4] flex-shrink-0" size={20} />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="font-semibold text-foreground truncate text-sm sm:text-base">{value}</p>
      </div>
    </div>
  );
};

export default BookingForm;
