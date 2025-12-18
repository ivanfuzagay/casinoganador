// Versión mejorada con Vercel KV para persistencia real
// Para usar esta versión, renombra este archivo a phone.js después de configurar Vercel KV

import { kv } from '@vercel/kv';

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

      // Intentar obtener desde Vercel KV
      try {
        phoneNumber = await kv.get('phone_number');
        message = await kv.get('whatsapp_message');
      } catch (kvError) {
        console.log('Vercel KV no configurado, usando variables de entorno');
      }

      // Fallback a variables de entorno o valores por defecto
      phoneNumber = phoneNumber || process.env.PHONE_NUMBER || '5491157552283';
      message = message || process.env.WHATSAPP_MESSAGE || '¡Buen4s!%20Me%20gust4rí4%20cre4r%20un%20usu4rio.%20Mi%20nombre%20es:';
      
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
      const { phone, message, password } = req.body;

      // Verificar contraseña
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      if (password !== adminPassword) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }

      // Validar número de teléfono
      if (!phone || !/^\d+$/.test(phone.replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Número de teléfono inválido' });
      }

      // Guardar en Vercel KV si está disponible
      try {
        await kv.set('phone_number', phone);
        if (message) {
          await kv.set('whatsapp_message', message);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Número actualizado correctamente en Vercel KV'
        });
      } catch (kvError) {
        // Si Vercel KV no está configurado, solo validamos
        console.log('Vercel KV no disponible:', kvError);
        return res.status(200).json({
          success: true,
          message: 'Validación exitosa. Configura Vercel KV para persistencia permanente.'
        });
      }
    } catch (error) {
      console.error('Error al actualizar:', error);
      return res.status(500).json({ error: 'Error al actualizar el número de teléfono' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

