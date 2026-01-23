# Guía de Implementación - Contador de Cambios

Esta guía explica cómo implementar el contador de cambios que registra cada vez que se actualiza el número de teléfono desde el panel de administración.

## 📋 Descripción

El contador de cambios es un sistema que:
- ✅ Cuenta automáticamente cada vez que se actualiza el número de teléfono
- ✅ Se guarda en Redis con el mismo namespace que el número
- ✅ Se muestra en el panel de administración
- ✅ Funciona independientemente en cada proyecto (gracias al namespacing)
- ✅ Incluye un botón para resetear el contador manualmente

## 🔧 Cambios Necesarios

### 1. Modificar `api/phone.js`

Necesitas hacer **tres cambios** en el archivo `api/phone.js`:

#### Cambio 1: En el método GET (obtener contador)

**Busca esta sección:**
```javascript
if (req.method === 'GET') {
  try {
    let phoneNumber, message;
    
    if (redis) {
      try {
        const ns = getRedisNamespace(req);
        phoneNumber = await redis.get(`${ns}:phone_number`);
      } catch (redisError) {
        console.log('Error al obtener de Redis, usando variables de entorno:', redisError);
      }
    }
    
    phoneNumber = phoneNumber || process.env.PHONE_NUMBER || '5491157552283';
    message = process.env.WHATSAPP_MESSAGE || '¡Buen4s!%20Me%20gust4rí4%20cre4r%20un%20usu4rio.%20Mi%20nombre%20es:';
    
    return res.status(200).json({
      phone: phoneNumber,
      message: message
    });
```

**Reemplázala por:**
```javascript
if (req.method === 'GET') {
  try {
    let phoneNumber, message, changeCount = 0;
    
    if (redis) {
      try {
        const ns = getRedisNamespace(req);
        phoneNumber = await redis.get(`${ns}:phone_number`);
        // Obtener el contador de cambios
        const countStr = await redis.get(`${ns}:change_count`);
        changeCount = countStr ? parseInt(countStr, 10) : 0;
      } catch (redisError) {
        console.log('Error al obtener de Redis, usando variables de entorno:', redisError);
      }
    }
    
    phoneNumber = phoneNumber || process.env.PHONE_NUMBER || '5491157552283';
    message = process.env.WHATSAPP_MESSAGE || '¡Buen4s!%20Me%20gust4rí4%20cre4r%20un%20usu4rio.%20Mi%20nombre%20es:';
    
    return res.status(200).json({
      phone: phoneNumber,
      message: message,
      changeCount: changeCount
    });
```

#### Cambio 2: En el método POST (incrementar contador)

**Busca esta sección:**
```javascript
if (redis) {
  try {
    const ns = getRedisNamespace(req);
    await redis.set(`${ns}:phone_number`, phone);
    
    return res.status(200).json({
      success: true,
      message: '¡Número actualizado correctamente en Redis!'
    });
```

**Reemplázala por:**
```javascript
if (redis) {
  try {
    const ns = getRedisNamespace(req);
    await redis.set(`${ns}:phone_number`, phone);
    
    // Incrementar el contador de cambios
    const currentCount = await redis.get(`${ns}:change_count`);
    const newCount = currentCount ? parseInt(currentCount, 10) + 1 : 1;
    await redis.set(`${ns}:change_count`, newCount.toString());
    
    return res.status(200).json({
      success: true,
      message: '¡Número actualizado correctamente en Redis!',
      changeCount: newCount
    });
```

#### Cambio 3: En el método POST (agregar soporte para resetear contador)

**Busca esta sección al inicio del método POST:**
```javascript
if (req.method === 'POST') {
  try {
    const { phone, password } = req.body;

    // Verificar contraseña
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (password !== adminPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Validar número de teléfono
    if (!phone || !/^\d+$/.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Número de teléfono inválido' });
    }
```

**Reemplázala por:**
```javascript
if (req.method === 'POST') {
  try {
    const { phone, password, reset } = req.body;

    // Verificar contraseña
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (password !== adminPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Si es un reset del contador, solo resetear y retornar
    if (reset === true) {
      if (redis) {
        try {
          const ns = getRedisNamespace(req);
          await redis.set(`${ns}:change_count`, '0');
          return res.status(200).json({
            success: true,
            message: '¡Contador reseteado correctamente!',
            changeCount: 0
          });
        } catch (redisError) {
          console.error('Error al resetear contador en Redis:', redisError);
          return res.status(500).json({ 
            error: 'Error al resetear el contador: ' + (redisError.message || 'Error desconocido')
          });
        }
      } else {
        return res.status(500).json({ 
          error: 'Redis no está configurado. No se puede resetear el contador.'
        });
      }
    }

    // Validar número de teléfono
    if (!phone || !/^\d+$/.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Número de teléfono inválido' });
    }
```

