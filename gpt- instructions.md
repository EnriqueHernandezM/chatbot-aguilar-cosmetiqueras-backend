# Proyecto: chatbot_distribuidora_aguilar

## Resumen

Este proyecto es un backend en NestJS para operar un chatbot de WhatsApp orientado a atencion comercial, cotizaciones y handoff a asesores humanos.

Tecnologias principales:

- NestJS
- TypeScript
- Mongoose / MongoDB
- WhatsApp Cloud API
- Jest

## Objetivo del sistema

Recibir mensajes desde WhatsApp, crear o actualizar conversaciones, responder con un flujo guiado, registrar mensajes y permitir que un asesor humano tome control cuando el bot no puede continuar o cuando el usuario quiere hablar con una persona.

## Estructura principal

Codigo fuente en:

- `src/`

Modulos principales:

- `src/modules/webhook`
  Recibe eventos entrantes de WhatsApp y coordina el flujo principal.

- `src/modules/flow`
  Contiene la logica conversacional y define las respuestas segun el estado actual.

- `src/modules/conversations`
  Maneja conversaciones, asignaciones, estados, lectura y toma manual por agentes.

- `src/modules/messages`
  Guarda y consulta mensajes asociados a una conversacion.

- `src/modules/users`
  Autenticacion de usuarios internos y manejo de sesiones con JWT.

- `src/modules/leads`
  Registra leads o solicitudes de cotizacion.

- `src/modules/whatsapp`
  Encapsula llamadas a la API de WhatsApp para enviar textos e imagenes.

## Flujo general del webhook

Archivo clave:

- `src/modules/webhook/webhook.service.ts`

Secuencia actual:

1. Extrae el mensaje entrante desde el payload de Meta.
2. Evita duplicados con `waMessageId`.
3. Busca o crea la conversacion por `waId`.
4. Toma un lock temporal para evitar procesamiento simultaneo.
5. Guarda el mensaje del usuario.
6. Si no es texto, responde que solo procesa texto.
7. Ejecuta el motor de flujo en `ConversationFlowService`.
8. Actualiza el estado de la conversacion.
9. Envia la respuesta principal del bot.
10. Si aplica, envia acciones adicionales como:
   - texto con `PAGE_URL`
   - imagen de modelos
   - respuestas adicionales del flujo
11. Guarda los mensajes del bot en base de datos.
12. Libera el lock.

## Estados de conversacion

Enum:

- `src/common/enums/conversation-state.enum.ts`

Estados relevantes:

- `MENU`
- `SHOW_MODELS`
- `SHOW_DYNAMICS`
- `SHOW_DELIVERY`
- `SHOW_LOCATION`
- `CAPTURE_QUOTE_DATA`
- `OPEN_QUESTION`
- `WAITING_HUMAN`
- `HUMAN_HANDOFF`

## Status de conversacion

Enum:

- `src/common/enums/conversation-status.enum.ts`

Valores:

- `active`
- `waiting_human`
- `closed`

Regla importante:

- Cuando una conversacion pasa a `WAITING_HUMAN` o `HUMAN_HANDOFF`, normalmente el status operativo queda en `waiting_human`.

## Logica actual del flujo

Archivo clave:

- `src/modules/flow/conversation-flow.service.ts`

### Menu principal

Opciones:

- `1` Modelos y precios
- `2` Dinamica de compra
- `3` Tiempos de entrega
- `4` Ubicacion
- `5` Hablar con un asesor

### Segundo mensaje automatico

Despues de responder en estos estados:

- `SHOW_MODELS`
- `SHOW_DYNAMICS`
- `SHOW_DELIVERY`
- `SHOW_LOCATION`

el sistema envia una segunda respuesta separada con:

`¿Cómo te gustaría continuar? 😊`

Opciones:

- `1` Tengo una duda
- `2` Generar cotizacion
- `3` Volver al menu

### Acciones del submenu

