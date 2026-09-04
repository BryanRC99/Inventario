import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar'

import { MainNav } from '@/components/main-nav'
import { NavUser } from '@/components/nav-user'

export function AppSidebar() {
  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
    >

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