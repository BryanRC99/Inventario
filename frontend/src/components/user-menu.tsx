import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'

function getIniciales(nombre: string) {
    return nombre
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')
}

export function UserMenu() {
    const { usuario, logout } = useAuth()

    if (!usuario) return null

    const nombreMostrado = usuario.nombre_completo || usuario.username

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex h-7 items-center gap-1.5 px-1.5">
                    <Avatar className="size-6">
                        <AvatarFallback className="text-[10px]">{getIniciales(nombreMostrado)}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-xs font-medium sm:inline">{nombreMostrado}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="capitalize text-xs text-muted-foreground">
                    {usuario.rol}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                    <LogOut />
                    Cerrar sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}