- `1`
  Lleva a flujo de duda / atencion humana.

- `2`
  Lleva a captura de datos para cotizacion.

- `3`
  Regresa al menu principal.

## Logica especial para modelos

Cuando `nextState === SHOW_MODELS`, el webhook puede hacer acciones extra:

1. Enviar el mensaje principal del flujo.
2. Si existe `process.env.PAGE_URL`, enviar un texto con la URL.
3. Si existe imagen configurada, enviar la imagen de modelos.
4. Enviar el submenu de continuacion como mensaje adicional.

Variables usadas:

- `MODELS_IMAGE_MONTERREY`
- `MODELS_IMAGE_NATIONAL`
- `PAGE_URL`

## Conversaciones y toma manual

Archivos clave:

- `src/modules/conversations/conversations.controller.ts`
- `src/modules/conversations/conversations.service.ts`

Endpoint importante:

- `PATCH /conversations/:id/take`

Comportamiento:

- Usa el usuario autenticado desde `req.user.sub`
- Asigna la conversacion a ese usuario
- Cambia el status a `waiting_human`
- Cambia el estado a `HUMAN_HANDOFF`
- Marca `lastReadAt`

Tambien existe:

- `PATCH /conversations/:id/assign`
- `PATCH /conversations/:id/status`
- `PATCH /conversations/:id/read`
- `PATCH /conversations/:id/sale`
- `GET /conversations`
- `DELETE /conversations`

## Autenticacion

Archivos clave:

- `src/common/auth/guards/jwt-auth.guard.ts`
- `src/common/auth/interfaces/authenticated-request.interface.ts`

Notas:

- La aplicacion usa JWT guard global.
- El usuario autenticado se adjunta en `req.user`.
- `req.user.sub` contiene el id del usuario.

## Esquema de conversacion

Archivo:

- `src/modules/conversations/schemas/conversation.schema.ts`

Campos importantes:

- `waId`
- `currentState`
- `status`
- `assignedTo`
- `origin`
- `lockUntil`
- `lastMessageAt`
- `lastReadAt`
- `isPotentialSale`
- `isClosedSale`

## Variables de entorno importantes

Segun el codigo actual:

- `WHATSAPP_PHONE_ID`
- `WHATSAPP_TOKEN`
- `MODELS_IMAGE_MONTERREY`
- `MODELS_IMAGE_NATIONAL`
- `PAGE_URL`

Puede haber otras variables definidas en `.env` para base de datos, JWT u otros servicios.

## Archivos que conviene revisar antes de cambiar logica

- `src/modules/webhook/webhook.service.ts`
- `src/modules/flow/conversation-flow.service.ts`
- `src/modules/conversations/conversations.service.ts`
- `src/modules/messages/messages.service.ts`
- `src/modules/whatsapp/whatsapp.service.ts`
- `src/common/enums/conversation-state.enum.ts`
- `src/common/enums/conversation-status.enum.ts`

## Convenciones utiles del proyecto

- La conversacion se identifica por `waId`.
- Cada mensaje entrante se guarda antes de responder.
- Las respuestas del bot tambien se guardan en base de datos.
- El flujo depende del `currentState` de la conversacion.
- Para evitar carreras, el webhook usa `acquireLock` y `releaseLock`.
- Cuando el bot no puede resolver algo, el flujo suele escalar a estados humanos.

## Pruebas utiles

Comandos usados recientemente:

```bash
npm test -- webhook.service.spec.ts
npm test -- conversations.controller.spec.ts conversations.service.spec.ts
npm run build
```

## Nota para futuras tareas con GPT

Si se va a modificar logica conversacional:

- revisar primero `ConversationFlowService`
- revisar despues `WebhookService` para efectos colaterales de envio
- confirmar si la respuesta debe enviarse como un solo texto o como mensajes separados
- verificar si el cambio debe reflejarse tambien en `status`, `currentState` o `assignedTo`
- agregar o actualizar tests del modulo afectado