### 2. Modificar `admin.html`

Necesitas hacer **cuatro cambios** en el archivo `admin.html`:

#### Cambio 1: Agregar el contador en el HTML

**Busca esta sección:**
```html
<div class="current-info" id="currentInfo">
    <p><strong>Número actual:</strong> <span id="currentPhone">Cargando...</span></p>
    <p><strong>Mensaje actual:</strong> <span id="currentMessage">Cargando...</span></p>
</div>
```

**Reemplázala por:**
```html
<div class="current-info" id="currentInfo">
    <p><strong>Número actual:</strong> <span id="currentPhone">Cargando...</span></p>
    <p><strong>Mensaje actual:</strong> <span id="currentMessage">Cargando...</span></p>
    <p><strong>Cambios realizados:</strong> <span id="changeCount" style="color: #38ff00; font-size: 1.2em; font-weight: bold;">0</span> <button id="resetBtn" class="reset-btn">Resetear</button></p>
</div>
```

#### Cambio 2: Actualizar la función `loadCurrentInfo()`

**Busca esta función:**
```javascript
async function loadCurrentInfo() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        document.getElementById('currentPhone').textContent = data.phone || 'No disponible';
        document.getElementById('currentMessage').textContent = decodeURIComponent(data.message || 'No disponible');
    } catch (error) {
        console.error('Error al cargar información:', error);
        document.getElementById('currentPhone').textContent = 'Error al cargar';
    }
}
```

**Reemplázala por:**
```javascript
async function loadCurrentInfo() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        document.getElementById('currentPhone').textContent = data.phone || 'No disponible';
        document.getElementById('currentMessage').textContent = decodeURIComponent(data.message || 'No disponible');
        document.getElementById('changeCount').textContent = data.changeCount !== undefined ? data.changeCount : '0';
    } catch (error) {
        console.error('Error al cargar información:', error);
        document.getElementById('currentPhone').textContent = 'Error al cargar';
    }
}
```

#### Cambio 3: Actualizar el contador después de actualizar

**Busca esta sección dentro del manejo del formulario:**
```javascript
if (response.ok) {
    messageDiv.className = 'message success';
    messageDiv.textContent = data.message || '¡Número actualizado correctamente!';
    messageDiv.style.display = 'block';
    
    // Recargar información actual
    setTimeout(() => {
        loadCurrentInfo();
    }, 1000);
}
```

**Reemplázala por:**
```javascript
if (response.ok) {
    messageDiv.className = 'message success';
    messageDiv.textContent = data.message || '¡Número actualizado correctamente!';
    messageDiv.style.display = 'block';
    
    // Actualizar contador inmediatamente si viene en la respuesta
    if (data.changeCount !== undefined) {
        document.getElementById('changeCount').textContent = data.changeCount;
    }
    
    // Recargar información actual
    setTimeout(() => {
        loadCurrentInfo();
    }, 1000);
}
```

#### Cambio 4: Agregar estilos y funcionalidad del botón de reset

**Busca la sección de estilos (dentro de `<style>`) y agrega estos estilos:**
```css
.reset-btn {
    background: #ff4444;
    color: #fff;
    border: none;
    border-radius: 5px;
    padding: 5px 10px;
    font-size: 0.8em;
    cursor: pointer;
    margin-left: 10px;
    transition: background 0.3s;
}

.reset-btn:hover {
    background: #cc0000;
}

.reset-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}
```

