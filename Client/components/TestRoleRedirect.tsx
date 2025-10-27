"use client"

import { useAuth } from "@/lib/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestRoleRedirect() {
    const { user, isAuthenticated, loading } = useAuth()

    if (loading) {
        return (
            <Card className="w-full max-w-md mx-auto mt-8">
                <CardContent className="p-6">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-600">Loading auth state...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!isAuthenticated || !user) {
        return (
            <Card className="w-full max-w-md mx-auto mt-8">
                <CardHeader>
                    <CardTitle>Authentication Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-red-600">Not authenticated</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md mx-auto mt-8">
            <CardHeader>
                <CardTitle>User & Role Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm font-medium text-gray-500">Name:</p>
                    <p className="text-lg">{user.name}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Email:</p>
                    <p className="text-lg">{user.email}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Role:</p>
                    <p className="text-lg font-semibold text-emerald-600">{user.role}</p>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">Expected Dashboard:</p>
                    <p className="text-lg font-semibold text-blue-600">
                        {user.role.toLowerCase() === 'super_admin'
                            ? '/super-admin-dashboard'
                            : user.role.toLowerCase() === 'admin'
                                ? '/admin-dashboard'
                                : user.role.toLowerCase() === 'doctor'
                                    ? '/doctor-dashboard'
                                    : '/patient'}
                    </p>
                </div>
                <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500">
                        If you're not on the correct dashboard, the system should automatically redirect you.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
} 