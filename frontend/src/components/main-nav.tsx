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
  Building2,
} from 'lucide-react'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useAuth } from '@/context/AuthContext'

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
  { titulo: 'Áreas', url: '/areas', icon: Building2 },
]

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return cn(
    isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
  )
}

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  if (items.length === 0) return null

  return (
    <SidebarGroup className="py-0">
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
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'admin'
  const esConsulta = usuario?.rol === 'consulta'

  // Un usuario de solo consulta tiene un menú mínimo: nada más que
  // "Mis Activos". No ve Dashboard ni ningún módulo de gestión.
  if (esConsulta) {
    return (
      <SidebarMenu className="px-2 pt-2">
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Mis Activos"
            render={<NavLink to="/mis-activos" className={navLinkClassName} />}
          >
            <Boxes />
            <span>Mis Activos</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const navAdminVisible = esAdmin
    ? navAdmin
    : navAdmin.filter((item) => item.url !== '/usuarios' && item.url !== '/areas')

  return (
    <div className="flex flex-col gap-0">
      <SidebarMenu className="px-2 pt-2">
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

      <NavSection label="Inventario" items={navInventario} />
      <NavSection label="Custodia" items={navCustodia} />
      <NavSection label="Trazabilidad" items={navTrazabilidad} />
      <NavSection label="Administración" items={navAdminVisible} />
    </div>
  )
}