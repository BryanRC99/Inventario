import { Outlet } from 'react-router-dom'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

import { AppSidebar } from '@/components/app-sidebar'
import { ModeToggle } from '@/components/mode-toggle'

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="flex h-15 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
          <SidebarTrigger className="-ml-1" />

          <div className="ml-auto flex items-center gap-1">
            <ModeToggle />
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}