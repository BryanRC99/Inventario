import { NavLink } from 'react-router-dom'
import {
  Boxes,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  MapPin,
  Tags,
  Truck,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

import { cn } from '@/lib/utils'

type NavItem = {
  titulo: string
  url: string
  icon: typeof Boxes
}

const navInventario: NavItem[] = [
  { titulo: 'Activos', url: '/activos', icon: Boxes },
  { titulo: 'Categorías', url: '/categorias', icon: Tags },
  { titulo: 'Ubicaciones', url: '/ubicaciones', icon: MapPin },
]

const navCustodia: NavItem[] = [
  { titulo: 'Custodios', url: '/personas', icon: Users },
  { titulo: 'Custodias', url: '/custodias', icon: ClipboardList },
  { titulo: 'Actas de entrega', url: '/actas-entrega', icon: FileText },
]

const navTrazabilidad: NavItem[] = [
  { titulo: 'Movimientos', url: '/movimientos', icon: History },
  { titulo: 'Mantenimientos', url: '/mantenimientos', icon: Wrench },
]

const navAdmin: NavItem[] = [
  { titulo: 'Proveedores', url: '/proveedores', icon: Truck },
  { titulo: 'Usuarios', url: '/usuarios', icon: UserCog },
]

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return cn(
    isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
  )
}

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>

      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon

            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  tooltip={item.titulo}
                  render={<NavLink to={item.url} className={navLinkClassName} />}
                >
                  <Icon />
                  <span>{item.titulo}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function MainNav() {
  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Dashboard"
                render={<NavLink to="/" end className={navLinkClassName} />}
              >
                <LayoutDashboard />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <NavSection label="Inventario" items={navInventario} />
      <NavSection label="Custodia" items={navCustodia} />
      <NavSection label="Trazabilidad" items={navTrazabilidad} />
      <NavSection label="Administración" items={navAdmin} />
    </>
  )
}