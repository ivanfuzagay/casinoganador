# Panel de Administración - JokerCrazy

## Configuración Inicial

### 1. Variables de Entorno en Vercel

Ve a tu proyecto en Vercel y configura las siguientes variables de entorno:

- `PHONE_NUMBER`: Número de teléfono por defecto (ej: `5491157552283`)
- `WHATSAPP_MESSAGE`: Mensaje por defecto para WhatsApp (ej: `¡Buen4s!%20Me%20gust4rí4%20cre4r%20un%20usu4rio.%20Mi%20nombre%20es:`)
- `ADMIN_PASSWORD`: Contraseña para acceder al panel de administración (ej: `tu_contraseña_segura`)

**Cómo configurar:**
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega las variables mencionadas arriba
4. Haz un nuevo deploy

### 2. Acceder al Panel de Administración

Una vez desplegado, accede a:
```
https://tu-dominio.vercel.app/admin.html
```

### 3. Usar el Panel

1. Ingresa la contraseña de administrador (la que configuraste en `ADMIN_PASSWORD`)
2. Ingresa el nuevo número de teléfono (sin espacios ni guiones)
3. Opcionalmente, actualiza el mensaje de WhatsApp
4. Haz clic en "Actualizar Número"

## Configuración de Persistencia con Redis (Recomendado)

Para que los cambios sean **permanentes** sin necesidad de hacer commit a GitHub, configura **Redis** (Upstash):

### Pasos para configurar Redis:

1. Ve a tu proyecto en Vercel
2. Ve a la pestaña **Storage**
3. Haz clic en **Create Database**
4. Selecciona **Redis** (Upstash)
5. Crea la base de datos y conéctala a tu proyecto
6. **Vercel configurará automáticamente** las variables de entorno `REDIS_URL` y `REDIS_TOKEN`
7. Haz un nuevo deploy

**Nota:** La versión actual (`api/phone.js`) funciona sin Redis usando variables de entorno, pero los cambios no se persisten entre deploys. Con Redis configurado, los cambios se guardan permanentemente.

**Importante:** Después de crear la base de datos Redis en Vercel, las variables `REDIS_URL` y `REDIS_TOKEN` se configuran automáticamente. No necesitas configurarlas manualmente.

## Estructura del Proyecto

- `index.html`: Página principal que carga el número dinámicamente
- `admin.html`: Panel de administración para cambiar el número
- `api/phone.js`: Función serverless que maneja GET y POST del número
- `vercel.json`: Configuración de Vercel

