"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Home, Clock, Star, ChevronLeft, Calendar as CalendarIcon, Search, XCircle } from "lucide-react";
import Image from "next/image";
import { useAuth } from '@/lib/providers/auth-provider';
import { useLocale } from '@/components/providers/locale-provider';
import { localizeSpecialty, toArabicNumerals, formatCurrency } from '@/lib/i18n';
import { appointmentService, labService } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { useCustomAlert } from "@/hooks/use-custom-alert";
import CustomAlert from "@/components/CustomAlert";
import { motion, AnimatePresence } from "framer-motion";

interface Doctor {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  name_ar?: string;
  specialty: string;
  experience_years: number;
  profile_picture: string;
  consultation_fee: number;
  rating: number;
  home_available?: boolean;
  has_schedule?: boolean;
}

interface Center {
  id: string;
  name: string;
  name_ar?: string;
  address: string;
  phone?: string;
  email?: string;
  services?: string[];
  operating_hours?: any;
}

interface LabTestType {
  id: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  name_ku?: string;
  description?: string;
  category?: 'lab' | 'imaging';
  is_active?: boolean;
}

interface Specialty {
  id: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  name_ku?: string;
  description: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'doctor' | 'lab';
  preSelectedDoctorId?: string;
  preSelectedCenterId?: string;
}

