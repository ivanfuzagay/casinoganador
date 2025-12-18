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
      let phoneNumber, message;

      // Intentar obtener desde Redis (solo el número, el mensaje siempre viene de la variable de entorno)
      if (redis) {
        try {
          const ns = getRedisNamespace(req);
          phoneNumber = await redis.get(`${ns}:phone_number`);
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
        message: message
      });
    } catch (error) {
      console.error('Error al obtener el número:', error);
      return res.status(500).json({ error: 'Error al obtener el número de teléfono' });
    }
  }

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

      // Guardar en Redis si está disponible
      // NOTA: El mensaje NO se actualiza, solo se guarda el número de teléfono
      // El mensaje siempre viene de la variable de entorno WHATSAPP_MESSAGE
      console.log('Intentando guardar. Redis disponible:', !!redis);
      console.log('REDIS_URL presente:', !!process.env.REDIS_URL);
      
      if (redis) {
        try {
          // Solo guardar el número de teléfono, el mensaje no se modifica
          const ns = getRedisNamespace(req);
          await redis.set(`${ns}:phone_number`, phone);
          
          return res.status(200).json({
            success: true,
            message: '¡Número actualizado correctamente en Redis!'
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
