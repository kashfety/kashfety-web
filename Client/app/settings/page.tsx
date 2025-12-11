"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import MainLayout from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Save, Globe, FileText } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import React, { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import LogoutButton from "@/components/LogoutButton";
import { useLocale } from '@/components/providers/locale-provider';

export default function SettingsPage() {
  const { t, locale, isRTL } = useLocale()

  useEffect(() => {
    const title = t('settings_page_title') || "Account Settings & Preferences | Healthcare Management System"
    document.title = title
  }, [t])

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = '/login';
  };

  return (
    <MainLayout breadcrumbs={[{ label: t('settings_breadcrumb') || "Settings" }]}>
      <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('settings_title') || "Settings"}</h1>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('save_changes') || "Save Changes"}
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-emerald-200 dark:border-emerald-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-white">{t('user_settings') || "User Settings"}</CardTitle>
                <TabsList>
                  <TabsTrigger value="profile">{t('profile_tab') || "Profile"}</TabsTrigger>
                  <TabsTrigger value="account">{t('account_tab') || "Account"}</TabsTrigger>
                  <TabsTrigger value="notifications">{t('notifications_tab') || "Notifications"}</TabsTrigger>
                  <TabsTrigger value="security">{t('security_tab') || "Security"}</TabsTrigger>
                </TabsList>
              </div>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {t('settings_description') || "Manage your account settings and preferences"}
              </CardDescription>
            </CardHeader>
          </Card>

          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-emerald-200 dark:border-emerald-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('profile_information') || "Profile Information"}</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {t('update_personal_info') || "Update your personal information"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="sm:w-[180px] flex flex-col items-center gap-3">
                    <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold text-3xl">
                      A
                    </div>
                    <Button variant="outline" size="sm">
                      {t('change_avatar') || "Change Avatar"}
                    </Button>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">{t('first_name') || "First Name"}</Label>
                        <Input id="firstName" defaultValue="Admin" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">{t('last_name') || "Last Name"}</Label>
                        <Input id="lastName" defaultValue="User" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="displayName">{t('display_name') || "Display Name"}</Label>
                      <Input id="displayName" defaultValue="Admin User" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">{t('job_title') || "Job Title"}</Label>
                      <Input id="title" defaultValue="System Administrator" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">{t('bio') || "Bio"}</Label>
                    <Textarea
                      id="bio"
                      placeholder={t('bio_placeholder') || "Write a short bio about yourself"}
                      defaultValue={t('bio_default') || "System administrator for EduHub platform, managing centers and user access."}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">{t('location') || "Location"}</Label>
                      <Input id="location" defaultValue="New York, NY" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">{t('timezone') || "Timezone"}</Label>
                      <Select defaultValue="America/New_York">
                        <SelectTrigger id="timezone">
                          <SelectValue placeholder={t('select_timezone') || "Select timezone"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">{t('timezone_et') || "Eastern Time (ET)"}</SelectItem>
                          <SelectItem value="America/Chicago">{t('timezone_ct') || "Central Time (CT)"}</SelectItem>
                          <SelectItem value="America/Denver">{t('timezone_mt') || "Mountain Time (MT)"}</SelectItem>
                          <SelectItem value="America/Los_Angeles">{t('timezone_pt') || "Pacific Time (PT)"}</SelectItem>
                          <SelectItem value="Europe/London">{t('timezone_gmt') || "Greenwich Mean Time (GMT)"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-emerald-200 dark:border-emerald-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">{t('contact_information') || "Contact Information"}</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {t('update_contact_details') || "Update your contact details"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email_address') || "Email Address"}</Label>
                  <Input id="email" type="email" defaultValue="admin@eduhub.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone_number') || "Phone Number"}</Label>
                  <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="altEmail">{t('alternative_email') || "Alternative Email"}</Label>
                  <Input id="altEmail" type="email" placeholder={t('enter_alternative_email') || "Enter an alternative email"} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('account_settings') || 'Account Settings'}</CardTitle>
                <CardDescription>{t('manage_account_preferences') || 'Manage your account preferences'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" defaultValue="admin" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select defaultValue="MM/DD/YYYY">
                    <SelectTrigger id="dateFormat">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="darkMode">Dark Mode</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Use dark theme for the dashboard</p>
                  </div>
                  <Switch id="darkMode" defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">{t('danger_zone') || 'Danger Zone'}</CardTitle>
                <CardDescription>{t('irreversible_actions') || 'Irreversible account actions'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">{t('delete_account') || 'Delete Account'}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('delete_account_desc') || 'Permanently delete your account and all data'}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    {t('delete_account') || 'Delete Account'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Privacy Policy Section */}
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-emerald-200 dark:border-emerald-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('legal_documents') || 'Legal Documents'}
                </CardTitle>
                <CardDescription>
                  {t('review_legal_documents') || 'Review our Terms & Conditions and Privacy Policy'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/terms-and-conditions" target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <FileText className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('terms_and_conditions') || 'Terms & Conditions'}
                  </Button>
                </Link>
                <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <FileText className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('privacy_policy') || 'Privacy Policy'}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Email Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="emailLogin" className="flex-1">
                        Login activity
                      </Label>
                      <Switch id="emailLogin" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="emailSystem" className="flex-1">
                        System updates
                      </Label>
                      <Switch id="emailSystem" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="emailCenters" className="flex-1">
                        Center changes
                      </Label>
                      <Switch id="emailCenters" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="emailUsers" className="flex-1">
                        User management
                      </Label>
                      <Switch id="emailUsers" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">In-App Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="appLogin" className="flex-1">
                        Login activity
                      </Label>
                      <Switch id="appLogin" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="appSystem" className="flex-1">
                        System updates
                      </Label>
                      <Switch id="appSystem" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="appCenters" className="flex-1">
                        Center changes
                      </Label>
                      <Switch id="appCenters" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="appUsers" className="flex-1">
                        User management
                      </Label>
                      <Switch id="appUsers" defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input id="newPassword" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input id="confirmPassword" type="password" />
                </div>
                <Button className="mt-2">Update Password</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Protect your account with 2FA</p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sessions</CardTitle>
                <CardDescription>Manage your active sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium">Current Session</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Chrome on Windows • New York, USA
                            </p>
                          </div>
                        </div>
                        <Badge variant="success">Active</Badge>
                      </div>
                    </div>
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <Globe className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium">Mobile Session</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Safari on iPhone • Boston, USA</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Logout section - Updated to be more prominent */}
        <Card className="mt-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">{t('account_access') || "Account Access"}</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {t('manage_account_access') || "Manage your account access and sessions"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white">{t('sign_out') || "Sign Out"}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('sign_out_device_desc') || "Sign out of your account on this device"}
                </p>
              </div>
              <LogoutButton
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              >
                {t('sign_out') || "Sign Out"}
              </LogoutButton>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{t('active_sessions') || "Active Sessions"}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('manage_all_sessions') || "Manage and sign out from all of your active sessions on other browsers and devices"}
                </p>
              </div>
              <LogoutButton
                className="text-red-600 hover:text-red-800 font-medium flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {t('sign_out_all_devices') || "Sign out from all devices"}
              </LogoutButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