**Agrega esta función JavaScript antes del cierre de `</script>` (después de `loadCurrentInfo()`):**
```javascript
// Manejar reset del contador
document.getElementById('resetBtn').addEventListener('click', async () => {
    const password = document.getElementById('password').value;
    if (!password) {
        alert('Por favor ingresa la contraseña de administrador primero');
        return;
    }

    if (!confirm('¿Estás seguro de que quieres resetear el contador a 0?')) {
        return;
    }

    const resetBtn = document.getElementById('resetBtn');
    const messageDiv = document.getElementById('message');

    resetBtn.disabled = true;
    resetBtn.textContent = 'Reseteando...';
    messageDiv.className = 'message';
    messageDiv.style.display = 'none';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                reset: true,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.className = 'message success';
            messageDiv.textContent = data.message || '¡Contador reseteado correctamente!';
            messageDiv.style.display = 'block';
            
            // Actualizar contador inmediatamente
            document.getElementById('changeCount').textContent = '0';
        } else {
            messageDiv.className = 'message error';
            messageDiv.textContent = data.error || 'Error al resetear el contador';
            messageDiv.style.display = 'block';
        }
    } catch (error) {
        messageDiv.className = 'message error';
        messageDiv.textContent = 'Error de conexión. Verifica que estés en Vercel.';
        messageDiv.style.display = 'block';
    } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = 'Resetear';
    }
});
```

## ✅ Checklist de Implementación

Para replicar el contador en otro proyecto:

- [ ] Copiar los cambios en `api/phone.js` (GET, POST con reset)
- [ ] Copiar los cambios en `admin.html` (HTML, estilos, loadCurrentInfo, reset handler, y actualización después de POST)
- [ ] Verificar que Redis esté configurado en Vercel
- [ ] Verificar que `REDIS_NAMESPACE` esté configurado (recomendado)
- [ ] Hacer commit y push
- [ ] Verificar que el contador aparezca en el panel de administración
- [ ] Verificar que el botón "Resetear" aparezca al lado del contador
- [ ] Probar actualizando el número y verificar que el contador se incremente
- [ ] Probar el botón de reset y verificar que el contador vuelva a 0

## 🎯 Cómo Funciona

1. **Primera actualización**: El contador comienza en 0. Al actualizar el número por primera vez, se crea la clave `${REDIS_NAMESPACE}:change_count` con valor `1`.

2. **Actualizaciones posteriores**: Cada vez que se actualiza el número:
   - Se obtiene el valor actual del contador desde Redis
   - Se incrementa en 1
   - Se guarda el nuevo valor
   - Se devuelve en la respuesta para actualizar la UI inmediatamente

3. **Namespacing**: Cada proyecto tiene su propio contador gracias al namespace:
   - Proyecto A: `proyecto-a:change_count`
   - Proyecto B: `proyecto-b:change_count`
   - etc.

## 📝 Notas Importantes

- El contador **solo funciona si Redis está configurado**. Si Redis no está disponible, el contador mostrará `0` pero no se incrementará.
- El contador es **independiente por proyecto** gracias al sistema de namespacing.
- El contador **no se resetea** automáticamente. Puedes resetearlo manualmente usando el botón "Resetear" en el panel de administración (requiere contraseña de administrador).
- El contador comienza desde `1` en la primera actualización (no desde `0`).
- El botón de reset requiere que ingreses la contraseña de administrador antes de poder usarlo.

## 🔍 Verificación

Después de implementar los cambios:

1. Ve al panel de administración: `https://tu-dominio.vercel.app/admin.html`
2. Deberías ver "Cambios realizados: 0" (o el número actual si ya hay cambios) con un botón "Resetear" al lado
3. Actualiza el número de teléfono
4. El contador debería incrementarse a `1`
5. Actualiza nuevamente y debería incrementarse a `2`, y así sucesivamente
6. Para resetear: ingresa la contraseña de administrador y haz clic en "Resetear". Confirma la acción y el contador debería volver a `0`

## 🐛 Solución de Problemas

### El contador no aparece
- Verifica que hayas agregado el elemento `<span id="changeCount">` en el HTML
- Verifica que la función `loadCurrentInfo()` esté actualizando el contador

### El contador no se incrementa
- Verifica que Redis esté configurado correctamente
- Verifica los logs de Vercel para ver si hay errores al guardar en Redis
- Verifica que el método POST esté incrementando el contador correctamente

### El contador muestra valores incorrectos
- Verifica que el namespace sea correcto (cada proyecto debe tener su propio `REDIS_NAMESPACE`)
- Verifica que no haya conflictos con otros proyectos usando la misma Redis sin namespace

### El botón de reset no funciona
- Verifica que hayas ingresado la contraseña de administrador antes de hacer clic en "Resetear"
- Verifica que Redis esté configurado correctamente
- Verifica los logs de Vercel para ver si hay errores al resetear el contador
- Verifica que el método POST esté manejando el parámetro `reset: true` correctamente

---

**¿Necesitas ayuda?** Revisa el código de referencia en este proyecto o los logs en Vercel.
