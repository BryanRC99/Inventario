# Desplegar en Linux Mint con Docker

Este despliegue publica la app en un solo puerto: la interfaz y la API quedan en la misma dirección. PostgreSQL, los archivos cargados, los archivos privados y los respaldos se guardan en volúmenes Docker persistentes.

## 1. Publica estos cambios desde Windows

El servidor solo podrá descargar la configuración de despliegue después de que estos archivos estén en el repositorio. Desde PowerShell, en la carpeta del proyecto:

```powershell
git add .dockerignore .env.example Dockerfile compose.yaml deploy DEPLOY_LINUX_MINT.md config/settings.py requirements.txt frontend/Dockerfile frontend/deploy frontend/src/api/client.ts
git commit -m "Preparar despliegue con Docker"
git push origin
```

Si trabajas en otra rama, usa esa misma rama al descargar el proyecto en Mint.

## 2. Comprueba Docker en Mint

Abre una terminal y verifica:

```bash
docker run hello-world
docker compose version
```

Si `docker` da error de permisos, cierra sesión en Linux Mint y vuelve a entrar después de haber ejecutado `sudo usermod -aG docker $USER`.

## 3. Descarga el proyecto y prepara secretos

```bash
git clone https://github.com/BryanRC99/Inventario.git
cd Inventario
cp .env.example .env
nano .env
```

En `.env`, reemplaza `SECRET_KEY` y `DB_PASSWORD` por claves distintas y largas. Puedes generar una con:

```bash
openssl rand -hex 48
```

Deja `DEBUG=False`. Cambia `ALLOWED_HOSTS` a `localhost,127.0.0.1,IP_DEL_MINT`; por ejemplo, `localhost,127.0.0.1,10.10.10.101`. Guarda en nano con Ctrl+O, Enter y Ctrl+X. Protege el archivo:

```bash
chmod 600 .env
```

Para conocer la IP del Mint en la red local:

```bash
hostname -I
```

## 4. Levanta la app

Desde la carpeta `Inventario`:

```bash
docker compose up -d --build
docker compose ps
```

La primera compilación puede tardar unos minutos. Django crea las tablas y prepara los archivos estáticos al iniciar. Luego crea el primer usuario administrador:

```bash
docker compose exec backend python manage.py createsuperuser
```

En otro equipo de la misma red abre `http://IP_DEL_MINT/`. El panel de administración está en `http://IP_DEL_MINT/admin/`.

## 5. Red local y firewall

El puerto publicado es el 80. Asegúrate de que el firewall lo permita desde la subred real de tu casa/oficina. Los ejemplos previos habilitan `192.168.0.0/16`, pero si Mint tiene una IP como `10.10.10.101`, esa regla no corresponde a esa red. Para una red `10.10.10.x/24`, por ejemplo:

```bash
sudo ufw allow from 10.10.10.0/24 to any port 80
sudo ufw status verbose
```

Usa el rango que corresponda a tu router. El acceso es HTTP dentro de la red local; para publicarlo en Internet se debe configurar HTTPS y acceso externo por separado.

## Comandos útiles

```bash
docker compose logs -f              # ver actividad (Ctrl+C sale del visor)
docker compose restart              # reiniciar servicios
docker compose pull                 # traer imágenes base nuevas
docker compose up -d --build        # reconstruir y actualizar la app
docker compose down                 # apagar sin borrar datos
```

## Actualizar una instalación existente

Desde PowerShell en Windows, publica los cambios de la función que estés subiendo. Para la paginación de activos y el nombre de quien entrega/recibe en las actas:

```powershell
git add DEPLOY_LINUX_MINT.md inventario/views.py actas/models.py actas/serializers.py actas/migrations/0004_acta_entregadores.py actas/templates/actas/acta_pdf.html actas/templates/actas/acta_devolucion_pdf.html actas/templates/actas/acta_traslado_pdf.html frontend/src/api/actas.ts frontend/src/api/activos.ts frontend/src/components/acta-dialog.tsx frontend/src/components/ui/pagination.tsx frontend/src/pages/ActivosPage.tsx
git commit -m "Paginar activos y completar nombres en actas"
git push origin main
```

Cuando termine la subida, actualiza el servidor Mint desde la carpeta del proyecto:

```bash
git pull --ff-only origin main
docker compose up -d --build
docker compose ps
```

Al reconstruir, Docker ejecuta las migraciones pendientes automáticamente. No debes volver a importar activos ni cambiar el archivo `.env`. Al terminar, recarga la página web.

No uses `docker compose down -v` para apagar: `-v` borra también los volúmenes con la base de datos y archivos.

## Datos y respaldos

La primera ejecución crea una base de datos vacía: no importa automáticamente una base que exista en Windows. Los datos nuevos permanecen aunque actualices o apagues los contenedores. Para copiar datos existentes de otro servidor hace falta exportar e importar la base PostgreSQL y copiar también sus archivos.

La base está en el volumen `inventario_postgres_data`; archivos públicos, privados y respaldos tienen sus propios volúmenes. Mantén un respaldo externo de esos datos y del archivo `.env`, que contiene las claves necesarias para operar la instalación.
