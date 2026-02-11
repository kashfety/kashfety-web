"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/lib/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Mail, Phone, Calendar, Heart, Lock, Globe, LogOut, Save, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { getLocalizedGenders } from "@/lib/i18n";

interface ProfileData {
  id: string;
  name: string;
  name_ar?: string;
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  profile_picture_url: string | null;
  emergency_contact: Record<string, unknown>;
  created_at?: string;
}

interface MedicalInfo {
  medical_history: string;
  allergies: string;
  medications: string;
  emergency_contact: { name?: string; relationship?: string; phone?: string };
}

export default function PatientProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, logout, refreshUser } = useAuth();
  const { t, isRTL, locale } = useLocale();
  const { toast } = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    name: "",
    first_name_ar: "",
    last_name_ar: "",
    name_ar: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  useEffect(() => {
    document.title = `${t("profile") || "Profile"} | ${t("app_name") || "Kashfety"}`;
  }, [t]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/patient-dashboard/profile");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && user.role !== "patient") {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, user, router]);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "patient") return;

    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/patient-dashboard/profile", {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
          setFormData({
            first_name: data.profile.first_name ?? "",
            last_name: data.profile.last_name ?? "",
            name: data.profile.name ?? "",
            first_name_ar: data.profile.first_name_ar ?? "",
            last_name_ar: data.profile.last_name_ar ?? "",
            name_ar: data.profile.name_ar ?? "",
            email: data.profile.email ?? "",
            phone: data.profile.phone ?? "",
            gender: data.profile.gender ?? "",
            date_of_birth: data.profile.date_of_birth ? String(data.profile.date_of_birth).slice(0, 10) : "",
          });
        }
      } catch (e) {
        toast({ title: t("error") || "Error", description: (e as Error).message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    const fetchMedicalInfo = async () => {
      try {
        const res = await fetch("/api/patient/medical-info", { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.medical_info) {
          setMedicalInfo({
            medical_history: data.medical_info.medical_history ?? "",
            allergies: data.medical_info.allergies ?? "",
            medications: data.medical_info.medications ?? "",
            emergency_contact: data.medical_info.emergency_contact ?? {},
          });
        }
      } catch {
        // Non-blocking
      }
    };

    fetchProfile();
    fetchMedicalInfo();
  }, [isAuthenticated, user?.role]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/patient-dashboard/profile", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t("save_changes") || "Saved", description: data.message || "Profile updated." });
        setProfile((prev) => (prev ? { ...prev, ...formData } : null));
        await refreshUser?.();
      } else {
        toast({ title: t("error") || "Error", description: data.message || "Failed to update.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: t("error") || "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: t("error") || "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: t("error") || "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/patient-dashboard/change-password", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t("success") || "Success", description: data.message || "Password updated." });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast({ title: t("error") || "Error", description: data.message || "Failed to change password.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: t("error") || "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const genders = getLocalizedGenders(locale);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DBCC4] mx-auto mb-4" />
          <p className="text-muted-foreground">{t("loading") || "Loading..."}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "patient") {
    return null;
  }

  return (
    <div className={`min-h-screen bg-background ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <div className="flex flex-col min-h-screen" onClick={() => sidebarOpen && toggleSidebar()}>
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-6">
          <Header onMenuToggle={toggleSidebar} />
        </div>

        <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <div className="mb-8">
              <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`} dir={isRTL ? "rtl" : "ltr"}>
                <div className="bg-[#4DBCC4]/10 dark:bg-[#4DBCC4]/20 p-3 rounded-full">
                  <User className="w-8 h-8 text-[#4DBCC4]" />
                </div>
                <div className={isRTL ? "text-right" : "text-left"}>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    {t("profile") || "Profile"}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {t("profile_subtitle") || "View and manage your personal information"}
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#4DBCC4]" />
              </div>
            ) : (
              <>
                <Card className="border border-[#4DBCC4]/20 dark:border-[#4DBCC4]/30">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <User className="h-5 w-5 text-[#4DBCC4]" />
                      {t("profile_information") || "Profile Information"}
                    </CardTitle>
                    <CardDescription>
                      {t("update_personal_info") || "Update your personal details"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex flex-col items-center gap-3">
                        <Avatar className="h-24 w-24 border-2 border-[#4DBCC4]/30">
                          <AvatarImage src={profile?.profile_picture_url ?? undefined} alt={profile?.name} />
                          <AvatarFallback className="bg-[#4DBCC4]/20 text-[#4DBCC4] text-2xl">
                            {(profile?.name || user?.name || "P").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="first_name">{t("first_name") || "First Name"}</Label>
                            <Input
                              id="first_name"
                              value={formData.first_name}
                              onChange={(e) => setFormData((f) => ({ ...f, first_name: e.target.value }))}
                              className="border-[#4DBCC4]/30"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="last_name">{t("last_name") || "Last Name"}</Label>
                            <Input
                              id="last_name"
                              value={formData.last_name}
                              onChange={(e) => setFormData((f) => ({ ...f, last_name: e.target.value }))}
                              className="border-[#4DBCC4]/30"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name">{t("display_name") || "Display Name"}</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                            className="border-[#4DBCC4]/30"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="first_name_ar">{t("first_name_ar") || "First Name (Arabic)"}</Label>
                            <Input
                              id="first_name_ar"
                              value={formData.first_name_ar}
                              onChange={(e) => setFormData((f) => ({ ...f, first_name_ar: e.target.value }))}
                              className="border-[#4DBCC4]/30"
                              dir="rtl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="last_name_ar">{t("last_name_ar") || "Last Name (Arabic)"}</Label>
                            <Input
                              id="last_name_ar"
                              value={formData.last_name_ar}
                              onChange={(e) => setFormData((f) => ({ ...f, last_name_ar: e.target.value }))}
                              className="border-[#4DBCC4]/30"
                              dir="rtl"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name_ar">{t("display_name_ar") || "Display Name (Arabic)"}</Label>
                          <Input
                            id="name_ar"
                            value={formData.name_ar}
                            onChange={(e) => setFormData((f) => ({ ...f, name_ar: e.target.value }))}
                            className="border-[#4DBCC4]/30"
                            dir="rtl"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="email">{t("email_address") || "Email"}</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                              className="border-[#4DBCC4]/30"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">{t("phone_number") || "Phone"}</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                              className="border-[#4DBCC4]/30"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="date_of_birth">{t("date_of_birth") || "Date of Birth"}</Label>
                            <Input
                              id="date_of_birth"
                              type="date"
                              value={formData.date_of_birth}
                              onChange={(e) => setFormData((f) => ({ ...f, date_of_birth: e.target.value }))}
                              className="border-[#4DBCC4]/30"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t("gender") || "Gender"}</Label>
                            <Select
                              value={formData.gender || "none"}
                              onValueChange={(v) => setFormData((f) => ({ ...f, gender: v === "none" ? "" : v }))}
                            >
                              <SelectTrigger className="border-[#4DBCC4]/30">
                                <SelectValue placeholder={t("select_gender") || "Select gender"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">{t("select_gender") || "Select gender"}</SelectItem>
                                <SelectItem value="male">{genders.male}</SelectItem>
                                <SelectItem value="female">{genders.female}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="bg-[#4DBCC4] hover:bg-[#4DBCC4]/90 text-white"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
                          {t("save_changes") || "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-[#4DBCC4]/20 dark:border-[#4DBCC4]/30">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Heart className="h-5 w-5 text-[#4DBCC4]" />
                      {t("medical_summary") || "Medical Summary"}
                    </CardTitle>
                    <CardDescription>
                      {t("medical_summary_desc") || "Quick view of your medical info. Edit details in Medical Records."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {medicalInfo && (
                      <>
                        {medicalInfo.allergies && (
                          <p className="text-sm"><span className="font-medium">{t("allergies") || "Allergies"}:</span> {medicalInfo.allergies}</p>
                        )}
                        {medicalInfo.medications && (
                          <p className="text-sm"><span className="font-medium">{t("medications") || "Medications"}:</span> {medicalInfo.medications}</p>
                        )}
                        {medicalInfo.emergency_contact?.name && (
                          <p className="text-sm">
                            <span className="font-medium">{t("mr_emergency_contact") || "Emergency Contact"}:</span>{" "}
                            {medicalInfo.emergency_contact.name}
                            {medicalInfo.emergency_contact.phone && ` • ${medicalInfo.emergency_contact.phone}`}
                          </p>
                        )}
                        {!medicalInfo.allergies && !medicalInfo.medications && !medicalInfo.emergency_contact?.name && (
                          <p className="text-muted-foreground text-sm">{t("no_medical_summary") || "No medical summary yet."}</p>
                        )}
                      </>
                    )}
                    <Link href="/patient-dashboard/medical-records">
                      <Button variant="outline" size="sm" className="border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 mt-2">
                        {t("manage_in_medical_records") || "Manage in Medical Records"}
                        <ArrowRight className={`h-4 w-4 ${isRTL ? "mr-2 rotate-180" : "ml-2"}`} />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border border-[#4DBCC4]/20 dark:border-[#4DBCC4]/30">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Globe className="h-5 w-5 text-[#4DBCC4]" />
                      {t("account") || "Account"}
                    </CardTitle>
                    <CardDescription>
                      {t("language_preference") || "Language preference"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t("language") || "Language"}:</span>
                      <LocaleSwitcher />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-[#4DBCC4]/20 dark:border-[#4DBCC4]/30">
                  <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Lock className="h-5 w-5 text-[#4DBCC4]" />
                      {t("security") || "Security"}
                    </CardTitle>
                    <CardDescription>
                      {t("change_password_desc") || "Change your password"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">{t("current_password") || "Current Password"}</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="border-[#4DBCC4]/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">{t("new_password") || "New Password"}</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="border-[#4DBCC4]/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t("confirm_password") || "Confirm New Password"}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                        placeholder="••••••••"
                        className="border-[#4DBCC4]/30"
                      />
                    </div>
                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword}
                      variant="outline"
                      className="border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10"
                    >
                      {changingPassword ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                      {t("change_password") || "Change Password"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border border-red-200 dark:border-red-800/50">
                  <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                      <LogOut className="h-5 w-5" />
                      {t("sign_out") || "Sign Out"}
                    </CardTitle>
                    <CardDescription>
                      {t("sign_out_device_desc") || "Sign out of your account on this device"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="destructive" onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
                      <LogOut className="h-4 w-4 me-2" />
                      {t("header_logout") || "Logout"}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