export default function BookingModal({ isOpen, onClose, initialMode = 'doctor', preSelectedDoctorId, preSelectedCenterId }: BookingModalProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { t, isRTL, locale } = useLocale();
  const { toast } = useToast();
  const { alertConfig, isOpen: alertOpen, hideAlert, showSuccess, showError, showInfo } = useCustomAlert();

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [isLabMode, setIsLabMode] = useState(initialMode === 'lab');
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<"clinic" | "home" | "">("");
  const [searchMethod, setSearchMethod] = useState<"centers" | "doctors" | "">("");
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorIdToCenters, setDoctorIdToCenters] = useState<Record<string, Center[]>>({});
  const [doctorIdToPrimaryCenter, setDoctorIdToPrimaryCenter] = useState<Record<string, string>>({});
  const [filterText, setFilterText] = useState("");
  const [centerFilter, setCenterFilter] = useState<string>("");
  const [minRating, setMinRating] = useState<number>(0);
  const [maxFee, setMaxFee] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [doctorCenters, setDoctorCenters] = useState<Center[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);
  const [specialtiesMap, setSpecialtiesMap] = useState<Map<string, { name_ar?: string; name_ku?: string }>>(new Map());
  // Lab-related state
  const [labTypes, setLabTypes] = useState<LabTestType[]>([]);
  const [labCentersByType, setLabCentersByType] = useState<Record<string, Center[]>>({});
  const [selectedLabType, setSelectedLabType] = useState<LabTestType | null>(null);
  const [labAvailableDates, setLabAvailableDates] = useState<string[]>([]);
  const [labCenters, setLabCenters] = useState<Center[]>([]); // All centers for lab mode step 1
  const [labCenterFilter, setLabCenterFilter] = useState(""); // Search filter for lab centers

  // Schedule-related state
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string, is_available: boolean, is_booked: boolean }>>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [doctorWorkingDays, setDoctorWorkingDays] = useState<number[]>([]);
  const [actualConsultationFee, setActualConsultationFee] = useState<number>(0);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Helper function to get localized name
  const getLocalizedName = (item: { name?: string; name_en?: string; name_ar?: string; name_ku?: string; first_name_ar?: string; last_name_ar?: string } | null) => {
    if (!item) return '';
    
    // For Arabic locale
    if (locale === 'ar') {
      // If it's a doctor with first_name_ar/last_name_ar
      if (item.first_name_ar && item.last_name_ar) {
        return `${item.first_name_ar} ${item.last_name_ar}`;
      }
      // If it has name_ar (for centers, etc)
      if (item.name_ar) return item.name_ar;
    }
    
    // For Kurdish locale
    if (locale === 'ku' && item.name_ku) return item.name_ku;
    
    // Default to English name
    return item.name || item.name_en || '';
  };

  // Helper to get localized specialty name from doctor's specialty string
  const getLocalizedSpecialtyName = (specialtyName: string) => {
    const specialtyData = specialtiesMap.get(specialtyName);
    if (!specialtyData) return specialtyName;
    
    if (locale === 'ar' && specialtyData.name_ar) return specialtyData.name_ar;
    if (locale === 'ku' && specialtyData.name_ku) return specialtyData.name_ku;
    return specialtyName;
  };

  // Helper to get localized lab test type name
  const getLocalizedLabTestName = (labTest: LabTestType | null) => {
    if (!labTest) return '';
    
    if (locale === 'ar' && labTest.name_ar) return labTest.name_ar;
    if (locale === 'ku' && labTest.name_ku) return labTest.name_ku;
    if (labTest.name_en) return labTest.name_en;
    return labTest.name;
  };

  // Restore booking data on modal open
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const storedData = localStorage.getItem('bookingData');
      if (storedData) {
        try {
          const bookingData = JSON.parse(storedData);
          console.log('Restoring booking data:', bookingData);

          setSelectedSpecialty(bookingData.specialty || "");
          setSelectedLocation(bookingData.location || "");

          if (bookingData.center && bookingData.specialty && bookingData.location) {
            setSelectedCenter(bookingData.center);
            setSelectedSpecialty(bookingData.specialty);
            setSelectedLocation(bookingData.location);

            if (bookingData.doctor && bookingData.date && bookingData.time && bookingData.step === 4) {
              setSelectedDoctor(bookingData.doctor);
              setSelectedDate(new Date(bookingData.date));
              setSelectedTime(bookingData.time);
              setCurrentStep(4);

              if (bookingData.doctor.id && bookingData.date) {
                fetchAvailableSlots(bookingData.doctor.id, new Date(bookingData.date));
              }
            } else if (bookingData.doctor) {
              setSelectedDoctor(bookingData.doctor);
              // Fetch centers for this doctor
              if (bookingData.location === "clinic" || bookingData.location === "home") {
                fetchDoctorCenters(bookingData.doctor.id, bookingData.location);
              }
              setCurrentStep(3);
            }
          } else if (bookingData.specialty && bookingData.location) {
            // Fetch doctors for this specialty and location
            if (bookingData.location === "clinic" || bookingData.location === "home") {
              fetchDoctorsBySpecialty(bookingData.specialty, bookingData.location);
            }
            setCurrentStep(2);
          }

          localStorage.removeItem('bookingData');
        } catch (error) {
          console.error('Error parsing booking data:', error);
          localStorage.removeItem('bookingData');
        }
      }
    }
  }, [isOpen]);

  // Handle modal opening and initial setup
  useEffect(() => {
    if (isOpen) {
      // Set the correct mode based on initialMode
      const shouldBeLabMode = initialMode === 'lab';
      setIsLabMode(shouldBeLabMode);

      // Set the correct initial step - lab mode starts at step 1 (choose center), doctor mode at step 1
      setCurrentStep(1);

      // Always fetch specialties for doctor mode
      if (!shouldBeLabMode) {
        fetchSpecialties();
      }
    }
  }, [isOpen, initialMode]);

  // Handle lab data fetching when in lab mode
  useEffect(() => {
    if (isOpen && isLabMode) {
      prefetchLabCenters();
    }
  }, [isOpen, isLabMode]);

  // Handle pre-selected doctor or center
  useEffect(() => {
    if (isOpen && preSelectedDoctorId && !isLabMode) {
      // Pre-select doctor and skip to center selection
      fetchDoctorById(preSelectedDoctorId);
    } else if (isOpen && preSelectedCenterId && isLabMode) {
      // Pre-select center for lab booking
      fetchCenterById(preSelectedCenterId);
    }
  }, [isOpen, preSelectedDoctorId, preSelectedCenterId, isLabMode]);

  const handleModeToggle = (mode: 'doctor' | 'lab') => {
    const switchingToLab = mode === 'lab';
    setIsLabMode(switchingToLab);
    setSelectedDoctor(null);
    setSelectedLabType(null);
    setSelectedCenter(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setSearchMethod("");
    setCenters([]);
    setAvailableSlots([]);
    setAvailableDates([]);
    setLabAvailableDates([]);
    setDoctorWorkingDays([]);
    setSymptoms("");
    setActualConsultationFee(0);
    // Jump to step 1 for both modes (lab starts with choosing center)
    setCurrentStep(1);
    if (switchingToLab) {
      prefetchLabCenters();
    }
  };

  const fetchSpecialties = async () => {
    try {
      setLoadingSpecialties(true);
      const response = await fetch('/api/specialties');
      if (response.ok) {
        const data = await response.json();
        setSpecialties(data.specialties);
        
        // Build specialties map for localization
        const map = new Map();
        data.specialties.forEach((specialty: Specialty) => {
          map.set(specialty.name, {
            name_ar: specialty.name_ar,
            name_ku: specialty.name_ku
          });
        });
        setSpecialtiesMap(map);
      } else {
        console.error('Failed to fetch specialties');
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    } finally {
      setLoadingSpecialties(false);
    }
  };

  // Labs: fetch all test types and, for each, centers that offer it
  const prefetchLabTypesAndCenters = async () => {
    try {
      const typesRes = await labService.getTypes();
      const types: LabTestType[] = (typesRes && (typesRes as any).types) ? (typesRes as any).types : (Array.isArray(typesRes) ? (typesRes as any) : []);
      setLabTypes(types);
      // Fetch centers per type in parallel
      const entries = await Promise.all(
        types.map(async (t) => {
          try {
            const centersResp = await labService.getCenters({ lab_test_type_id: t.id });
            const centers = (centersResp as any)?.centers || [];
            return [t.id, centers] as [string, Center[]];
          } catch (e) {
            console.error('Error fetching centers for type', t.id, e);
            return [t.id, []] as [string, Center[]];
          }
        })
      );
      const map: Record<string, Center[]> = {};
      for (const [k, v] of entries) map[k] = v;
      setLabCentersByType(map);
    } catch (e) {
      console.error('Error prefetching lab types/centers:', e);
      setLabTypes([]);
      setLabCentersByType({});
    }
  };

  // Labs: NEW simpler flow - fetch all centers that offer lab services
  const prefetchLabCenters = async () => {
    try {
      setLoading(true);
      const centersResp = await labService.getCenters({});
      const centers = (centersResp as any)?.centers || [];
      setLabCenters(centers);
      console.log('Fetched lab centers:', centers.length);
    } catch (e) {
      console.error('Error fetching lab centers:', e);
      setLabCenters([]);
    } finally {
      setLoading(false);
    }
  };

  // Labs: fetch test types available at a specific center
  const fetchLabTypesForCenter = async (centerId: string) => {
    try {
      setLoading(true);
      // Get the services (test types) offered by this center
      const servicesResp = await labService.getCenterServices(centerId);
      const services = servicesResp?.services || [];

      // Extract unique lab test types from the services
      const testTypes: LabTestType[] = services
        .filter((s: any) => s.lab_test_types) // Only include services with test type info
        .map((s: any) => ({
          id: s.lab_test_type_id || s.lab_test_types.id,
          name: s.lab_test_types.name,
          name_en: s.lab_test_types.name_en || s.lab_test_types.name,
          name_ar: s.lab_test_types.name_ar,
          name_ku: s.lab_test_types.name_ku,
          description: s.lab_test_types.description,
          category: s.lab_test_types.category,
          is_active: s.lab_test_types.is_active,
        }));

      setLabTypes(testTypes);
      console.log('Fetched lab test types for center:', testTypes.length);
    } catch (e) {
      console.error('Error fetching lab types for center:', e);
      setLabTypes([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch a specific doctor by ID and pre-select them
  const fetchDoctorById = async (doctorId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/doctor-details?doctorId=${doctorId}`);
      const data = await response.json();

      if (response.ok && data.success && data.doctor) {
        const doctor: Doctor = {
          id: data.doctor.id,
          name: data.doctor.name,
          first_name_ar: data.doctor.first_name_ar,
          last_name_ar: data.doctor.last_name_ar,
          name_ar: data.doctor.name_ar,
          specialty: data.doctor.specialty,
          experience_years: data.doctor.experience_years || 0,
          profile_picture: data.doctor.profile_picture || '/default-avatar.jpg',
          consultation_fee: data.doctor.consultation_fee || 0,
          rating: data.doctor.rating || 0,
          home_available: !!data.doctor.home_visits_available,
          has_schedule: true,
        };

        setSelectedDoctor(doctor);
        setSelectedSpecialty(doctor.specialty);
        setSelectedLocation("clinic"); // Set location to clinic
        setSearchMethod("doctors"); // Set search method

        // Fetch centers for this doctor
        await fetchDoctorCenters(doctorId, "clinic");

        // Skip to step 3 (center selection)
        setCurrentStep(3);
      }
    } catch (error) {
      console.error('Error fetching doctor:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch a specific center by ID and pre-select it for lab booking
  const fetchCenterById = async (centerId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lab-details?centerId=${centerId}`);
      const data = await response.json();

      if (response.ok && data.success && data.center) {
        const center: Center = {
          id: data.center.id,
          name: data.center.name,
          name_ar: data.center.name_ar,
          address: data.center.address,
          phone: data.center.phone,
          email: data.center.email,
          services: data.center.tests?.map((t: any) => t.name) || [],
          operating_hours: data.center.operating_hours,
        };

        setSelectedCenter(center);

        // Fetch available lab types for this center
        await fetchLabTypesForCenter(centerId);

        // Skip to step 2 (test type selection)
        setCurrentStep(2);
      }
    } catch (error) {
      console.error('Error fetching center:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctors based on specialty and appointment type (for step 2)
  const fetchDoctorsBySpecialty = async (specialty: string, visitType: "clinic" | "home") => {
    setLoading(true);
    try {
      console.log('Fetching doctors by specialty:', specialty, 'visitType:', visitType);

      // Build query parameters
      const params = new URLSearchParams();
      if (specialty) params.set('specialty', specialty);
      if (visitType === 'home') params.set('home_visit', 'true');

      const response = await fetch(`/api/doctors?${params.toString()}`);
      const result = await response.json();

      console.log('API Response:', result);
      console.log('First doctor raw data:', result.doctors?.[0]);

      if (result && result.success) {
        let filteredDoctors = (result.doctors || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          first_name: d.first_name,
          last_name: d.last_name,
          first_name_ar: d.first_name_ar,
          last_name_ar: d.last_name_ar,
          name_ar: d.name_ar,
          specialty: d.specialty,
          experience_years: d.experience_years || 0,
          profile_picture: d.profile_picture_url || '/default-avatar.jpg',
          consultation_fee: d.consultation_fee || 0,
          rating: d.rating || 0,
          home_available: !!d.home_visits_available,
          has_schedule: true,
        }));

        console.log('Mapped first doctor:', filteredDoctors[0]);

        // Filter for home visits if requested
        if (visitType === 'home') {
          filteredDoctors = filteredDoctors.filter((doctor: Doctor) => doctor.home_available);
        }

        setDoctors(filteredDoctors);
        console.log('Found doctors:', filteredDoctors.length);
      } else {
        console.error('Failed to fetch doctors:', result);
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch centers that have doctors with the specified specialty (for "Find Centers" flow)
  const fetchCentersBySpecialty = async (specialty: string, visitType: "clinic" | "home") => {
    setLoading(true);
    try {
      console.log('Fetching centers by specialty:', specialty, 'visitType:', visitType);

      // Build query parameters
      const params = new URLSearchParams();
      if (specialty) params.set('specialty', specialty);
      // Only add home_visit parameter if user actually selected home visit
      if (visitType === 'home') {
        params.set('home_visit', 'true');
      }

      const response = await fetch(`/api/centers/by-specialty?${params.toString()}`);
      const result = await response.json();

      if (result && result.success) {
        const centersList = result.centers || [];
        setCenters(centersList);
        console.log('Found centers:', centersList.length);
      } else {
        console.error('Failed to fetch centers:', result);
        setCenters([]);
      }
    } catch (error) {
      console.error('Error fetching centers:', error);
      setCenters([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctors by center and specialty (for "Find Centers" flow step 3)
  const fetchDoctorsByCenter = async (centerId: string, specialty: string, visitType: "clinic" | "home") => {
    setLoading(true);
    try {
      console.log('Fetching doctors by center:', centerId, 'specialty:', specialty, 'visitType:', visitType);

      // Build query parameters
      const params = new URLSearchParams();
      params.set('centerId', centerId);
      if (specialty) params.set('specialty', specialty);
      // Only add home_visit parameter if user actually selected home visit
      if (visitType === 'home') {
        params.set('home_visit', 'true');
      }

      // Try multiple route variants for Vercel compatibility
      const routes = [
        `/api/center-doctors?${params.toString()}`,
        `/api/centers/${centerId}/doctors?${params.toString()}`
      ];

      let result = null;
      for (let i = 0; i < routes.length; i++) {
        try {
          console.log(`Trying route ${i + 1}/${routes.length}: ${routes[i]}`);
          const response = await fetch(routes[i]);
          if (response.ok) {
            result = await response.json();
            console.log('✅ Route worked:', routes[i]);
            break;
          }
          console.log(`❌ Route failed: ${routes[i]}`);
        } catch (error) {
          console.log(`❌ Route error: ${routes[i]}`, error);
          if (i === routes.length - 1) {
            throw error; // Rethrow on last attempt
          }
        }
      }

      if (result && result.success) {
        let filteredDoctors = (result.doctors || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          first_name: d.first_name,
          last_name: d.last_name,
          first_name_ar: d.first_name_ar,
          last_name_ar: d.last_name_ar,
          name_ar: d.name_ar,
          specialty: d.specialty,
          experience_years: d.experience_years || 0,
          profile_picture: d.profile_picture_url || '/default-avatar.jpg',
          consultation_fee: d.consultation_fee || 0,
          rating: d.rating || 0,
          home_available: !!d.home_visits_available,
          has_schedule: true,
        }));

        // Additional filter for home visits if requested (backend should handle this, but double-check)
        if (visitType === 'home') {
          filteredDoctors = filteredDoctors.filter((doctor: Doctor) => doctor.home_available);
        }

        setDoctors(filteredDoctors);
        console.log('Found doctors in center:', filteredDoctors.length);
      } else {
        console.error('Failed to fetch doctors by center:', result);
        setDoctors([]);
      }
    } catch (error) {
      console.error('Error fetching doctors by center:', error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch centers where a specific doctor is available (for step 3)
  const fetchDoctorCenters = async (doctorId: string, visitType: "clinic" | "home") => {
    setLoading(true);
    try {
      console.log('🏥 [BookingModal] Fetching centers for doctor:', doctorId, 'visitType:', visitType);

      // Try fallback route first (works better on Vercel)
      let response: Response;
      let result: any;

      try {
        console.log('🔄 [BookingModal] Trying doctor-centers-by-id fallback route');
        response = await fetch(`/api/doctor-centers-by-id?doctor_id=${encodeURIComponent(doctorId)}&visit_type=${visitType}`);
        result = await response.json();

        if (response.ok && result && result.success) {
          console.log('✅ [BookingModal] Fallback route worked, found', result.centers?.length || 0, 'centers');
          const centers = result.centers || [];
          setDoctorCenters(centers);
          setLoading(false);
          return;
        } else {
          console.log('⚠️ [BookingModal] Fallback route returned but no valid data, trying dynamic route');
        }
      } catch (fallbackError: any) {
        console.log('❌ [BookingModal] Fallback failed:', fallbackError?.message || fallbackError);
      }

      // Fallback to dynamic route
      console.log('🔄 [BookingModal] Trying dynamic route');
      response = await fetch(`/api/doctors/${doctorId}/centers?visit_type=${visitType}`);
      result = await response.json();

      if (result && result.success) {
        const centers = result.centers || [];
        setDoctorCenters(centers);
        console.log('✅ [BookingModal] Found centers for doctor:', centers.length);
      } else {
        console.error('❌ [BookingModal] Failed to fetch doctor centers:', result);
        setDoctorCenters([]);
      }
    } catch (error) {
      console.error('❌ [BookingModal] Error fetching doctor centers:', error);
      setDoctorCenters([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch doctors based on specialty and location type
  // Remove unused functions that were part of the old aggregated approach
  // fetchCenters, fetchDoctors, handleDoctorProceed are no longer needed

  // NEW: Fetch doctor's working days using center-specific schedule system
  const fetchDoctorWorkingDays = async (doctorId: string, centerId?: string) => {
    try {
      console.log('📅 Fetching doctor working days for:', doctorId, 'at center:', centerId, 'visit type:', selectedLocation);

      // Build query parameters
      const params = new URLSearchParams();
      params.set('doctorId', doctorId);

      // Only add center_id for clinic visits, NOT for home visits
      if (selectedLocation === "clinic") {
        if (centerId) {
          params.set('center_id', centerId);
        } else if (selectedCenter?.id) {
          params.set('center_id', selectedCenter.id);
        }
      }

      // Try multiple route variants for Vercel compatibility
      const routes = [
        `/api/doctor-working-days?${params.toString()}`,
        `/api/doctors/${doctorId}/working-days?${centerId ? `center_id=${centerId}` : ''}`
      ];

      let data = null;
      for (let i = 0; i < routes.length; i++) {
        try {
          console.log(`Trying route ${i + 1}/${routes.length}: ${routes[i]}`);
          const response = await fetch(routes[i]);
          if (response.ok) {
            data = await response.json();
            console.log('✅ Route worked:', routes[i]);
            break;
          }
          console.log(`❌ Route failed: ${routes[i]}`);
        } catch (error) {
          console.log(`❌ Route error: ${routes[i]}`, error);
          if (i === routes.length - 1) {
            throw error; // Rethrow on last attempt
          }
        }
      }

      if (data) {
        console.log('📅 Doctor working days data:', data);

        const days = Array.isArray(data.working_days) ? data.working_days : (Array.isArray(data.workingDays) ? data.workingDays : null);
        if (data.success && Array.isArray(days)) {
          console.log('✅ Received doctor working days:', days);

          // If no working days found, use default schedule (Sunday to Thursday)
          const workingDays = days.length > 0 ? days.map((d: any) => Number(d)) : [0, 1, 2, 3, 4];

          if (days.length === 0) {
            console.warn('⚠️ No schedules found for this doctor. Using default working days (Sun-Thu)');
          }

          setDoctorWorkingDays(workingDays);

          // Generate available dates for the next 30 days based on working days
          const availableDates = [];
          const startDate = new Date();

          for (let i = 0; i < 30; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dayOfWeek = date.getDay();

            if (workingDays.includes(dayOfWeek)) {
              availableDates.push(date.toISOString().split('T')[0]);
            }
          }

          setAvailableDates(availableDates);
        } else {
          console.log('❌ Invalid response structure');
          // Use default schedule as fallback
          console.warn('⚠️ Using default working days (Sun-Thu) as fallback');
          setDoctorWorkingDays([0, 1, 2, 3, 4]);

          const availableDates = [];
          const startDate = new Date();
          for (let i = 0; i < 30; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dayOfWeek = date.getDay();
            if ([0, 1, 2, 3, 4].includes(dayOfWeek)) {
              availableDates.push(date.toISOString().split('T')[0]);
            }
          }
          setAvailableDates(availableDates);
        }
      } else {
        console.error('Failed to fetch doctor availability - all routes failed');
        // Use default schedule as fallback
        console.warn('⚠️ Using default working days (Sun-Thu) as fallback');
        setDoctorWorkingDays([0, 1, 2, 3, 4]);

        const availableDates = [];
        const startDate = new Date();
        for (let i = 0; i < 30; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          const dayOfWeek = date.getDay();
          if ([0, 1, 2, 3, 4].includes(dayOfWeek)) {
            availableDates.push(date.toISOString().split('T')[0]);
          }
        }
        setAvailableDates(availableDates);
      }
    } catch (error) {
      console.error('Error fetching doctor availability:', error);
      setAvailableDates([]);
      setDoctorWorkingDays([]);
    }
  };

  // Enhanced available slots fetching with center support
  const fetchAvailableSlots = async (doctorId: string, date: Date) => {
    setLoadingAvailability(true);
    try {
      // Format date in local timezone to prevent date shift
      const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const dateString = formatDateForAPI(date);

      console.log('🔍 Fetching available slots - Doctor:', doctorId, 'Date:', dateString, 'Center:', selectedCenter?.id, 'Location:', selectedLocation);

      // Build query parameters
      const params = new URLSearchParams();
      params.set('doctorId', doctorId);
      params.set('date', dateString);

      // Only add center_id for clinic visits
      if (selectedLocation === "clinic" && selectedCenter?.id) {
        params.set('center_id', selectedCenter.id);
      }

      // Try multiple route variants for Vercel compatibility
      const routes = [
        `/api/doctor-available-slots?${params.toString()}`,
        `/api/doctor-schedule/${doctorId}/available-slots?date=${dateString}${selectedCenter?.id ? `&center_id=${selectedCenter.id}` : ''}`
      ];

      let result = null;
      for (let i = 0; i < routes.length; i++) {
        try {
          console.log(`Trying route ${i + 1}/${routes.length}: ${routes[i]}`);
          const response = await fetch(routes[i]);
          if (response.ok) {
            result = await response.json();
            console.log('✅ Route worked:', routes[i]);
            break;
          }
          console.log(`❌ Route failed: ${routes[i]}`);
        } catch (error) {
          console.log(`❌ Route error: ${routes[i]}`, error);
          if (i === routes.length - 1) {
            throw error;
          }
        }
      }

      if (result && result.success) {
        console.log('📅 Available slots result:', result);
        // Handle both response formats (slots or available_slots)
        const slots = result.slots || result.available_slots || [];
        console.log('📅 Setting slots:', slots);
        setAvailableSlots(slots);
        setBookedSlots(result.booked_slots || []);
        setActualConsultationFee(result.consultation_fee || selectedDoctor?.consultation_fee || 0);
      } else {
        console.error('❌ Failed to fetch available slots:', result);
        setAvailableSlots([]);
        setBookedSlots([]);
      }
    } catch (error) {
      console.error('❌ Error fetching available slots:', error);
      setAvailableSlots([]);
      setBookedSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Labs: fetch available dates for selected type and center
  const fetchLabAvailableDates = async (centerId: string, typeId: string) => {
    try {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const res = await labService.getAvailableDates(centerId, typeId, { start_date: fmt(startDate), end_date: fmt(endDate) });
      console.log('📅 Lab available dates response:', res);
      const dates = (res as any)?.available_dates || (res as any)?.data?.available_dates || [];
      console.log('📅 Parsed available dates:', dates);
      setLabAvailableDates(dates.map((d: any) => d.date || d));
    } catch (e) {
      console.error('Error fetching lab available dates:', e);
      setLabAvailableDates([]);
    }
  };

  // Labs: fetch available slots for a given date, center and type
  const fetchLabAvailableSlots = async (centerId: string, typeId: string, date: Date) => {
    setLoadingAvailability(true);
    try {
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dateString = fmt(date);
      const res = await labService.getAvailableSlots(centerId, typeId, dateString);
      const data = (res as any)?.data || res;

      console.log('🔍 Lab slots response:', data);

      // Handle the new API response format with available_slots array
      const availableSlots = data?.available_slots || [];
      console.log('🔍 Available slots from API:', availableSlots);

      // Extract booked slots (where is_available is false)
      const bookedTimes = availableSlots
        .filter((slot: any) => !slot.is_available)
        .map((slot: any) => slot.time);

      setBookedSlots(bookedTimes);

      // Set the slots directly since they already have the correct format
      setAvailableSlots(availableSlots.map((slot: any) => ({
        time: slot.time,
        is_available: slot.is_available,
        is_booked: !slot.is_available
      })));

      console.log('✅ Set available slots:', availableSlots.length);

      // Optionally set fee if provided
      const fee = data?.fee || data?.serviceFee || data?.consultationFee || 0;
      if (fee) setActualConsultationFee(Number(fee));
    } catch (e) {
      console.error('Error fetching lab available slots:', e);
      setAvailableSlots([]);
      setBookedSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Labs: choose type+center and move to Step 3
  const handleLabProceed = async (type: LabTestType, center: Center) => {
    setSelectedLabType(type);
    setSelectedCenter(center);
    setSelectedDoctor(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setAvailableSlots([]);
    setLabAvailableDates([]);

    // Get the fee for this specific test type at this center
    try {
      const centerServicesRes = await labService.getCenterServices(center.id);
      const services = centerServicesRes?.services || [];
      const service = services.find((s: any) => s.lab_test_type_id === type.id);
      const fee = service?.base_fee || service?.lab_test_types?.default_fee || 0;
      setActualConsultationFee(fee);
      console.log(`[BookingModal] Set lab fee for ${type.name} at ${center.name}: $${fee}`);
    } catch (error) {
      console.error('Error fetching center services for fee:', error);
      setActualConsultationFee(0);
    }

    await fetchLabAvailableDates(center.id, type.id);
    setCurrentStep(3);
  };

  // NEW: Labs flow - step 1: choose center and move to step 2
  // NEW: Labs flow - step 1: choose center and move to step 2
  const handleLabCenterSelect = async (center: Center) => {
    setSelectedCenter(center);
    setSelectedLabType(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setAvailableSlots([]);
    setLabAvailableDates([]);

    console.log('[BookingModal] Lab Step 1 -> Step 2: Selected center:', center.name);
    setCurrentStep(2);
    setLoading(true);
    await fetchLabTypesForCenter(center.id);
    setLoading(false);
  };

  // NEW: Labs flow - step 2: choose test type and move to step 3
  const handleLabTypeSelect = async (type: LabTestType) => {
    setSelectedLabType(type);
    setSelectedDate(undefined);
    setSelectedTime("");
    setAvailableSlots([]);
    setLabAvailableDates([]);

    // Get the fee for this specific test type at this center
    try {
      const centerServicesRes = await labService.getCenterServices(selectedCenter!.id);
      const services = centerServicesRes?.services || [];
      const service = services.find((s: any) => s.lab_test_type_id === type.id);
      const fee = service?.base_fee || service?.lab_test_types?.default_fee || 0;
      setActualConsultationFee(fee);
      console.log(`[BookingModal] Set lab fee for ${type.name} at ${selectedCenter!.name}: $${fee}`);
    } catch (error) {
      console.error('Error fetching center services for fee:', error);
      setActualConsultationFee(0);
    }

    console.log('[BookingModal] Lab Step 2 -> Step 3: Selected test type:', type.name);
    await fetchLabAvailableDates(selectedCenter!.id, type.id);
    setCurrentStep(3);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime("");
    if (date) {
      if (isLabMode && selectedCenter && selectedLabType) {
        fetchLabAvailableSlots(selectedCenter.id, selectedLabType.id, date);
      } else if (!isLabMode && selectedDoctor) {
        fetchAvailableSlots(selectedDoctor.id, date);
      }
    }
  };

  // Step navigation handlers (updated for 4-step flow)
  const handleSpecialtySelect = async () => {
    if (selectedSpecialty && selectedLocation && searchMethod) {
      console.log('[BookingModal] Step1 -> Step2', { selectedSpecialty, selectedLocation, searchMethod });

      if (searchMethod === "centers") {
        // Fetch centers that have doctors with this specialty
        await fetchCentersBySpecialty(selectedSpecialty, selectedLocation);
      } else {
        // Original flow: fetch doctors directly
        await fetchDoctorsBySpecialty(selectedSpecialty, selectedLocation);
      }

      setCurrentStep(2);
    }
  };

  const handleDoctorSelect = async (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setSelectedCenter(null); // Reset center selection
    setDoctorCenters([]); // Reset centers
    setSelectedDate(undefined);
    setSelectedTime("");
    setAvailableSlots([]);
    setAvailableDates([]);
    setDoctorWorkingDays([]);

    console.log('[BookingModal] Step2 -> Step3/4', { doctorId: doctor.id, visitType: selectedLocation });

    // For home visits, skip center selection and go directly to step 4 (schedule)
    if (selectedLocation === "home") {
      // For home visits, we don't need to select a center
      // Fetch working days without a center (home visits don't require a center)
      await fetchDoctorWorkingDays(doctor.id);
      setCurrentStep(4);
    } else if (selectedLocation === "clinic") {
      // For clinic visits, fetch centers and show step 3
      await fetchDoctorCenters(doctor.id, selectedLocation);
      setCurrentStep(3);
    }
  };

  // Handle center selection in "Find Centers" flow - moves to step 3 to show doctors
  const handleCenterSelectForDoctors = async (center: Center) => {
    setSelectedCenter(center);
    setDoctors([]);
    setSelectedDoctor(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setAvailableSlots([]);
    setAvailableDates([]);
    setDoctorWorkingDays([]);

    console.log('[BookingModal] Centers Flow Step2 -> Step3', { centerId: center.id, specialty: selectedSpecialty });
    if (selectedSpecialty && selectedLocation) {
      await fetchDoctorsByCenter(center.id, selectedSpecialty, selectedLocation);
    }
    setCurrentStep(3);
  };

  // Handle doctor selection in "Find Centers" flow - moves to step 4 (schedule)
  const handleDoctorSelectFromCenter = async (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setSelectedDate(undefined);
    setSelectedTime("");
    setAvailableSlots([]);
    setAvailableDates([]);
    setDoctorWorkingDays([]);

    console.log('[BookingModal] Centers Flow Step3 -> Step4', { doctorId: doctor.id, centerId: selectedCenter?.id, visitType: selectedLocation });

    // For home visits, we don't need the center - fetch working days without center
    // For clinic visits, use the selected center
    if (selectedLocation === "home") {
      await fetchDoctorWorkingDays(doctor.id);
    } else if (selectedCenter) {
      await fetchDoctorWorkingDays(doctor.id, selectedCenter.id);
    }
    setCurrentStep(4);
  };

  const handleCenterSelect = async (center: Center) => {
    setSelectedCenter(center);
    setSelectedDate(undefined);
    setSelectedTime("");
    setAvailableSlots([]);
    setAvailableDates([]);
    setDoctorWorkingDays([]);

    console.log('[BookingModal] Step3 -> Step4', { centerId: center.id, doctorId: selectedDoctor?.id });
    // Fetch doctor's working days for this specific center
    if (selectedDoctor) {
      await fetchDoctorWorkingDays(selectedDoctor.id, center.id);
    }
    setCurrentStep(4);
  };

  const handleBookAppointment = async () => {
    console.log('🚀 Starting appointment booking...');
    console.log('Auth status:', { isAuthenticated, user: !!user });

    // Check authentication
    if (!isAuthenticated || !user) {
      console.log('❌ User not authenticated, redirecting to login');
      // Store complete booking state for post-login restoration
      localStorage.setItem('bookingData', JSON.stringify({
        specialty: selectedSpecialty,
        location: selectedLocation,
        doctor: selectedDoctor,
        center: selectedCenter,
        date: selectedDate?.toISOString(),
        time: selectedTime,
        step: 4
      }));
      router.push('/login?redirect=booking');
      onClose();
      return;
    }

    // Enhanced authentication checks
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (!storedToken) {
      console.error('❌ No auth token found in localStorage');
      showError(
        t('booking_error_auth') || "Authentication Error",
        t('booking_error_please_login') || "Please log in again.",
        () => router.push('/login')
      );
      return;
    }

    if (!storedUser) {
      console.error('❌ No user data found in localStorage');
      showError(
        t('booking_error_auth') || "Authentication Error",
        t('booking_error_user_not_found') || "User data not found. Please log in again.",
        () => router.push('/login')
      );
      return;
    }

    // Parse and validate user data
    let userData;
    try {
      userData = JSON.parse(storedUser);
      console.log('👤 Current user data:', userData);
    } catch (error) {
      console.error('❌ Invalid user data in localStorage:', error);
      showError(
        t('booking_error_auth') || "Authentication Error",
        t('booking_error_invalid_user') || "Invalid user data. Please log in again.",
        () => router.push('/login')
      );
      return;
    }

    if (!isLabMode && (!selectedDoctor || !selectedDate || !selectedTime)) {
      console.error('❌ Missing required booking data');
      showError(
        t('booking_error_missing_info') || "Missing Information",
        t('booking_error_select_doctor_date_time') || "Please select a doctor, date, and time"
      );
      return;
    }

    if (isLabMode && (!selectedLabType || !selectedCenter || !selectedDate || !selectedTime)) {
      console.error('❌ Missing required lab booking data');
      showError(
        t('booking_error_missing_info') || "Missing Information",
        t('booking_error_select_test_center_date_time') || "Please select a test, center, date, and time"
      );
      return;
    }

    setLoading(true);
    console.log('📋 Booking data validation passed');

    // Helper function for date formatting
    const formatDateForAPI = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    try {
      const dateString = formatDateForAPI(selectedDate!);

      if (isLabMode) {
        // Labs: pre-booking validation via available slots endpoint
        const res = await labService.getAvailableSlots(selectedCenter!.id, selectedLabType!.id, dateString);
        const data = (res as any)?.data || res;

        // Handle the new API response format with available_slots array
        const availableSlots = data?.available_slots || [];
        console.log('🔍 Booking validation - available slots:', availableSlots);

        // Extract available times from the slots array
        const availableTimes = availableSlots
          .filter((slot: any) => slot.is_available)
          .map((slot: any) => slot.time);

        console.log('🔍 Booking validation - available times:', availableTimes);
        console.log('🔍 Booking validation - selected time:', selectedTime);

        if (!availableTimes.includes(selectedTime)) {
          showError(
            "Slot No Longer Available",
            "Sorry, this time slot was just booked by another patient. Please select a different time.",
            () => {
              if (selectedCenter && selectedLabType && selectedDate) {
                fetchLabAvailableSlots(selectedCenter.id, selectedLabType.id, selectedDate);
                setSelectedTime("");
              }
            }
          );
          setLoading(false);
          return;
        }

        const result = await labService.book({
          center_id: selectedCenter!.id,
          lab_test_type_id: selectedLabType!.id,
          booking_date: dateString,
          booking_time: selectedTime,
          notes: symptoms.trim() || '',
          fee: actualConsultationFee || undefined
        });

        if (result && (result as any).success !== false) {
          if (selectedCenter && selectedLabType && selectedDate) {
            await fetchLabAvailableSlots(selectedCenter.id, selectedLabType.id, selectedDate);
          }
          setSelectedTime("");
          showSuccess(
            t('booking_success') || "Success!",
            t('booking_success_lab_test') || "Lab test booked successfully!",
            () => {
              onClose();
              resetModal();
            }
          );
          return;
        }
      } else {
        // Doctor appointment flow (existing)
        // ENHANCED: Pre-booking validation - check if the slot is still available
        console.log('🔍 Performing pre-booking slot validation...');

        // Build query parameters
        const validationParams = new URLSearchParams();
        validationParams.set('doctorId', selectedDoctor!.id);
        validationParams.set('date', dateString);

        // Only add center_id for clinic visits
        if (selectedLocation === "clinic" && selectedCenter?.id) {
          validationParams.set('center_id', selectedCenter.id);
        }

        // Try multiple route variants for Vercel compatibility
        const validationRoutes = [
          `/api/doctor-available-slots?${validationParams.toString()}`,
          `/api/doctor-schedule/${selectedDoctor!.id}/available-slots?date=${dateString}${selectedCenter?.id ? `&center_id=${selectedCenter.id}` : ''}`
        ];

        let validationResult = null;
        for (let i = 0; i < validationRoutes.length; i++) {
          try {
            console.log(`Trying validation route ${i + 1}/${validationRoutes.length}: ${validationRoutes[i]}`);
            const validationResponse = await fetch(validationRoutes[i]);
            if (validationResponse.ok) {
              validationResult = await validationResponse.json();
              console.log('✅ Validation route worked:', validationRoutes[i]);
              break;
            }
            console.log(`❌ Validation route failed: ${validationRoutes[i]}`);
          } catch (error) {
            console.log(`❌ Validation route error: ${validationRoutes[i]}`, error);
            if (i === validationRoutes.length - 1) {
              console.warn('⚠️ All validation routes failed, proceeding with booking...');
            }
          }
        }

        if (validationResult && validationResult.success) {
          // Handle both response formats (slots or available_slots)
          const slotsArray = validationResult.slots || validationResult.available_slots || [];
          const availableSlotTimes = slotsArray
            .filter((slot: any) => slot.is_available && !slot.is_booked)
            .map((slot: any) => slot.time);

          console.log('🔍 Current available slots:', availableSlotTimes);
          console.log('🔍 Selected time:', selectedTime);

          if (!availableSlotTimes.includes(selectedTime)) {
            console.error('❌ Selected slot is no longer available');
            showError(
              t('booking_error_slot_unavailable') || "Slot No Longer Available",
              t('booking_error_slot_just_booked') || "Sorry, this time slot was just booked by another patient. Please select a different time.",
              () => {
                // Refresh available slots
                fetchAvailableSlots(selectedDoctor!.id, selectedDate!);
                setSelectedTime(""); // Clear the invalid selection
              }
            );
            setLoading(false);
            return;
          }

          console.log('✅ Pre-booking validation passed - slot is still available');
        } else {
          console.warn('⚠️ Could not validate slot availability, proceeding with booking...');
        }

        // Prepare booking request data with enhanced logging and center support
        const requestData = {
          doctor_id: selectedDoctor!.id,
          center_id: selectedCenter?.id, // Include center for the appointment
          appointment_date: dateString,
          appointment_time: selectedTime,
          type: 'consultation',
          appointment_type: selectedLocation, // "clinic" or "home"
          duration: 30,
          symptoms: symptoms.trim() || '',
          consultation_fee: actualConsultationFee || selectedDoctor!.consultation_fee || 0
        };

        console.log('📤 Booking appointment with enhanced debugging:');
        console.log('📤 User data:', userData);
        console.log('📤 Doctor data:', selectedDoctor);
        console.log('📤 Request data:', requestData);
        console.log('📤 Token exists:', !!storedToken);

        const result = await appointmentService.book({ ...requestData, center_id: selectedCenter?.id });
        console.log('✅ Response result:', result);

        if (result && (result as any).success !== false) {
          // Refresh available slots to reflect the new booking
          if (selectedDoctor && selectedDate) {
            await fetchAvailableSlots(selectedDoctor.id, selectedDate);
          }

          // Clear the selected time since it's now booked
          setSelectedTime("");

          showSuccess(
            t('booking_success') || "Success!",
            t('booking_success_appointment') || "Appointment booked successfully!",
            () => {
              onClose();
              resetModal();
            }
          );
          return;
        }
      }

      throw new Error('Unknown error from server');

    } catch (error: any) {
      console.error('❌ Error booking appointment:', error);

      // Enhanced error handling with specific messages
      let errorMessage = t('booking_error_message');
      let errorTitle = t('booking_error_title');

      if (error.response) {
        console.error('❌ HTTP Error Response:', error.response.status, error.response.data);

        switch (error.response.status) {
          case 400:
            errorTitle = t('booking_error_invalid_request');
            errorMessage = error.response.data?.error || t('booking_error_invalid_data');
            break;
          case 401:
            errorTitle = t('booking_error_auth_required') || "Authentication Required";
            errorMessage = t('booking_error_unauthorized');
            break;
          case 403:
            errorTitle = t('booking_error_permission_denied') || "Permission Denied";
            errorMessage = error.response.data?.error || t('booking_error_forbidden');
            break;
          case 404:
            errorTitle = t('booking_error_not_found') || "Not Found";
            errorMessage = error.response.data?.error || t('booking_error_not_found');
            break;
          case 409:
            errorTitle = t('booking_error_slot_unavailable');
            errorMessage = t('booking_error_slot_booked');
            // Refresh available slots when there's a conflict
            if (selectedDoctor && selectedDate) {
              fetchAvailableSlots(selectedDoctor.id, selectedDate);
              setSelectedTime(""); // Clear the conflicting selection
            }
            break;
          case 500:
            errorTitle = t('booking_error_server') || "Server Error";
            errorMessage = t('booking_error_server');
            break;
          default:
            errorMessage = error.response.data?.error || `HTTP Error ${error.response.status}`;
        }
      } else if (error.message) {
        errorMessage = error.message;

        // Check for specific booking conflict message
        if (error.message.includes("This time slot is already booked") && selectedDoctor && selectedDate) {
          // Refresh available slots when there's a conflict
          fetchAvailableSlots(selectedDoctor.id, selectedDate);
          setSelectedTime(""); // Clear the conflicting selection
          errorTitle = t('booking_error_slot_unavailable') || "Slot Unavailable";
          errorMessage = t('booking_error_slot_just_booked') || "This time slot was just booked. Please select a different time.";
        }
      }

      showError(errorTitle, errorMessage);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        showError(
          t('booking_error_network') || "Network Error",
          t('booking_error_network_connection') || "Unable to connect to server. Please check your connection."
        );
      } else if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.message || error.response.data?.error || 'Server error occurred';

        if (status === 401) {
          showError(
            t('booking_error_auth_expired') || "Authentication Expired",
            t('booking_error_please_login') || "Please log in again.",
            () => router.push('/login')
          );
        } else {
          showError(
            t('booking_error_booking_failed') || "Booking Failed",
            errorMessage
          );
        }
      } else if (error.message) {
        showError(
          t('booking_error_booking_failed') || "Booking Failed",
          error.message
        );
      } else {
        showError(
          t('booking_error_booking_failed') || "Booking Failed",
          t('booking_error_unexpected') || "An unexpected error occurred. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setCurrentStep(1);
    setSelectedSpecialty("");
    setSelectedLocation("");
    setSearchMethod("");
    setCenters([]);
    setDoctors([]);
    setSelectedDoctor(null);
    setDoctorCenters([]);
    setSelectedCenter(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setSymptoms("");
    setAvailableSlots([]);
    setAvailableDates([]);
    setDoctorWorkingDays([]);
    setLabAvailableDates([]);
    setActualConsultationFee(0);
    setBookedSlots([]);
    setIsLabMode(false);
    setLabTypes([]);
    setLabCentersByType({});
    setSelectedLabType(null);
    setLabCenters([]);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden border-2 border-[#4DBCC4]/20 dark:border-[#4DBCC4]/40 p-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-2xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                duration: 0.4,
                bounce: 0.25
              }}
              className="rounded-2xl overflow-hidden"
            >
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] p-6 text-white border-b-4 border-[#3da8b0]"
              >
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-center text-white drop-shadow-md">
                    {isLabMode ? t('lab_booking_title') : t('booking_modal_title')}
                  </DialogTitle>
                </DialogHeader>
              </motion.div>

              <div className="p-6 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-900">
                {/* Mode Toggle */}
                <div className="flex justify-center mb-6 gap-3">
                  <Button
                    variant={!isLabMode ? 'default' : 'outline'}
                    onClick={() => handleModeToggle('doctor')}
                    className={!isLabMode
                      ? 'bg-[#4DBCC4] hover:bg-[#3da8b0] text-white shadow-md border-2 border-[#4DBCC4] dark:bg-[#4DBCC4] dark:hover:bg-[#3da8b0]'
                      : 'border-2 border-gray-300 dark:border-gray-600 hover:border-[#4DBCC4] dark:hover:border-[#4DBCC4] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}
                  >
                    {t('header_doctors')}
                  </Button>
                  <Button
                    variant={isLabMode ? 'default' : 'outline'}
                    onClick={() => handleModeToggle('lab')}
                    className={isLabMode
                      ? 'bg-[#4DBCC4] hover:bg-[#3da8b0] text-white shadow-md border-2 border-[#4DBCC4] dark:bg-[#4DBCC4] dark:hover:bg-[#3da8b0]'
                      : 'border-2 border-gray-300 dark:border-gray-600 hover:border-[#4DBCC4] dark:hover:border-[#4DBCC4] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}
                  >
                    {t('cd_lab_test_services')}
                  </Button>
                </div>
                {/* Debug Info - Remove after testing */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mb-4">
                    Step: {toArabicNumerals(currentStep.toString(), locale)} | Mode: {isLabMode ? 'Lab' : 'Doctor'} | Search: {searchMethod} |
                    Doctor: {selectedDoctor ? '✓' : '✗'} | Center: {selectedCenter ? '✓' : '✗'} |
                    Location: {selectedLocation || 'none'}
                  </div>
                )}

                {/* Step Indicator */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="flex justify-center mb-8"
                >
                  <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''} gap-0`}>
                    {(isLabMode ? [1, 2, 3] : [1, 2, 3, 4]).map((step, index, array) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 200 }}
                        className="flex items-center"
                      >
                        <motion.div
                          className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-md
                            ${currentStep >= step
                              ? 'bg-gradient-to-br from-[#4DBCC4] to-[#3da8b0] text-white ring-4 ring-[#4DBCC4]/30'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
                          whileHover={{ scale: 1.1 }}
                          animate={currentStep >= step ? { scale: [1, 1.08, 1] } : {}}
                          transition={{ duration: 0.4 }}
                        >
                          {toArabicNumerals(step.toString(), locale)}
                        </motion.div>
                        {index < array.length - 1 && (
                          <motion.div
                            className={`w-12 h-1.5 mx-2 rounded-full transition-all duration-500 ${currentStep > step ? 'bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0]' : 'bg-gray-300 dark:bg-gray-700'}`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: currentStep > step ? 1 : 0 }}
                            style={{ originX: isRTL ? 1 : 0 }}
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Step 1: Specialty and Location Selection (Doctor mode) */}
                {!isLabMode && currentStep === 1 && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xl font-bold mb-5 text-gray-900 dark:text-white">{t('auth_medical_specialty_label')}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {loadingSpecialties ? (
                          <div className="col-span-full text-center py-8">
                            <div className="text-gray-700 dark:text-gray-300 font-medium text-lg">{t('auth_loading_specialties')}</div>
                          </div>
                        ) : (
                          specialties.map((specialty) => (
                            <Card
                              key={specialty.id}
                              className={`cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 ${selectedSpecialty === specialty.name
                                ? 'ring-4 ring-[#4DBCC4] bg-gradient-to-br from-[#4DBCC4]/10 to-[#4DBCC4]/5 dark:from-[#4DBCC4]/20 dark:to-[#4DBCC4]/10 border-2 border-[#4DBCC4] shadow-lg'
                                : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-[#4DBCC4] dark:hover:border-[#4DBCC4]'
                                }`}
                              onClick={async () => {
                                setSelectedSpecialty(specialty.name);
                                // If home visit is already selected, automatically fetch doctors and proceed
                                if (selectedLocation === "home") {
                                  setSearchMethod("doctors");
                                  await fetchDoctorsBySpecialty(specialty.name, "home");
                                  setCurrentStep(2);
                                }
                              }}
                            >
                              <CardContent className="p-5 text-center">
                                <div className={`text-base font-semibold ${selectedSpecialty === specialty.name ? 'text-[#4DBCC4] dark:text-[#4DBCC4]' : 'text-gray-800 dark:text-gray-200'}`}>
                                  {getLocalizedName(specialty)}
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold mb-5 text-gray-900 dark:text-white">{t('booking_select_visit_type')}</h3>
                      <div className="grid grid-cols-2 gap-5">
                        <Card
                          className={`cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 ${selectedLocation === "clinic"
                            ? 'ring-4 ring-[#4DBCC4] bg-gradient-to-br from-[#4DBCC4]/10 to-[#4DBCC4]/5 dark:from-[#4DBCC4]/20 dark:to-[#4DBCC4]/10 border-2 border-[#4DBCC4] shadow-lg'
                            : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-[#4DBCC4] dark:hover:border-[#4DBCC4]'
                            }`}
                          onClick={() => setSelectedLocation("clinic")}
                        >
                          <CardContent className="p-7 text-center">
                            <MapPin className={`w-10 h-10 mx-auto mb-3 ${selectedLocation === "clinic" ? 'text-[#4DBCC4]' : 'text-gray-600 dark:text-gray-400'}`} />
                            <div className={`font-bold text-lg ${selectedLocation === "clinic" ? 'text-[#4DBCC4] dark:text-[#4DBCC4]' : 'text-gray-800 dark:text-gray-200'}`}>
                              {t('booking_clinic_visit')}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-2">{t('appointments_type_clinic_consultation')}</div>
                          </CardContent>
                        </Card>

                        <Card
                          className={`cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 ${selectedLocation === "home"
                            ? 'ring-4 ring-[#4DBCC4] bg-gradient-to-br from-[#4DBCC4]/10 to-[#4DBCC4]/5 dark:from-[#4DBCC4]/20 dark:to-[#4DBCC4]/10 border-2 border-[#4DBCC4] shadow-lg'
                            : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-[#4DBCC4] dark:hover:border-[#4DBCC4]'
                            }`}
                          onClick={async () => {
                            setSelectedLocation("home");
                            // For home visits, automatically set search method to "doctors" and proceed
                            setSearchMethod("doctors");
                            // If specialty is already selected, automatically fetch doctors and proceed
                            if (selectedSpecialty) {
                              await fetchDoctorsBySpecialty(selectedSpecialty, "home");
                              setCurrentStep(2);
                            }
                          }}
                        >
                          <CardContent className="p-7 text-center">
                            <Home className={`w-10 h-10 mx-auto mb-3 ${selectedLocation === "home" ? 'text-[#4DBCC4]' : 'text-gray-600 dark:text-gray-400'}`} />
                            <div className={`font-bold text-lg ${selectedLocation === "home" ? 'text-[#4DBCC4] dark:text-[#4DBCC4]' : 'text-gray-800 dark:text-gray-200'}`}>
                              {t('booking_home_visit')}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-2">{t('appointments_type_home_visit')}</div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Search Method Selection - Only show after specialty and location are selected, but skip for home visits */}
                    {selectedSpecialty && selectedLocation && !searchMethod && selectedLocation !== "home" && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <h3 className="text-xl font-bold mb-5 text-gray-900 dark:text-white">{t('booking_how_find_doctor') || 'How would you like to find your doctor?'}</h3>
                        <div className="grid grid-cols-2 gap-5">
                          <Card
                            className="cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-[#4DBCC4] dark:hover:border-[#4DBCC4] hover:ring-2 hover:ring-[#4DBCC4]/50"
                            onClick={() => setSearchMethod("centers")}
                          >
                            <CardContent className="p-7 text-center">
                              <MapPin className="w-10 h-10 mx-auto mb-3 text-[#4DBCC4]" />
                              <div className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-2">{t('booking_find_centers') || 'Find Centers'}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t('booking_find_centers_desc') || 'Browse medical centers first, then view their doctors'}</div>
                            </CardContent>
                          </Card>

                          <Card
                            className="cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-105 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-[#4DBCC4] dark:hover:border-[#4DBCC4] hover:ring-2 hover:ring-[#4DBCC4]/50"
                            onClick={() => setSearchMethod("doctors")}
                          >
                            <CardContent className="p-7 text-center">
                              <Home className="w-10 h-10 mx-auto mb-3 text-[#4DBCC4]" />
                              <div className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-2">{t('booking_find_doctors') || 'Find Doctors'}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t('booking_find_doctors_desc') || 'Browse doctors directly based on your specialty'}</div>
                            </CardContent>
                          </Card>
                        </div>
                      </motion.div>
                    )}

                    <Button
                      onClick={handleSpecialtySelect}
                      disabled={!selectedSpecialty || !selectedLocation || (!searchMethod && selectedLocation !== "home")}
                      className="w-full bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] hover:from-[#3da8b0] hover:to-[#4DBCC4] disabled:from-gray-400 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed"
                      size="lg"
                    >
                      {selectedLocation === "home" ? (t('booking_find_doctors') || 'Find Doctors') : searchMethod === "centers" ? (t('booking_find_centers') || 'Find Centers') : searchMethod === "doctors" ? (t('booking_find_doctors') || 'Find Doctors') : (t('booking_next') || 'Next')}
                    </Button>
                  </div>
                )}

                {/* Step 2: Center Selection (Find Centers flow) or Doctor Selection (Find Doctors flow) */}
                {!isLabMode && currentStep === 2 && searchMethod === "centers" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap bg-gradient-to-r from-[#4DBCC4]/10 to-[#3da8b0]/10 dark:from-[#4DBCC4]/20 dark:to-[#3da8b0]/20 p-4 rounded-lg border-l-4 border-[#4DBCC4]">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('booking_select_medical_center') || 'Select Medical Center'}</h3>
                        <div className="text-base text-gray-700 dark:text-gray-300 font-medium">{getLocalizedSpecialtyName(selectedSpecialty)} • {selectedLocation === 'home' ? (t('booking_home_visit') || 'Home Visit') : (t('booking_clinic_visit') || 'Clinic Visit')}</div>
                      </div>
                      <div className="flex-1 min-w-[240px]">
                        <input
                          value={centerFilter}
                          onChange={(e) => setCenterFilter(e.target.value)}
                          placeholder={t('booking_search_center_placeholder') || 'Search center name or location...'}
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-[#4DBCC4] focus:ring-2 focus:ring-[#4DBCC4]/20 transition-all"
                        />
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-300 dark:border-gray-600 border-t-[#4DBCC4] mb-4"></div>
                        <div className="text-lg text-gray-700 dark:text-gray-300 font-medium">{t('booking_loading_centers') || 'Loading centers...'}</div>
                      </div>
                    ) : (
                      <div className="grid gap-5 max-h-96 overflow-y-auto pr-2">
                        {centers
                          .filter((center) => {
                            const filterQuery = (centerFilter || '').toLowerCase();
                            return !filterQuery ||
                              center.name.toLowerCase().includes(filterQuery) ||
                              (center.name_ar || '').toLowerCase().includes(filterQuery) ||
                              (center.address || '').toLowerCase().includes(filterQuery);
                          })
                          .map((center) => (
                            <Card key={center.id} className="transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-[#4DBCC4] dark:hover:border-[#4DBCC4]">
                              <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between gap-4 mb-3">
                                      <div className="flex-1">
                                        <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{getLocalizedName(center)}</h4>
                                        <p className="text-base text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-1">
                                          <MapPin className="w-5 h-5 text-[#4DBCC4] flex-shrink-0" />
                                          <span>{center.address}</span>
                                        </p>
                                        {center.phone && (
                                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium ml-7">{center.phone}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="mt-4">
                                      <Button
                                        size="default"
                                        onClick={() => handleCenterSelectForDoctors(center)}
                                        className="bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] hover:from-[#3da8b0] hover:to-[#4DBCC4] text-white font-semibold shadow-md hover:shadow-lg transition-all"
                                      >
                                        {t('booking_view_doctors')}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        {centers.length === 0 && !loading && (
                          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                            <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                              {t('booking_no_centers_found') || 'No centers found with doctors in this specialty. Please try different filters.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(1)}
                      className="w-full border-2 border-gray-300 dark:border-gray-600 hover:border-[#4DBCC4] dark:hover:border-[#4DBCC4] bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold shadow-sm hover:shadow-md transition-all"
                    >
                      <ChevronLeft className="w-5 h-5 mr-2" />
                      {t('booking_back_to_search') || 'Back to Search Method'}
                    </Button>
                  </div>
                )}

                {/* Step 2: Doctor Selection (Find Doctors flow) */}
                {!isLabMode && currentStep === 2 && searchMethod === "doctors" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-[#4DBCC4]/10 to-[#3da8b0]/10 dark:from-[#4DBCC4]/20 dark:to-[#3da8b0]/20 p-4 rounded-lg border-l-4 border-[#4DBCC4]">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('booking_select_doctor') || 'Select Doctor'}</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">{getLocalizedSpecialtyName(selectedSpecialty)} • {selectedLocation === 'home' ? (t('booking_home_visit') || 'Home Visit') : (t('booking_clinic_visit') || 'Clinic Visit')}</div>
                      </div>
                      <div className="flex-1 min-w-[220px] grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          placeholder={t('booking_search_doctor_placeholder') || 'Search doctor name...'}
                          className="w-full px-3 py-2 rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-[#4DBCC4] focus:ring-2 focus:ring-[#4DBCC4]/20 transition-all"
                        />
                        <div className="flex gap-2">
                          <select
                            value={minRating}
                            onChange={(e) => setMinRating(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-[#4DBCC4] focus:ring-2 focus:ring-[#4DBCC4]/20 transition-all font-medium"
                          >
                            {[0, 3, 3.5, 4, 4.5, 5].map((r) => (<option key={r} value={r}>{t('booking_min_rating') || 'Min rating'} {r}</option>))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            placeholder={t('booking_max_fee_placeholder') || 'Max fee'}
                            value={maxFee}
                            onChange={(e) => setMaxFee(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-[#4DBCC4] focus:ring-2 focus:ring-[#4DBCC4]/20 transition-all font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-8 text-gray-600 dark:text-gray-400 font-medium">{t('booking_loading_doctors') || 'Loading doctors...'}</div>
                    ) : (
                      <div className="grid gap-4 max-h-96 overflow-y-auto">
                        {doctors
                          .filter((d) => {
                            const filterQuery = (filterText || '').toLowerCase();
                            const textMatch = !filterQuery || d.name.toLowerCase().includes(filterQuery) || (d.name_ar || '').toLowerCase().includes(filterQuery) || (d.first_name_ar || '').toLowerCase().includes(filterQuery) || (d.last_name_ar || '').toLowerCase().includes(filterQuery) || (d.specialty || '').toLowerCase().includes(filterQuery);
                            // Ensure rating is a number for proper comparison
                            const doctorRating = typeof d.rating === 'number' ? d.rating : (typeof d.rating === 'string' ? parseFloat(d.rating) || 0 : 0);
                            const minRatingValue = typeof minRating === 'number' ? minRating : parseFloat(String(minRating)) || 0;
                            const ratingMatch = doctorRating >= minRatingValue;
                            const feeLimit = parseFloat(maxFee as any);
                            const feeMatch = isNaN(feeLimit) ? true : (d.consultation_fee || 0) <= feeLimit;
                            return textMatch && ratingMatch && feeMatch;
                          })
                          .map((doctor) => (
                            <Card key={doctor.id} className="transition-all hover:shadow-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-[#4DBCC4]">
                              <CardContent className="p-5 bg-white dark:bg-gray-800">
                                <div className="flex items-start gap-4">
                                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex-shrink-0 ring-2 ring-gray-200 dark:ring-gray-600">
                                    <Image src={doctor.profile_picture || '/default-avatar.jpg'} alt={getLocalizedName(doctor)} fill className="object-cover" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate">{getLocalizedName(doctor)}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-0.5">{getLocalizedSpecialtyName(doctor.specialty)}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                          <div className="flex items-center bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{toArabicNumerals(doctor.rating || 0, locale)}</span>
                                          </div>
                                          <span className="text-gray-400 dark:text-gray-500">•</span>
                                          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{toArabicNumerals(doctor.experience_years || 0, locale)} {t('booking_years') || 'years'}</span>
                                        </div>
                                      </div>
                                      <div className="text-sm text-right flex-shrink-0">
                                        <div className="text-lg font-bold text-[#4DBCC4] dark:text-[#4DBCC4]">{formatCurrency(doctor.consultation_fee, locale)}</div>
                                        {selectedLocation === 'home' && doctor.home_available && (
                                          <Badge variant="secondary" className="mt-1 bg-[#4DBCC4]/10 text-[#4DBCC4] border-[#4DBCC4]/20">{t('booking_badge_home_visits') || 'Home visits'}</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="mt-3">
                                      <Button
                                        size="sm"
                                        onClick={() => handleDoctorSelect(doctor)}
                                        className="w-full bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] hover:from-[#3da8b0] hover:to-[#4DBCC4] text-white font-semibold shadow-md"
                                      >
                                        {t('booking_select_doctor')}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        {doctors.length === 0 && !loading && (
                          <div className="text-center py-8 text-gray-600 dark:text-gray-400 font-medium">
                            {t('booking_no_doctors_found') || 'No doctors found matching your criteria. Please try adjusting your filters.'}
                          </div>
                        )}
                      </div>
                    )}

                    <Button variant="outline" onClick={() => {
                      setCurrentStep(1);
                      setSearchMethod("");
                    }}>
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      {t('booking_back_to_search') || 'Back to Search Method'}
                    </Button>
                  </div>
                )}

                {/* Step 3: Doctor Selection within Center (Find Centers flow) */}
                {!isLabMode && currentStep === 3 && searchMethod === "centers" && selectedCenter && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-[#4DBCC4]/10 to-[#3da8b0]/10 dark:from-[#4DBCC4]/20 dark:to-[#3da8b0]/20 p-5 rounded-lg border-l-4 border-[#4DBCC4] shadow-sm">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('booking_select_doctor') || 'Select Doctor'}</h3>
                        <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                          {t('booking_at') || 'at'} <span className="font-semibold text-[#4DBCC4]">{getLocalizedName(selectedCenter)}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                          <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600">{getLocalizedSpecialtyName(selectedSpecialty)}</span>
                          <span>•</span>
                          <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600">
                            {selectedLocation === 'home' ? (t('booking_home_visit') || 'Home Visit') : (t('booking_clinic_visit') || 'Clinic Visit')}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(2)}
                        size="default"
                        className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:hover:bg-[#4DBCC4]/20 text-gray-900 dark:text-gray-100 font-semibold"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2 text-gray-900 dark:text-gray-100" />
                        {t('booking_back') || 'Back to Centers'}
                      </Button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        placeholder={t('booking_search_doctor_placeholder') || 'Search doctor name...'}
                        className="px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-[#4DBCC4] focus:ring-2 focus:ring-[#4DBCC4]/20 transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400 font-medium"
                      />
                      <select
                        value={minRating}
                        onChange={(e) => setMinRating(Number(e.target.value))}
                        className="px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-[#4DBCC4] focus:ring-2 focus:ring-[#4DBCC4]/20 transition-all font-medium"
                      >
                        {[0, 3, 3.5, 4, 4.5, 5].map((r) => (<option key={r} value={r}>{t('booking_min_rating') || 'Min rating'} {r}⭐</option>))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        placeholder={t('booking_max_fee_placeholder') || 'Max fee'}
                        value={maxFee}
                        onChange={(e) => setMaxFee(e.target.value)}
                        className="px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-[#4DBCC4] focus:ring-2 focus:ring-[#4DBCC4]/20 transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400 font-medium"
                      />
                    </div>

                    {loading ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-[#4DBCC4]"></div>
                        <p className="mt-4 text-gray-900 dark:text-gray-300 font-medium">{t('booking_loading_doctors') || 'Loading doctors...'}</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2">
                        {doctors
                          .filter((d) => {
                            const filterQuery = (filterText || '').toLowerCase();
                            const textMatch = !filterQuery || d.name.toLowerCase().includes(filterQuery) || (d.name_ar || '').toLowerCase().includes(filterQuery) || (d.first_name_ar || '').toLowerCase().includes(filterQuery) || (d.last_name_ar || '').toLowerCase().includes(filterQuery) || (d.specialty || '').toLowerCase().includes(filterQuery);
                            // Ensure rating is a number for proper comparison
                            const doctorRating = typeof d.rating === 'number' ? d.rating : (typeof d.rating === 'string' ? parseFloat(d.rating) || 0 : 0);
                            const minRatingValue = typeof minRating === 'number' ? minRating : parseFloat(String(minRating)) || 0;
                            const ratingMatch = doctorRating >= minRatingValue;
                            const feeLimit = parseFloat(maxFee as any);
                            const feeMatch = isNaN(feeLimit) ? true : (d.consultation_fee || 0) <= feeLimit;
                            return textMatch && ratingMatch && feeMatch;
                          })
                          .map((doctor) => (
                            <Card key={doctor.id} className="transition-all duration-200 hover:shadow-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-[#4DBCC4] hover:scale-[1.01] cursor-pointer group" onClick={() => handleDoctorSelectFromCenter(doctor)}>
                              <CardContent className="p-6 bg-white dark:bg-gray-800">
                                <div className="flex items-start gap-5">
                                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex-shrink-0 ring-2 ring-gray-200 dark:ring-gray-600 group-hover:ring-[#4DBCC4] transition-all">
                                    <Image src={doctor.profile_picture || '/default-avatar.jpg'} alt={getLocalizedName(doctor)} fill className="object-cover" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-1">{getLocalizedName(doctor)}</h4>
                                        <p className="text-base text-gray-600 dark:text-gray-400 font-medium">{getLocalizedSpecialtyName(doctor.specialty)}</p>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <div className="text-2xl font-bold text-[#4DBCC4] dark:text-[#4DBCC4]">{formatCurrency(doctor.consultation_fee, locale)}</div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('booking_consultation_fee') || 'Consultation'}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="flex items-center bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1.5 rounded-lg">
                                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mr-1.5" />
                                        <span className="text-base font-bold text-gray-900 dark:text-gray-100">{toArabicNumerals(doctor.rating || 0, locale)}</span>
                                      </div>
                                      <span className="text-gray-400 dark:text-gray-500">•</span>
                                      <span className="text-base text-gray-600 dark:text-gray-400 font-medium">{toArabicNumerals(doctor.experience_years || 0, locale)} {t('booking_years') || 'years'}</span>
                                      {selectedLocation === 'home' && doctor.home_available && (
                                        <>
                                          <span className="text-gray-400 dark:text-gray-500">•</span>
                                          <Badge variant="secondary" className="bg-[#4DBCC4]/10 text-[#4DBCC4] border-[#4DBCC4]/30 font-semibold">
                                            {t('booking_badge_home_visits') || 'Home visits'}
                                          </Badge>
                                        </>
                                      )}
                                    </div>
                                    <Button
                                      size="lg"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDoctorSelectFromCenter(doctor);
                                      }}
                                      className="w-full bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] hover:from-[#3da8b0] hover:to-[#4DBCC4] text-white font-bold shadow-md text-base py-3"
                                    >
                                      {t('booking_select_doctor')}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        {doctors.length === 0 && !loading && (
                          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                              <span className="text-3xl">👨‍⚕️</span>
                            </div>
                            <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                              {t('booking_no_doctors_found') || 'No doctors found at this center matching your criteria.'}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                              {t('booking_try_adjusting_filters') || 'Try adjusting your filters or select a different center.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Center Selection (Find Doctors flow) - Only show for clinic visits */}
                {!isLabMode && currentStep === 3 && searchMethod === "doctors" && selectedDoctor && selectedLocation === "clinic" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-[#4DBCC4]/10 to-[#3da8b0]/10 dark:from-[#4DBCC4]/20 dark:to-[#3da8b0]/20 p-5 rounded-lg border-l-4 border-[#4DBCC4] shadow-sm">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('booking_select_center') || 'Select Center'}</h3>
                        <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                          {t('booking_for') || 'for'} <span className="font-semibold text-[#4DBCC4]">{locale === 'ar' ? 'دكتور' : 'Dr.'} {getLocalizedName(selectedDoctor)}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                          <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600">{getLocalizedSpecialtyName(selectedSpecialty)}</span>
                          <span>•</span>
                          <span className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600">
                            {t('booking_clinic_visit') || 'Clinic Visit'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(2)}
                        size="default"
                        className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:hover:bg-[#4DBCC4]/20 text-gray-900 dark:text-gray-100 font-semibold"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2 text-gray-900 dark:text-gray-100" />
                        {t('booking_back') || 'Back to Doctors'}
                      </Button>
                    </div>

                    {loading ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-[#4DBCC4]"></div>
                        <p className="mt-4 text-gray-900 dark:text-gray-300 font-medium">{t('booking_loading_centers') || 'Loading available centers...'}</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2">
                        {doctorCenters.length > 0 ? (
                          doctorCenters.map((center) => (
                            <Card
                              key={center.id}
                              className="transition-all duration-200 hover:shadow-xl cursor-pointer bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-[#4DBCC4] hover:scale-[1.01] group"
                              onClick={() => handleCenterSelect(center)}
                            >
                              <CardContent className="p-6 bg-white dark:bg-gray-800">
                                <div className="flex items-start gap-4">
                                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-[#4DBCC4] to-[#3da8b0] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                    <MapPin className="w-7 h-7 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex-1">
                                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{getLocalizedName(center)}</h4>
                                        <p className="text-base text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                          <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                                          <span>{center.address}</span>
                                        </p>
                                        {center.phone && (
                                          <p className="text-base text-gray-700 dark:text-gray-300 flex items-center gap-2 mt-2">
                                            <span className="text-gray-500 dark:text-gray-400">📞</span>
                                            <span className="font-medium">{center.phone}</span>
                                          </p>
                                        )}
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 font-semibold"
                                      >
                                        {t('booking_available') || 'Available'}
                                      </Badge>
                                    </div>
                                    <Button
                                      size="lg"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCenterSelect(center);
                                      }}
                                      className="w-full mt-3 bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] hover:from-[#3da8b0] hover:to-[#4DBCC4] text-white font-bold shadow-md text-base py-3"
                                    >
                                      {t('booking_select_center')}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                              <MapPin className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                              {t('booking_no_centers_for_doctor') || 'No centers available for this doctor.'}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                              {t('booking_try_different_doctor') || 'Please select a different doctor'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1: Center Selection (Lab mode) */}
                {isLabMode && currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-[#4DBCC4]/10 to-[#3da8b0]/10 dark:from-[#4DBCC4]/20 dark:to-[#3da8b0]/20 p-4 rounded-lg border-l-4 border-[#4DBCC4]">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('booking_select_center') || 'Select Center'}</h3>
                        <p className="text-base text-gray-700 dark:text-gray-300 mt-2">{t('booking_choose_lab_center') || 'Choose where you want to get your lab test or imaging done'}</p>
                      </div>
                    </div>

                    {/* Search Filter */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={t('booking_search_centers') || 'Search by center name or location...'}
                          value={labCenterFilter}
                          onChange={(e) => setLabCenterFilter(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4DBCC4] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        {labCenterFilter && (
                          <button
                            onClick={() => setLabCenterFilter("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-[#4DBCC4]"></div>
                        <p className="mt-4 text-gray-900 dark:text-gray-300 font-medium">{t('booking_loading_centers') || 'Loading available centers...'}</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2">
                        {(() => {
                          // Filter centers based on search
                          const filterQuery = (labCenterFilter || '').toLowerCase();
                          const filteredCenters = labCenters.filter(center => {
                            if (!filterQuery) return true;
                            return (
                              center.name.toLowerCase().includes(filterQuery) ||
                              (center.name_ar || '').toLowerCase().includes(filterQuery) ||
                              center.address?.toLowerCase().includes(filterQuery)
                            );
                          });

                          return filteredCenters.length > 0 ? (
                            filteredCenters.map((center) => (
                              <Card
                                key={center.id}
                                className="transition-all duration-200 hover:shadow-xl cursor-pointer bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-[#4DBCC4] hover:scale-[1.02]"
                                onClick={() => handleLabCenterSelect(center)}
                              >
                                <CardContent className="p-6 bg-white dark:bg-gray-800">
                                  <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[#4DBCC4] to-[#3da8b0] flex items-center justify-center shadow-md">
                                      <MapPin className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{getLocalizedName(center)}</h4>
                                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                                        <span>{center.address}</span>
                                      </p>
                                      {center.phone && (
                                        <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                          <span className="text-gray-500 dark:text-gray-400">📞</span>
                                          <span className="font-medium">{toArabicNumerals(center.phone, locale)}</span>
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 rounded-full bg-[#4DBCC4]/10 dark:bg-[#4DBCC4]/20 flex items-center justify-center">
                                        <ChevronLeft className="w-5 h-5 text-[#4DBCC4] rotate-180" />
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg">
                                {labCenterFilter
                                  ? (t('booking_no_centers_match_search') || 'No centers match your search')
                                  : (t('booking_no_centers_available') || 'No centers available')}
                              </p>
                              <p className="text-gray-600 dark:text-gray-400 mt-2">
                                {labCenterFilter
                                  ? (t('booking_try_different_search') || 'Try a different search term')
                                  : (t('booking_lab_services_unavailable') || 'Lab services are not currently available. Please check back later.')}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Lab test types selection (Lab mode) */}
                {isLabMode && currentStep === 2 && selectedCenter && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap bg-gradient-to-r from-[#4DBCC4]/10 to-[#3da8b0]/10 dark:from-[#4DBCC4]/20 dark:to-[#3da8b0]/20 p-4 rounded-lg border-l-4 border-[#4DBCC4]">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('booking_select_test_type') || 'Select Test Type'}</h3>
                        <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                          {t('booking_available_tests_at') || 'Available tests at'} <span className="font-semibold text-[#4DBCC4]">{getLocalizedName(selectedCenter)}</span>
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        size="default"
                        className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:hover:bg-[#4DBCC4]/20 text-gray-900 dark:text-gray-100 font-semibold"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2 text-gray-900 dark:text-gray-100" />
                        {t('booking_back_to_centers') || 'Back to Centers'}
                      </Button>
                    </div>

                    {loading ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-[#4DBCC4]"></div>
                        <p className="mt-4 text-gray-900 dark:text-gray-300 font-medium">{t('booking_loading_test_types') || 'Loading available test types...'}</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2">
                        {labTypes.length > 0 ? (
                          labTypes.map((type) => (
                            <Card
                              key={type.id}
                              className="transition-all duration-200 hover:shadow-xl cursor-pointer bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-[#4DBCC4] hover:scale-[1.02]"
                              onClick={() => handleLabTypeSelect(type)}
                            >
                              <CardContent className="p-6 bg-white dark:bg-gray-800">
                                <div className="flex items-start gap-4">
                                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[#4DBCC4] to-[#3da8b0] flex items-center justify-center shadow-md">
                                    <span className="text-2xl">🧪</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">{getLocalizedLabTestName(type)}</h4>
                                      {type.category && (
                                        <Badge
                                          variant="outline"
                                          className="capitalize text-xs font-semibold border-2 border-[#4DBCC4] text-[#4DBCC4] bg-[#4DBCC4]/5 dark:bg-[#4DBCC4]/10"
                                        >
                                          {type.category === 'lab' ? (t('lab') || 'Lab') : (t('imaging') || 'Imaging')}
                                        </Badge>
                                      )}
                                    </div>
                                    {type.description && (
                                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">{type.description}</p>
                                    )}
                                    <div className="flex items-center gap-2 text-sm text-[#4DBCC4] font-medium">
                                      <span>{t('booking_click_to_select') || 'Click to select'}</span>
                                      <ChevronLeft className="w-4 h-4 rotate-180" />
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                            <span className="text-5xl mb-4 block">🔬</span>
                            <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg">{t('booking_no_tests_available') || 'No tests available'}</p>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">{t('booking_center_no_tests') || "This center doesn't currently offer any lab tests or imaging services."}</p>
                            <Button
                              variant="outline"
                              onClick={() => setCurrentStep(1)}
                              className="mt-6 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:hover:bg-[#4DBCC4]/20 text-gray-900 dark:text-gray-100 font-semibold"
                            >
                              <ChevronLeft className="w-4 h-4 mr-2 text-gray-900 dark:text-gray-100" />
                              {t('booking_choose_different_center') || 'Choose Different Center'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* OLD Step 2: Lab test types with center chips (Lab mode) - REMOVED */}
                {/* This old step is replaced by the new simpler two-step flow above */}
                {isLabMode && currentStep === 99 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-lg font-semibold text-black">Select Test Type and Center</h3>
                        <div className="text-sm text-black">Browse available lab tests and scans</div>
                      </div>
                    </div>

                    <div className="grid gap-4 max-h-96 overflow-y-auto">
                      {labTypes.map((t) => {
                        const centersForType = labCentersByType[t.id] || [];
                        return (
                          <Card key={t.id} className="transition-all hover:shadow-lg bg-white border border-gray-200">
                            <CardContent className="p-4 bg-white">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <h4 className="font-semibold text-black">{t.name}</h4>
                                      {t.category && (
                                        <p className="text-xs text-black capitalize">{t.category}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-3">
                                    <div className="text-xs text-black mb-1">Choose center:</div>
                                    <div className="flex flex-wrap gap-2">
                                      {centersForType.length > 0 ? (
                                        centersForType.map((c) => (
                                          <button key={c.id} onClick={() => handleLabProceed(t, c)} className="px-3 py-2 rounded border text-xs hover:bg-[#4DBCC4] hover:text-white bg-white text-black border-gray-300 hover:border-[#4DBCC4] transition-all" title={`${c.name} • ${c.address}`}>{c.name}</button>
                                        ))
                                      ) : (
                                        <span className="text-xs text-black">No centers currently offer this test</span>
                                      )}
                                    </div>
                                    {centersForType.length > 0 && (
                                      <div className="text-xs text-black mt-1 line-clamp-2">
                                        {centersForType.slice(0, 3).map((c, i) => (<span key={c.id}>{i > 0 ? ' • ' : ''}{c.name} — {c.address}</span>))}
                                        {centersForType.length > 3 && <span> • +{centersForType.length - 3} more</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}



                {/* Step 4: Date and Time Selection (Doctor mode) / Step 3: Date and Time Selection (Lab mode) */}
                {((currentStep === 4 && !isLabMode && selectedDoctor && (selectedCenter || selectedLocation === "home")) || (currentStep === 3 && isLabMode && selectedLabType && selectedCenter)) && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-[#4DBCC4]/10 to-[#3da8b0]/10 dark:from-[#4DBCC4]/20 dark:to-[#3da8b0]/20 p-5 rounded-lg border-l-4 border-[#4DBCC4] shadow-sm">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('booking_select_date_time') || 'Select Date & Time'}</h3>
                        <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                          {isLabMode
                            ? `${selectedLabType?.name || ''} ${t('booking_at') || 'at'} ${getLocalizedName(selectedCenter)}`
                            : selectedLocation === "home"
                              ? `${t('booking_with') || 'with'} ${locale === 'ar' ? 'دكتور' : 'Dr.'} ${getLocalizedName(selectedDoctor)} - ${t('booking_home_visit') || 'Home Visit'}`
                              : `${t('booking_with') || 'with'} ${locale === 'ar' ? 'دكتور' : 'Dr.'} ${getLocalizedName(selectedDoctor)} ${t('booking_at') || 'at'} ${getLocalizedName(selectedCenter)}`
                          }
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(isLabMode ? 2 : 3)}
                        size="default"
                        className="bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:border-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:hover:bg-[#4DBCC4]/20 text-gray-900 dark:text-gray-100 font-semibold"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2 text-gray-900 dark:text-gray-100" />
                        {t('booking_back') || 'Back'}
                      </Button>
                    </div>

                    {/* Show loading message if doctor working days not loaded yet */}
                    {!isLabMode && doctorWorkingDays.length === 0 && (
                      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800 text-center">
                        <div className="flex items-center justify-center gap-3 mb-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-300 border-t-yellow-600"></div>
                          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {t('booking_loading_availability') || 'Loading doctor availability...'}
                          </p>
                        </div>
                        <p className="text-base text-gray-700 dark:text-gray-300">
                          {t('booking_please_wait_schedule') || 'Please wait while we fetch the schedule.'}
                        </p>
                      </div>
                    )}

                    {/* Only show calendar and time slots when ready */}
                    {(isLabMode || doctorWorkingDays.length > 0) && (
                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* Calendar */}
                        <div className="flex flex-col">
                          <h4 className="font-bold text-xl mb-4 text-gray-900 dark:text-gray-100 flex items-center">
                            <CalendarIcon className="w-6 h-6 mr-2 text-[#4DBCC4]" />
                            {t('booking_select_date') || 'Select Date'}
                          </h4>
                          {!isLabMode && doctorWorkingDays.length > 0 && selectedDoctor && (
                            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                              <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">
                                <strong className="text-[#4DBCC4]">{locale === 'ar' ? 'دكتور' : 'Dr.'} {getLocalizedName(selectedDoctor)}</strong> {t('booking_doctor_available_on') || 'is available on:'} {' '}
                                <span className="font-semibold">
                                  {doctorWorkingDays.map(day => {
                                    const dayNames = [
                                      t('booking_day_sunday') || 'Sunday',
                                      t('booking_day_monday') || 'Monday',
                                      t('booking_day_tuesday') || 'Tuesday',
                                      t('booking_day_wednesday') || 'Wednesday',
                                      t('booking_day_thursday') || 'Thursday',
                                      t('booking_day_friday') || 'Friday',
                                      t('booking_day_saturday') || 'Saturday'
                                    ];
                                    return dayNames[day];
                                  }).join(', ')}
                                </span>
                              </p>
                            </div>
                          )}
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            disabled={(date) => {
                              // Disable past dates (before today)
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              if (date < today) return true;

                              if (isLabMode) {
                                // Only enable dates returned by lab schedule
                                const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                return !(labAvailableDates || []).includes(d);
                              }

                              // If we have doctor's working days, only allow those days
                              if (doctorWorkingDays.length > 0) {
                                const dayOfWeek = date.getDay();
                                const isWorkingDay = doctorWorkingDays.includes(dayOfWeek);
                                return !isWorkingDay;
                              }

                              // Default fallback - disable Fridays and weekends
                              return date.getDay() === 5 || date.getDay() === 6;
                            }}
                            className="rounded-xl border-2 border-gray-300 dark:border-gray-600 shadow-lg p-4 bg-white dark:bg-gray-800 w-full"
                          />
                        </div>

                        {/* Time Slots */}
                        <div>
                          <h4 className="font-bold text-xl mb-4 text-gray-900 dark:text-gray-100 flex items-center">
                            <Clock className="w-6 h-6 mr-2 text-[#4DBCC4]" />
                            {t('booking_select_time') || 'Select Time'}
                          </h4>
                          {selectedDate ? (
                            loadingAvailability ? (
                              <div className="flex items-center justify-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-[#4DBCC4]"></div>
                                  <span className="text-base text-gray-900 dark:text-gray-100 font-medium">{t('booking_loading_times') || 'Loading available times...'}</span>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                  {availableSlots.map((slot, index) => (
                                    <motion.div
                                      key={slot.time}
                                      initial={{ opacity: 0, scale: 0.9 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      transition={{ delay: index * 0.03 }}
                                      whileHover={slot.is_available && !slot.is_booked ? { scale: 1.05, y: -2 } : {}}
                                      whileTap={slot.is_available && !slot.is_booked ? { scale: 0.95 } : {}}
                                    >
                                      <Button
                                        variant={selectedTime === slot.time ? "default" : "outline"}
                                        size="lg"
                                        onClick={() => setSelectedTime(slot.time)}
                                        disabled={slot.is_booked || !slot.is_available}
                                        className={`
                                w-full font-bold text-base py-6
                                ${slot.is_booked || !slot.is_available
                                            ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-600 opacity-60"
                                            : selectedTime === slot.time
                                              ? "ring-4 ring-[#4DBCC4]/30 bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] hover:from-[#3da8b0] hover:to-[#4DBCC4] border-2 border-[#4DBCC4] shadow-xl text-white"
                                              : "hover:ring-2 hover:ring-[#4DBCC4]/50 bg-white dark:bg-gray-800 hover:bg-[#4DBCC4]/5 dark:hover:bg-[#4DBCC4]/10 hover:shadow-lg text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 hover:border-[#4DBCC4]"}
                              `}
                                      >
                                        {slot.time}
                                        {slot.is_booked && (
                                          <span className="block text-xs mt-1">({t('booking_time_booked') || 'Booked'})</span>
                                        )}
                                      </Button>
                                    </motion.div>
                                  ))}
                                </div>

                                {availableSlots.length === 0 && (
                                  <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-dashed border-red-300 dark:border-red-800">
                                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                      <Clock className="w-8 h-8 text-red-500" />
                                    </div>
                                    <p className="text-gray-900 dark:text-gray-100 font-bold text-lg mb-2">
                                      {t('booking_no_slots_date') || 'No available time slots for this date'}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                                      {t('booking_try_another_date') || 'Please select another date'}
                                    </p>
                                    {!isLabMode && doctorWorkingDays.length > 0 && (
                                      <p className="text-[#4DBCC4] dark:text-[#4DBCC4] text-sm mt-3 font-medium">
                                        {t('booking_doctor_available_hint') || 'Available days are highlighted in the calendar'}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          ) : (
                            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                              <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg">{t('booking_select_date_first') || 'Please select a date first'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Symptoms/Notes Section */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="symptoms" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 block">
                          {isLabMode ? (t('booking_notes_label') || 'Notes (Optional)') : (t('booking_symptoms_label') || 'Symptoms or Chief Complaint (Optional)')}
                        </Label>
                        <Textarea
                          id="symptoms"
                          placeholder={isLabMode ? (t('booking_lab_notes_placeholder') || 'Any additional information for the lab (optional)...') : (t('booking_symptoms_placeholder') || 'Please describe your symptoms or reason for the visit (optional)...')}
                          value={symptoms}
                          onChange={(e) => setSymptoms(e.target.value)}
                          className="mt-2 border-2 border-gray-300 dark:border-gray-600 focus:border-[#4DBCC4] focus:ring-2 focus:ring-[#4DBCC4]/20 text-gray-900 dark:text-gray-100"
                          rows={3}
                        />
                        {!isLabMode && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {t('booking_symptoms_help') || 'This information helps the doctor prepare for your consultation'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Booking Summary */}
                    {selectedDate && selectedTime && (
                      <Card className="bg-gradient-to-br from-[#4DBCC4]/10 to-[#3da8b0]/10 dark:from-[#4DBCC4]/20 dark:to-[#3da8b0]/20 border-2 border-[#4DBCC4] shadow-lg">
                        <CardContent className="p-5">
                          <h4 className="font-bold text-lg mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#4DBCC4]"></span>
                            {t('booking_summary_title') || 'Booking Summary'}
                          </h4>
                          <div className="space-y-3 text-sm">
                            {!isLabMode ? (
                              <>
                                <div className="flex justify-between items-center py-2 border-b border-[#4DBCC4]/20">
                                  <span className="text-gray-600 dark:text-gray-400 font-medium">{t('booking_summary_doctor') || 'Doctor:'}</span>
                                  <span className="text-gray-900 dark:text-gray-100 font-semibold">{locale === 'ar' ? 'دكتور' : 'Dr.'} {getLocalizedName(selectedDoctor)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-[#4DBCC4]/20">
                                  <span className="text-gray-600 dark:text-gray-400 font-medium">{t('booking_summary_specialty') || 'Specialty:'}</span>
                                  <span className="text-gray-900 dark:text-gray-100 font-semibold">{getLocalizedSpecialtyName(selectedDoctor!.specialty)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-[#4DBCC4]/20">
                                  <span className="text-gray-600 dark:text-gray-400 font-medium">{t('booking_summary_type') || 'Type:'}</span>
                                  <span className="text-gray-900 dark:text-gray-100 font-semibold">{selectedLocation === "home" ? (t('booking_home_visit') || 'Home Visit') : (t('booking_clinic_visit') || 'Clinic Visit')}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between items-center py-2 border-b border-[#4DBCC4]/20">
                                  <span className="text-gray-600 dark:text-gray-400 font-medium">{t('booking_summary_test') || 'Test:'}</span>
                                  <span className="text-gray-900 dark:text-gray-100 font-semibold">{getLocalizedLabTestName(selectedLabType)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-[#4DBCC4]/20">
                                  <span className="text-gray-600 dark:text-gray-400 font-medium">{t('booking_summary_center') || 'Center:'}</span>
                                  <span className="text-gray-900 dark:text-gray-100 font-semibold">{getLocalizedName(selectedCenter)}</span>
                                </div>
                              </>
                            )}
                            <div className="flex justify-between items-center py-2 border-b border-[#4DBCC4]/20">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">{t('booking_summary_date') || 'Date:'}</span>
                              <span className="text-gray-900 dark:text-gray-100 font-semibold">{toArabicNumerals(selectedDate.toLocaleDateString(), locale)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-[#4DBCC4]/20">
                              <span className="text-gray-600 dark:text-gray-400 font-medium">{t('booking_summary_time') || 'Time:'}</span>
                              <span className="text-gray-900 dark:text-gray-100 font-semibold">{toArabicNumerals(selectedTime, locale)}</span>
                            </div>
                            {symptoms.trim() && (
                              <div className="flex flex-col gap-2 pt-3">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{isLabMode ? (t('booking_summary_notes') || 'Notes:') : (t('booking_summary_symptoms') || 'Symptoms:')}</span>
                                <span className="text-gray-900 dark:text-gray-100 text-sm bg-white dark:bg-gray-700 p-3 rounded-lg border-2 border-[#4DBCC4]/30 leading-relaxed">
                                  {symptoms}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center font-bold text-lg pt-3 mt-2 border-t-2 border-[#4DBCC4]">
                              <span className="text-gray-700 dark:text-gray-300">{isLabMode ? (t('booking_test_fee') || 'Test Fee:') : (t('booking_consultation_fee') || 'Consultation Fee:')}</span>
                              <span className="text-[#4DBCC4] text-xl">
                                {!isLabMode ? (
                                  selectedLocation === "home"
                                    ? formatCurrency((actualConsultationFee || selectedDoctor!.consultation_fee || 0) + 50, locale)
                                    : formatCurrency(actualConsultationFee || selectedDoctor!.consultation_fee || 0, locale)
                                ) : (
                                  formatCurrency(actualConsultationFee || 0, locale)
                                )}
                              </span>
                            </div>
                            {!isLabMode && selectedLocation === "home" && selectedDoctor && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                                <span className="font-medium">{t('booking_base_fee') || 'Base fee:'}</span> {formatCurrency(actualConsultationFee || selectedDoctor!.consultation_fee || 0, locale)} + <span className="font-medium">{t('booking_travel_fee') || 'Travel fee:'}</span> {formatCurrency(50, locale)}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                    >
                      <Button
                        onClick={handleBookAppointment}
                        disabled={!selectedDate || !selectedTime || loading}
                        className="w-full bg-[#4DBCC4] hover:bg-[#4DBCC4]/90 dark:bg-[#2a5f6b] dark:hover:bg-[#2a5f6b]/90 text-white"
                        size="lg"
                      >
                        {loading ? (t('booking_booking_in_progress') || 'Booking...') : user ? (t('booking_confirm_appointment') || 'Confirm Booking') : (t('booking_login_to_book') || 'Login to Book')}
                      </Button>
                    </motion.div>
                  </div>
                )}
              </div>
            </motion.div>
          </DialogContent>

          {/* Custom Alert Dialog */}
          {alertConfig && (
            <CustomAlert
              isOpen={alertOpen}
              onClose={hideAlert}
              title={alertConfig.title}
              message={alertConfig.message}
              type={alertConfig.type}
              confirmText={alertConfig.confirmText}
              onConfirm={alertConfig.onConfirm}
              showCancel={alertConfig.showCancel}
              cancelText={alertConfig.cancelText}
            />
          )}
        </Dialog>
      )}
    </AnimatePresence>
  );
}
