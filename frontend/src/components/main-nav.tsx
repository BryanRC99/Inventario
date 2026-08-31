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
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'

type NavItem = { titulo: string; url: string; icon: typeof Boxes }

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

function DropdownGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className="h-7 px-2.5 text-xs">{label}</NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-36 gap-0 p-1">
          {items.map((item) => (
            <li key={item.url}>
              <NavLink
                to={item.url}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive && 'bg-accent text-accent-foreground font-medium',
                  )
                }
              >
                <item.icon className="size-3" />
                {item.titulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  )
}

export function MainNav() {
  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-1">
        <NavigationMenuItem>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                navigationMenuTriggerStyle(),
                'h-7 px-2.5 text-xs flex items-center gap-1.5',
                isActive && 'bg-accent text-accent-foreground',
              )
            }
          >
            <LayoutDashboard className="size-3" />
            Dashboard
          </NavLink>
        </NavigationMenuItem>

        <DropdownGroup label="Inventario" items={navInventario} />
        <DropdownGroup label="Custodia" items={navCustodia} />
        <DropdownGroup label="Trazabilidad" items={navTrazabilidad} />
        <DropdownGroup label="Administración" items={navAdmin} />
      </NavigationMenuList>
    </NavigationMenu>
  )
}