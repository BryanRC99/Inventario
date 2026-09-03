import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar'

import { MainNav } from '@/components/main-nav'
import { NavUser } from '@/components/nav-user'

export function AppSidebar() {
  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
    >
      {/* HEADER */}
      <SidebarHeader>
        <div className="flex h-10 items-center px-2">
          <span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Inventario
          </span>
        </div>
      </SidebarHeader>

      {/* NAVIGATION */}
      <SidebarContent>
        <MainNav />
      </SidebarContent>

      {/* USER */}
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}