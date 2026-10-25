import hashlib
import os

from django.core.management.base import BaseCommand, CommandError

from actas.almacenamiento import almacen_privado
from actas.models import ActaEscaneo


class Command(BaseCommand):
    help = (
        'Verifica que cada escaneo de acta exista en disco y que no haya cambiado '
        '(tamaño y huella SHA-256). Termina con error si encuentra problemas, para '
        'poder usarlo en una tarea programada (cron) con aviso.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--rapido', action='store_true',
                            help='Solo comprueba existencia y tamaño (no calcula la huella).')

    def handle(self, *args, **opciones):
        problemas = []
        total = 0
        conocidos = set()

        for escaneo in ActaEscaneo.objects.select_related('acta__activo').order_by('fecha_subida').iterator():
            total += 1
            nombre = escaneo.archivo.name
            conocidos.add(nombre)
            etiqueta = f'{escaneo.acta.activo.codigo_interno} · {escaneo.nombre_original} ({escaneo.id})'

            if not almacen_privado.exists(nombre):
                problemas.append(f'FALTA     {etiqueta}')
                continue
            if almacen_privado.size(nombre) != escaneo.tamano:
                problemas.append(f'TAMAÑO    {etiqueta}: cambió de tamaño')
                continue
            if not opciones['rapido']:
                sha = hashlib.sha256()
                with almacen_privado.open(nombre, 'rb') as f:
                    for bloque in iter(lambda: f.read(1024 * 1024), b''):
                        sha.update(bloque)
                if sha.hexdigest() != escaneo.sha256:
                    problemas.append(f'ALTERADO  {etiqueta}: la huella no coincide')

        huerfanos = []
        raiz = almacen_privado.location
        if os.path.isdir(raiz):
            for carpeta, _, archivos in os.walk(raiz):
                for archivo in archivos:
                    relativo = os.path.relpath(os.path.join(carpeta, archivo), raiz).replace(os.sep, '/')
                    if relativo not in conocidos:
                        huerfanos.append(relativo)

        self.stdout.write(f'Escaneos revisados: {total}')
        for p in problemas:
            self.stderr.write(self.style.ERROR(p))
        for h in huerfanos:
            self.stdout.write(self.style.WARNING(f'HUÉRFANO  {h}: está en disco pero no en la base de datos'))

        if problemas:
            raise CommandError(f'Se encontraron {len(problemas)} problema(s). Restaura esos archivos desde el respaldo.')
        self.stdout.write(self.style.SUCCESS('Todo correcto: no se detectaron archivos faltantes ni alterados.'))
