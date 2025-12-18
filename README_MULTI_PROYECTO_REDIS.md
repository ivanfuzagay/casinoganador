# Guía (sin cambios aplicados) — Reutilizar **una sola Redis** para varios proyectos sin que se pisen

Si tenés varios proyectos en Vercel usando **el mismo `REDIS_URL`**, todos comparten la misma base Redis.  
Si además guardás el número con una clave fija (por ejemplo `phone_number`), entonces **al actualizar en un proyecto, cambia en todos**.

La solución (sin crear más Redis) es usar **namespacing**: cada proyecto guarda/lee el número desde una clave distinta, por ejemplo:

- `proyecto-a:phone_number`
- `proyecto-b:phone_number`

---

## Qué hay que modificar (conceptualmente) en el código

En tu proyecto actual, el archivo responsable es:
- `api/phone.js`

Ahí hoy se usa una clave fija:
- `redis.get('phone_number')`
- `redis.set('phone_number', phone)`

### Cambio 1: definir un prefijo por proyecto (namespace)

La forma más estable es agregar **una variable de entorno por proyecto**, por ejemplo:
- `REDIS_NAMESPACE=joker_prueba`

Luego en `api/phone.js`, construir la clave así:
- `const keyPhone = \`\${process.env.REDIS_NAMESPACE}:phone_number\`;`

Y usar:
- `redis.get(keyPhone)`
- `redis.set(keyPhone, phone)`

### Cambio 2 (opcional): no depender del host para el prefijo

Podrías usar el dominio (`req.headers.host`) como prefijo, pero **no es recomendable** porque:
- cambia entre preview/prod
- incluye `www` a veces
- puede variar entre dominios personalizados y el `*.vercel.app`

Por eso, la opción recomendada es **`REDIS_NAMESPACE` fijo por proyecto**.

---

## Qué NO hay que cambiar

- **No hace falta cambiar nombres de archivos.**  
  El patrón se mantiene: `api/phone.js`, `admin.html`, `index.html`, etc.
- **No hace falta cambiar el mensaje de WhatsApp.**  
  En tu implementación actual, el mensaje viene de `WHATSAPP_MESSAGE` (variable de entorno) y no se guarda en Redis.

---

## Qué configurar en Vercel (por proyecto)

En cada proyecto en Vercel (Settings → Environment Variables), agregar:

- `REDIS_URL` (**igual en todos**) → misma Redis compartida
- `REDIS_NAMESPACE` (**distinto en cada proyecto**) → separa datos por proyecto
- `PHONE_NUMBER` (opcional, fallback)
- `WHATSAPP_MESSAGE` (fijo)
- `ADMIN_PASSWORD`

Ejemplos:

- Proyecto A:
  - `REDIS_NAMESPACE=joker_a`
- Proyecto B:
  - `REDIS_NAMESPACE=joker_b`
- Proyecto C:
  - `REDIS_NAMESPACE=joker_c`

---

## Checklist de implementación en otro proyecto (sin entrar al detalle del HTML)

1. Copiar el mismo sistema (`api/phone.js`, `admin.html`, `package.json`, `vercel.json`) al nuevo repo.
2. En Vercel, conectar el proyecto a la **misma** Redis (mismo `REDIS_URL`).
3. Agregar `REDIS_NAMESPACE` único para ese proyecto.
4. Modificar `api/phone.js` para que use claves con prefijo (`${REDIS_NAMESPACE}:phone_number`).
5. Deploy.

---

## Resultado esperado

Con esto:
- al actualizar el número desde `admin.html` en el Proyecto A, se guarda en `joker_a:phone_number`
- el Proyecto B seguirá leyendo `joker_b:phone_number`

Así **no se pisan** aunque todos compartan el mismo `REDIS_URL`.


