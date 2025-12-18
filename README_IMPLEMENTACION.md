# Guía de Implementación - Panel de Administración con Redis

Esta guía explica cómo implementar el sistema de panel de administración para cambiar números de teléfono de WhatsApp dinámicamente en cualquier proyecto similar.

## 📋 Requisitos Previos

- Proyecto desplegado en Vercel
- Acceso a la configuración de Vercel (variables de entorno y Storage)
- Repositorio Git conectado a Vercel

## 📁 Archivos Necesarios

### Archivos a Copiar (sin modificar)

1. **`api/phone.js`** - Función serverless que maneja GET y POST del número
2. **`admin.html`** - Panel de administración completo
3. **`package.json`** - Dependencias necesarias (o agregar `ioredis` a tu package.json existente)
4. **`vercel.json`** - Configuración de Vercel para las funciones serverless

### Archivos a Adaptar

1. **`index.html`** - Tu página principal (necesita modificaciones)

## 🚀 Pasos de Implementación

### Paso 1: Copiar Archivos Base

1. **Crea la carpeta `api/`** en la raíz de tu proyecto (si no existe)
2. **Copia `api/phone.js`** desde este proyecto a `api/phone.js` de tu nuevo proyecto
3. **Copia `admin.html`** a la raíz de tu nuevo proyecto
4. **Copia `vercel.json`** a la raíz de tu nuevo proyecto

#### Si ya tienes un `package.json`:

Agrega esta dependencia a tu `package.json`:

```json
{
  "dependencies": {
    "ioredis": "^5.3.2"
  }
}
```

#### Si NO tienes un `package.json`:

Crea uno con este contenido:

```json
{
  "name": "tu-proyecto",
  "version": "1.0.0",
  "description": "Tu descripción",
  "scripts": {
    "dev": "vercel dev"
  },
  "dependencies": {
    "ioredis": "^5.3.2"
  }
}
```

### Paso 2: Adaptar tu `index.html`

Tu `index.html` necesita dos cambios:

#### 2.1. Modificar el botón de WhatsApp

**ANTES:**
```html
<a href="https://api.whatsapp.com/send?phone=5491157552283&text=..." 
   class="cta-button" target="_blank">
    <i class='fab fa-whatsapp'></i> ¡Crea tu usuario!
</a>
```

**DESPUÉS:**
```html
<a href="#" 
   id="whatsapp-button"
   class="cta-button" 
   target="_blank">
    <i class='fab fa-whatsapp'></i> ¡Crea tu usuario!
</a>
```

**Cambios importantes:**
- Cambiar `href` de la URL completa a `#`
- Agregar `id="whatsapp-button"` (este ID es importante)

#### 2.2. Agregar el script JavaScript

Agrega este script **antes del cierre de `</body>`** en tu `index.html`:

```html
<script>
    // Cargar número de teléfono dinámicamente desde la API
    async function loadPhoneNumber() {
        try {
            const response = await fetch('/api/phone');
            const data = await response.json();
            
            // Reemplaza estos valores con tus números/mensajes por defecto
            const phone = data.phone || '5491157552283';
            const message = data.message || '¡Buen4s!%20Me%20gust4rí4%20cre4r%20un%20usu4rio.%20Mi%20nombre%20es:';
            
            const whatsappButton = document.getElementById('whatsapp-button');
            whatsappButton.href = `https://api.whatsapp.com/send?phone=${phone}&text=${message}`;
        } catch (error) {
            console.error('Error al cargar el número de teléfono:', error);
            // Fallback al número por defecto si hay error
            const whatsappButton = document.getElementById('whatsapp-button');
            whatsappButton.href = 'https://api.whatsapp.com/send?phone=5491157552283&text=¡Buen4s!%20Me%20gust4rí4%20cre4r%20un%20usu4rio.%20Mi%20nombre%20es:';
        }
    }

    // Cargar cuando la página esté lista
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPhoneNumber);
    } else {
        loadPhoneNumber();
    }
</script>
```

**⚠️ Importante:** Reemplaza los valores por defecto (`5491157552283` y el mensaje) con los de tu proyecto.

### Paso 3: Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega las siguientes variables:

| Variable | Valor de Ejemplo | Descripción |
|----------|------------------|-------------|
| `PHONE_NUMBER` | `5491157552283` | Número de teléfono por defecto |
| `WHATSAPP_MESSAGE` | `¡Buen4s!%20Me%20gust4rí4%20cre4r%20un%20usu4rio.%20Mi%20nombre%20es:` | Mensaje por defecto (URL-encoded) |
| `ADMIN_PASSWORD` | `admin123` | Contraseña para acceder al panel de administración |

**Nota sobre `WHATSAPP_MESSAGE`:**
- Debe estar en formato URL-encoded
- Los espacios se reemplazan por `%20`
- Los caracteres especiales deben estar codificados
- Este mensaje **NO se puede cambiar** desde el panel, solo desde variables de entorno

### Paso 4: Configurar Redis en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a la pestaña **Storage**
3. Haz clic en **Create Database**
4. Selecciona **Redis**
5. Crea la base de datos (puedes usar el nombre por defecto)
6. **Vercel conectará automáticamente** la base de datos a tu proyecto
7. Se configurará automáticamente la variable `REDIS_URL`

**✅ Verificación:** Después de crear Redis, verifica en **Settings** → **Environment Variables** que aparezca `REDIS_URL` automáticamente.

### Paso 5: Hacer Deploy

1. Haz commit de todos los cambios:
   ```bash
   git add .
   git commit -m "Agregar panel de administración con Redis"
   git push
   ```

2. Vercel desplegará automáticamente los cambios

3. Espera 1-2 minutos a que termine el deploy

## 🎯 Verificar que Funciona

### 1. Verificar la API

Visita: `https://tu-dominio.vercel.app/api/phone`

