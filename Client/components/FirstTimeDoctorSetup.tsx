"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/components/providers/locale-provider"
import { 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  Stethoscope, 
  DollarSign, 
  Award, 
  MapPin,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface DoctorSetupData {
  specialty: string;
  experience_years: number;
  consultation_fee: number;
  bio: string;
  qualifications: string[];
  work_hours: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
}

const SPECIALTIES = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Gynecology",
  "Psychiatry",
  "Ophthalmology",
  "ENT (Ear, Nose, Throat)",
  "Endocrinology",
  "Gastroenterology",
  "Pulmonology",
  "Rheumatology",
  "Urology",
  "Emergency Medicine",
  "Family Medicine",
  "Internal Medicine",
  "Anesthesiology",
  "Radiology"
];

const DEFAULT_WORK_HOURS = {
  monday: { start: "09:00", end: "17:00", available: true },
  tuesday: { start: "09:00", end: "17:00", available: true },
  wednesday: { start: "09:00", end: "17:00", available: true },
  thursday: { start: "09:00", end: "17:00", available: true },
  friday: { start: "09:00", end: "17:00", available: true },
  saturday: { start: "09:00", end: "13:00", available: false },
  sunday: { start: "09:00", end: "13:00", available: false }
};

interface FirstTimeDoctorSetupProps {
  onSetupComplete: () => void;
}

export default function FirstTimeDoctorSetup({ onSetupComplete }: FirstTimeDoctorSetupProps) {
  const { t, isRTL } = useLocale()

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<DoctorSetupData>({
    specialty: "",
    experience_years: 0,
    consultation_fee: 100,
    bio: "",
    qualifications: [],
    work_hours: DEFAULT_WORK_HOURS
  });

  const { toast } = useToast();
  const router = useRouter();

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleDataChange = (field: keyof DoctorSetupData, value: any) => {
    setSetupData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWorkHourChange = (day: string, field: string, value: any) => {
    setSetupData(prev => ({
      ...prev,
      work_hours: {
        ...prev.work_hours,
        [day]: {
          ...prev.work_hours[day as keyof typeof prev.work_hours],
          [field]: value
        }
      }
    }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('Completing setup with token:', token ? 'present' : 'missing');
      console.log('Setup data:', setupData);

  const response = await fetch('/api/auth/doctor/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(setupData)
      });

      console.log('Setup response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Setup completed successfully:', result);
        toast({
          title: "Setup Complete!",
          description: "Your doctor profile has been set up successfully.",
        });
        onSetupComplete();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete setup');
      }
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to complete setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return setupData.specialty && setupData.experience_years >= 0;
      case 2:
        return setupData.consultation_fee > 0;
      case 3:
        return setupData.bio.length >= 50;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Stethoscope className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">Doctor Profile Setup</h1>
          </div>
          <p className="text-gray-600">Let's set up your professional profile</p>
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-500 mt-2">Step {currentStep} of {totalSteps}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Basic Professional Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <Stethoscope className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h2 className="text-xl font-semibold">Professional Information</h2>
                <p className="text-gray-600">Tell us about your medical expertise</p>
              </div>

              <div>
                <Label htmlFor="specialty">Medical Specialty *</Label>
                <Select onValueChange={(value) => handleDataChange('specialty', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map(specialty => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="experience">Years of Experience *</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  max="50"
                  value={setupData.experience_years}
                  onChange={(e) => handleDataChange('experience_years', parseInt(e.target.value) || 0)}
                  placeholder="Enter years of practice"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Include your residency and fellowship years
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Consultation Fee */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <h2 className="text-xl font-semibold">Consultation Fee</h2>
                <p className="text-gray-600">Set your consultation pricing</p>
              </div>

              <div>
                <Label htmlFor="consultation_fee" className="text-base font-medium">
                  Consultation Fee (USD) *
                </Label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-lg">$</span>
                  </div>
                  <Input
                    id="consultation_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={setupData.consultation_fee}
                    onChange={(e) => handleDataChange('consultation_fee', parseFloat(e.target.value) || 0)}
                    className="pl-8 text-lg font-medium"
                    placeholder="0.00"
                  />
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Fee Preview</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Clinic Consultation:</span>
                      <span className="font-medium">${setupData.consultation_fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Home Visit:</span>
                      <span className="font-medium">${(setupData.consultation_fee + 50).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Home visits include additional travel fee
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Bio and Qualifications */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <Award className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                <h2 className="text-xl font-semibold">Professional Bio</h2>
                <p className="text-gray-600">Describe your background and approach</p>
              </div>

              <div>
                <Label htmlFor="bio">Professional Bio *</Label>
                <Textarea
                  id="bio"
                  value={setupData.bio}
                  onChange={(e) => handleDataChange('bio', e.target.value)}
                  placeholder="Describe your medical background, areas of expertise, treatment philosophy, and what patients can expect from your care..."
                  rows={6}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Minimum 50 characters. Current: {setupData.bio.length}
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Work Hours */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="text-center">
                <Clock className="h-12 w-12 text-orange-600 mx-auto mb-3" />
                <h2 className="text-xl font-semibold">Work Schedule</h2>
                <p className="text-gray-600">Set your availability hours</p>
              </div>

              <div className="space-y-3">
                {Object.entries(setupData.work_hours).map(([day, hours]) => (
                  <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={hours.available}
                        onChange={(e) => handleWorkHourChange(day, 'available', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="font-medium capitalize w-20">{day}</span>
                    </div>
                    {hours.available && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={hours.start}
                          onChange={(e) => handleWorkHourChange(day, 'start', e.target.value)}
                          className="w-24"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={hours.end}
                          onChange={(e) => handleWorkHourChange(day, 'end', e.target.value)}
                          className="w-24"
                        />
                      </div>
                    )}
                    {!hours.available && (
                      <Badge variant="secondary">Unavailable</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button 
              variant="outline" 
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button 
                onClick={nextStep}
                disabled={!isStepValid()}
              >
                Next
                <ChevronRight className={`h-4 w-4 ml-1 ${isRTL ? "mr-h-4 w-4 ml-1" : "ml-h-4 w-4 ml-1"}`} />
              </Button>
            ) : (
              <Button 
                onClick={handleComplete}
                disabled={!isStepValid() || loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  "Setting up..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Complete Setup
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
