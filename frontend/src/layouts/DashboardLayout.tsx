import { Outlet } from 'react-router-dom'
import { Boxes } from 'lucide-react'
import { MainNav } from '@/components/main-nav'
import { ModeToggle } from '@/components/mode-toggle'
import { UserMenu } from '@/components/user-menu'

export default function DashboardLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-11 shrink-0 items-center gap-5 border-b px-4 sm:px-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Boxes className="size-3.5" />
          Inventario
        </div>

        <MainNav />

        <div className="ml-auto flex items-center gap-1">
          <ModeToggle />
          <UserMenu />
        </div>
      </header>

      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}