Deberías ver un JSON con:
```json
{
  "phone": "5491157552283",
  "message": "¡Buen4s!%20Me%20gust4rí4%20cre4r%20un%20usu4rio.%20Mi%20nombre%20es:"
}
```

### 2. Verificar el Panel de Administración

Visita: `https://tu-dominio.vercel.app/admin.html`

Deberías ver el panel de administración. Ingresa:
- **Contraseña:** La que configuraste en `ADMIN_PASSWORD`
- **Número de teléfono:** Cualquier número (ej: `5491143443600`)
- Haz clic en "Actualizar Número"

### 3. Verificar que el Número se Actualiza

1. Visita tu página principal: `https://tu-dominio.vercel.app/`
2. Abre las herramientas de desarrollador (F12)
3. Inspecciona el botón de WhatsApp
4. Verifica que el `href` tenga el nuevo número que actualizaste

## 📝 Estructura Final del Proyecto

Tu proyecto debería tener esta estructura:

```
tu-proyecto/
├── api/
│   └── phone.js          ← Función serverless
├── admin.html            ← Panel de administración
├── index.html            ← Tu página principal (modificada)
├── package.json          ← Con dependencia ioredis
├── vercel.json           ← Configuración de Vercel
└── ... (tus otros archivos)
```

## 🔧 Personalización (Opcional)

### Cambiar Estilos del Panel

Puedes modificar los estilos en `admin.html` buscando la sección `<style>` y cambiando:
- Colores (busca `#38ff00` para el verde)
- Fuentes
- Tamaños
- Espaciados

### Cambiar el Mensaje de WhatsApp

El mensaje **NO se puede cambiar** desde el panel. Para cambiarlo:

1. Ve a Vercel → Settings → Environment Variables
2. Edita `WHATSAPP_MESSAGE`
3. Haz un nuevo deploy

**Nota:** El mensaje debe estar en formato URL-encoded.

## ❓ Solución de Problemas

### Error 500 al intentar actualizar

**Causa:** Redis no está configurado o las variables no están disponibles.

**Solución:**
1. Verifica que Redis esté creado en Vercel → Storage
2. Verifica que `REDIS_URL` aparezca en Environment Variables
3. Revisa los logs en Vercel → Deployments → Functions → `api/phone`

### El número no se actualiza en la página principal

**Causa:** El script no está cargando o el `id` del botón es incorrecto.

**Solución:**
1. Verifica que el botón tenga `id="whatsapp-button"`
2. Abre la consola del navegador (F12) y busca errores
3. Verifica que la API funcione: `https://tu-dominio.vercel.app/api/phone`

### El panel muestra "Redis no configurado"

**Causa:** Redis no está conectado al proyecto.

**Solución:**
1. Ve a Vercel → Storage
2. Verifica que Redis esté creado
3. Si está creado pero no conectado, haz clic en "Connect" o "Link"
4. Haz un nuevo deploy

## 📚 Archivos de Referencia

- `api/phone.js` - Lógica del servidor
- `admin.html` - Interfaz del panel
- `README_ADMIN.md` - Documentación del panel (en este proyecto)

## ✅ Checklist de Implementación

- [ ] Copiar `api/phone.js` a `api/phone.js`
- [ ] Copiar `admin.html` a la raíz
- [ ] Copiar o actualizar `package.json` con `ioredis`
- [ ] Copiar `vercel.json` a la raíz
- [ ] Modificar `index.html` (agregar `id` al botón y script)
- [ ] Configurar variables de entorno en Vercel (`PHONE_NUMBER`, `WHATSAPP_MESSAGE`, `ADMIN_PASSWORD`)
- [ ] Crear Redis en Vercel (Storage → Create Database → Redis)
- [ ] Verificar que `REDIS_URL` aparezca automáticamente
- [ ] Hacer commit y push
- [ ] Verificar que el deploy funcione
- [ ] Probar el panel de administración
- [ ] Verificar que el número se actualice en la página principal

## 🎉 ¡Listo!

Una vez completados todos los pasos, tendrás un sistema completo donde:
- ✅ Puedes cambiar el número de teléfono desde el panel sin tocar código
- ✅ Los cambios se guardan permanentemente en Redis
- ✅ El mensaje de WhatsApp se mantiene fijo (desde variables de entorno)
- ✅ No necesitas hacer commit a GitHub para cambiar números

---

**¿Necesitas ayuda?** Revisa los logs en Vercel o verifica que todos los archivos estén en su lugar.

