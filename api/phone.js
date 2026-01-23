// API para obtener y actualizar el número de teléfono con Redis
import Redis from 'ioredis';

// Inicializar Redis si la variable de entorno está disponible
let redis = null;
try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
    console.log('Redis inicializado correctamente');
    
    // Verificar conexión
    redis.on('connect', () => {
      console.log('Conectado a Redis');
    });
    
    redis.on('error', (err) => {
      console.error('Error de conexión a Redis:', err);
    });
  } else {
    console.log('Redis no configurado: falta REDIS_URL');
  }
} catch (error) {
  console.error('Error al inicializar Redis:', error.message);
  redis = null;
}

function getRedisNamespace(req) {
  // Recomendado: definir REDIS_NAMESPACE distinto por proyecto en Vercel
  const ns = (process.env.REDIS_NAMESPACE || '').trim();
  if (ns) return ns;

  // Fallback (no recomendado para multi-entorno): usar host si no hay namespace explícito.
  // Esto puede variar entre preview/prod o entre dominios, por eso es mejor setear REDIS_NAMESPACE.
  const host = (req?.headers?.host || '').trim();
  return host ? `host:${host}` : 'default';
}

/**
 * Normaliza un número de teléfono al formato WhatsApp: 54911xxxxxxxx (13 dígitos exactos)
 * - Remueve espacios, guiones, paréntesis, y el símbolo +
 * - Agrega código de país 54 si falta (o solo el 4 si empieza con 5)
 * - Agrega prefijo móvil 9 si falta
 * - Agrega código de área 11 (Buenos Aires) si falta, pero respeta si ya tiene otro código
 * @param {string} phoneNumber - Número de teléfono en cualquier formato
 * @returns {string} - Número normalizado en formato 54911xxxxxxxx (13 dígitos)
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  // Limpiar: remover espacios, guiones, paréntesis, y el símbolo +
  let cleaned = phoneNumber.toString().replace(/[\s\-\(\)\+]/g, '');
  
  // Extraer solo dígitos
  cleaned = cleaned.replace(/\D/g, '');
  
  if (!cleaned) return '';
  
  // Código de país Argentina
  const countryCode = '54';
  // Prefijo móvil
  const mobilePrefix = '9';
  // Código de área por defecto (Buenos Aires)
  const defaultAreaCode = '11';
  
  let digits = cleaned;
  
  // Paso 1: Manejar código de país (54)
  // Si empieza con 54, removerlo para procesar el resto
  if (digits.startsWith('54')) {
    digits = digits.substring(2);
  } 
  // Si empieza con 5 pero no con 54, agregar solo el 4 después del 5 (le falta el 4)
  else if (digits.startsWith('5')) {
    // Reemplazar el 5 inicial por 54 (agregar 4 después del 5)
    // Ejemplo: 591157542802 -> 5491157542802
    digits = '54' + digits.substring(1);
    // Ahora remover el 54 que acabamos de agregar para procesar el resto
    digits = digits.substring(2);
  }
  // Si no empieza con 5 ni 54, agregar 54 completo al inicio
  else {
    digits = countryCode + digits;
    // Remover el 54 para procesar el resto
    digits = digits.substring(2);
  }
  
  // Paso 2: Manejar prefijo móvil (9)
  // Si después del código de país tiene 9, removerlo
  if (digits.startsWith('9')) {
    digits = digits.substring(1);
  }
  // Si no empieza con 9, agregarlo (pero lo removemos para procesar)
  else {
    digits = mobilePrefix + digits;
    digits = digits.substring(1);
  }
  
  // Detectar código de área (2 dígitos) y número local (8 dígitos para completar 13)
  // Estructura objetivo: 54 (2) + 9 (1) + código área (2) + número local (8) = 13 dígitos
  let areaCode = defaultAreaCode;
  let localNumber = digits;
  
  // Si tiene 10 o más dígitos después de remover 54 y 9,
  // los primeros 2 dígitos son el código de área
  if (digits.length >= 10) {
    areaCode = digits.substring(0, 2);
    localNumber = digits.substring(2);
  } 
  // Si tiene entre 6-9 dígitos, es solo el número local sin código de área
  else if (digits.length >= 6 && digits.length < 10) {
    areaCode = defaultAreaCode;
    localNumber = digits;
  } 
  // Menos de 6 dígitos, usar código por defecto
  else {
    areaCode = defaultAreaCode;
    localNumber = digits;
  }
  
  // Asegurar que el número local tenga exactamente 8 dígitos
  // Si tiene más de 8, tomar solo los últimos 8
  // Si tiene menos de 8, rellenar con ceros al inicio (aunque esto no debería pasar normalmente)
  if (localNumber.length > 8) {
    localNumber = localNumber.substring(localNumber.length - 8);
  } else if (localNumber.length < 8) {
    // Rellenar con ceros al inicio si tiene menos de 8 dígitos
    localNumber = localNumber.padStart(8, '0');
  }
  
  // Construir el formato final: 54 + 9 + código_de_área + número_local
  const normalized = countryCode + mobilePrefix + areaCode + localNumber;
  
  // Validar que tenga exactamente 13 dígitos
  if (normalized.length !== 13) {
    console.warn(`Número normalizado tiene ${normalized.length} dígitos, esperado 13: ${normalized}`);
  }
  
  return normalized;
}

export default async function handler(req, res) {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      let phoneNumber, message, changeCount = 0;

      // Intentar obtener desde Redis (solo el número, el mensaje siempre viene de la variable de entorno)
      if (redis) {
        try {
          const ns = getRedisNamespace(req);
          phoneNumber = await redis.get(`${ns}:phone_number`);
          // Obtener el contador de cambios
          const countStr = await redis.get(`${ns}:change_count`);
          changeCount = countStr ? parseInt(countStr, 10) : 0;
        } catch (redisError) {
          // Si Redis falla, usar variables de entorno
          console.log('Error al obtener de Redis, usando variables de entorno:', redisError);
        }
      }
      // Fallback a variables de entorno o valores por defecto
      // El mensaje SIEMPRE viene de la variable de entorno, nunca de Redis
      phoneNumber = phoneNumber || process.env.PHONE_NUMBER || '5491157552283';
      message = process.env.WHATSAPP_MESSAGE || '¡Buen4s!%20Me%20gust4rí4%20cre4r%20un%20usu4rio.%20Mi%20nombre%20es:';
      
      return res.status(200).json({
        phone: phoneNumber,
        message: message,
        changeCount: changeCount
      });
    } catch (error) {
      console.error('Error al obtener el número:', error);
      return res.status(500).json({ error: 'Error al obtener el número de teléfono' });
    }
  }

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

      // Validar que se haya proporcionado un número
      if (!phone) {
        return res.status(400).json({ error: 'Número de teléfono requerido' });
      }

      // Normalizar el número de teléfono al formato WhatsApp
      const normalizedPhone = normalizePhoneNumber(phone);
      
      // Validar que el número normalizado tenga al menos 10 dígitos (54 + 9 + código área + número local mínimo)
      if (normalizedPhone.length < 10) {
        return res.status(400).json({ error: 'Número de teléfono inválido. El número debe tener al menos 6 dígitos locales.' });
      }

      // Log para debugging
      console.log(`Número original: ${phone} → Normalizado: ${normalizedPhone}`);

      // Guardar en Redis si está disponible
      // NOTA: El mensaje NO se actualiza, solo se guarda el número de teléfono
      // El mensaje siempre viene de la variable de entorno WHATSAPP_MESSAGE
      console.log('Intentando guardar. Redis disponible:', !!redis);
      console.log('REDIS_URL presente:', !!process.env.REDIS_URL);
      
      if (redis) {
        try {
          // Solo guardar el número de teléfono normalizado, el mensaje no se modifica
          const ns = getRedisNamespace(req);
          await redis.set(`${ns}:phone_number`, normalizedPhone);
          
          // Incrementar el contador de cambios
          const currentCount = await redis.get(`${ns}:change_count`);
          const newCount = currentCount ? parseInt(currentCount, 10) + 1 : 1;
          await redis.set(`${ns}:change_count`, newCount.toString());
          
          return res.status(200).json({
            success: true,
            message: `¡Número actualizado correctamente! Guardado como: ${normalizedPhone}`,
            changeCount: newCount,
            normalizedPhone: normalizedPhone
          });
        } catch (redisError) {
          // Si Redis falla, mostrar error claro
          console.error('Error al guardar en Redis:', redisError);
          return res.status(500).json({ 
            error: 'Error al guardar en Redis: ' + (redisError.message || 'Error desconocido') + '. Verifica que REDIS_URL esté correctamente configurada.'
          });
        }
      } else {
        // Si Redis no está disponible, devolver un error informativo
        return res.status(500).json({ 
          error: process.env.REDIS_URL 
            ? 'Redis está configurado pero no se pudo inicializar. Verifica que REDIS_URL tenga el formato correcto (redis://...). Revisa los logs de Vercel para más detalles.'
            : 'Redis no está configurado. Ve a Vercel → Storage → Create Database → Redis, y conéctalo a tu proyecto. La variable REDIS_URL se configurará automáticamente.'
        });
      }
    } catch (error) {
      console.error('Error al actualizar:', error);
      return res.status(500).json({ error: 'Error al actualizar el número de teléfono' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
