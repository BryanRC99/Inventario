from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from actas.escaneos import sha256_de_archivo
from actas.models import ActaEscaneo


class Command(BaseCommand):
    help = 'Verifica que cada escaneo de acta exista en disco, mida lo esperado y conserve su huella SHA-256. También detecta archivos huérfanos.'

    def handle(self, *args, **opts):
        problemas = 0
        total = 0
        referenciados = set()
        for esc in ActaEscaneo.objects.select_related('acta').iterator():
            total += 1
            nombre = esc.archivo.name
            referenciados.add(nombre)
            marca = '(eliminado) ' if esc.eliminado else ''
            try:
                if esc.archivo.size != esc.tamano:
                    problemas += 1
                    self.stdout.write(self.style.ERROR(f'{marca}TAMAÑO DISTINTO  {esc.id} {nombre}'))
                    continue
                if sha256_de_archivo(esc.archivo) != esc.sha256:
                    problemas += 1
                    self.stdout.write(self.style.ERROR(f'{marca}ALTERADO (huella no coincide)  {esc.id} {nombre}'))
            except FileNotFoundError:
                problemas += 1
                self.stdout.write(self.style.ERROR(f'{marca}FALTA EN DISCO  {esc.id} {nombre}'))

        raiz = Path(settings.PRIVATE_MEDIA_ROOT) / 'actas_escaneadas'
        huerfanos = []
        if raiz.exists():
            for f in raiz.rglob('*'):
                if f.is_file() and f.relative_to(settings.PRIVATE_MEDIA_ROOT).as_posix() not in referenciados:
                    huerfanos.append(f)
        for f in huerfanos:
            self.stdout.write(self.style.WARNING(f'HUÉRFANO (en disco, sin registro)  {f}'))

        self.stdout.write(f'Revisados: {total} | Problemas: {problemas} | Huérfanos: {len(huerfanos)}')
        if problemas:
            raise CommandError('Se encontraron escaneos faltantes o alterados. Restaure desde el respaldo.')
        self.stdout.write(self.style.SUCCESS('Todos los escaneos están íntegros.'))
