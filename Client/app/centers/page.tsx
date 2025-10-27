"use client"

import { useEffect } from "react"
import MainLayout from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building, Plus, Search, Filter, MoreHorizontal, MapPin, Phone, Mail } from "lucide-react"

// Sample data for centers
const centers = [
  {
    id: "1",
    name: "Downtown Learning Center",
    location: "123 Main St, New York, NY",
    status: "active",
    students: 145,
    classes: 12,
    contact: {
      email: "downtown@eduhub.com",
      phone: "(212) 555-1234",
    },
  },
  {
    id: "2",
    name: "Westside Education Hub",
    location: "456 West Ave, Los Angeles, CA",
    status: "active",
    students: 210,
    classes: 18,
    contact: {
      email: "westside@eduhub.com",
      phone: "(310) 555-6789",
    },
  },
  {
    id: "3",
    name: "Northgate Training Center",
    location: "789 North Blvd, Chicago, IL",
    status: "inactive",
    students: 0,
    classes: 0,
    contact: {
      email: "northgate@eduhub.com",
      phone: "(312) 555-9012",
    },
  },
  {
    id: "4",
    name: "Eastside Learning Academy",
    location: "321 East St, Boston, MA",
    status: "active",
    students: 98,
    classes: 8,
    contact: {
      email: "eastside@eduhub.com",
      phone: "(617) 555-3456",
    },
  },
  {
    id: "5",
    name: "Southpoint Education Center",
    location: "654 South Rd, Miami, FL",
    status: "pending",
    students: 0,
    classes: 0,
    contact: {
      email: "southpoint@eduhub.com",
      phone: "(305) 555-7890",
    },
  },
]

export default function CentersPage() {
  // Set up intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-slide-up")
            observer.unobserve(entry.target)
          }
        })
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      },
    )

    // Get all elements with animation classes
    const animatedElements = document.querySelectorAll(".scroll-animation")
    animatedElements.forEach((el) => observer.observe(el))

    return () => {
      animatedElements.forEach((el) => observer.unobserve(el))
    }
  }, [])

  return (
    <MainLayout breadcrumbs={[{ label: "Centers" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 scroll-animation">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Education Centers</h1>
          <Button className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900">
            <Plus className="h-4 w-4 mr-2" />
            Add New Center
          </Button>
        </div>

        <Card className="scroll-animation animation-delay-200 bg-white dark:bg-[#0F0F12] border border-white dark:border-[#1F1F23]">
          <CardHeader className="pb-3">
            <CardTitle>All Centers</CardTitle>
            <CardDescription>Manage all education centers registered with EduHub</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input type="search" placeholder="Search centers..." className="pl-9 w-full" />
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Classes</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {centers.map((center, index) => (
                    <TableRow
                      key={center.id}
                      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors scroll-animation animation-delay-${(index + 3) * 100}`}
                      onClick={() => (window.location.href = `/centers/${center.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-2 text-gray-700 dark:text-gray-300" />
                          {center.name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center">
                          <MapPin className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">{center.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            center.status === "active"
                              ? "success"
                              : center.status === "inactive"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {center.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{center.students}</TableCell>
                      <TableCell>{center.classes}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center">
                            <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">{center.contact.email}</span>
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">{center.contact.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/centers/${center.id}`
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">View details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
