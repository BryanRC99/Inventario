import { useState } from 'react'
import { ChevronsUpDown, KeyRound, LogOut, UserCircle } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

import { useAuth } from '@/context/AuthContext'
import { PerfilDialog } from '@/components/perfil-dialog'
import { CambiarPasswordDialog } from '@/components/cambiar-password-dialog'

function getIniciales(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function NavUser() {
  const { usuario, logout } = useAuth()
  const { isMobile } = useSidebar()
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  if (!usuario) return null

  const nombreMostrado = usuario.nombre_completo || usuario.username

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {getIniciales(nombreMostrado)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{nombreMostrado}</span>
                    <span className="truncate text-xs text-muted-foreground capitalize">
                      {usuario.rol}
                    </span>
                  </div>

                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              }
            />

            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-muted-foreground capitalize">
                  {usuario.rol}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {usuario.rol !== 'consulta' && (
                  <DropdownMenuItem onClick={() => setPerfilOpen(true)}>
                    <UserCircle />
                    Mi perfil
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                  <KeyRound />
                  Cambiar contraseña
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <PerfilDialog open={perfilOpen} onOpenChange={setPerfilOpen} />
      <CambiarPasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  )
}