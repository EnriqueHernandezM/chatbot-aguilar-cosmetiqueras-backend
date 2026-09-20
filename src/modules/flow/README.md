# Flow configurable por tenant

Este modulo permite que cada tenant use un flujo conversacional distinto sin modificar el webhook.

La ruta activa es:

1. `WebhookService` resuelve el `Tenant` por `phoneNumberId`.
2. `WebhookService` llama a `TenantFlowRouterService`.
3. `TenantFlowRouterService` selecciona una configuracion por `tenant.slug`.
4. `FlowRoutergit add Service` ejecuta el step actual usando `ConversationState`.
5. El handler del step genera la respuesta.

## Archivos clave

- `tenant-slug.enum.ts`: slugs conocidos de tenants.
- `tenant-flow-router.service.ts`: selecciona la config segun `tenant.slug`.
- `flow-router.service.ts`: orquesta el flujo segun `initialState`, `steps` y `ConversationState`.
- `flows/*.flow.ts`: configuraciones por tenant.
- `flows/current-flow.factory.ts`: factory para crear el flujo actual como base.
- `handlers/*.handler.ts`: comportamientos reutilizables.
- `interfaces/flow-config.interface.ts`: tipos de configuracion.

## Estados disponibles

Los flujos usan los estados existentes:

```ts
ConversationState.MENU;
ConversationState.SHOW_MODELS;
ConversationState.SHOW_DYNAMICS;
ConversationState.SHOW_DELIVERY;
ConversationState.SHOW_LOCATION;
ConversationState.SHOW_HOW_TO_BUY;
ConversationState.POST_INFO_MENU;
ConversationState.CAPTURE_QUOTE_DATA;
ConversationState.OPEN_QUESTION;
ConversationState.WAITING_HUMAN;
ConversationState.HUMAN_HANDOFF;
```

No agregues estados nuevos salvo que sea una decision explicita.

## Tipos de handler

Cada step define un `type`:

- `menu`: lee la respuesta del usuario y decide segun `options`.
- `info_message`: responde un mensaje configurado y avanza a `nextState`.
- `capture_quote_data`: parsea datos de cotizacion, crea lead y marca venta potencial.
- `open_question`: responde y normalmente pasa a atencion humana.
- `human_handoff`: no responde desde bot.

## Modificar un tenant existente

Ejemplo: modificar `otro-tenan`.

Archivo:

```txt
src/modules/flow/flows/otro-tenan.flow.ts
```

Ese archivo exporta:

```ts
export const otroTenanFlowConfig = createCurrentFlowConfig({
  initialState: ConversationState.SHOW_MODELS,
  steps: {
    ...
  },
});
```

Para cambiar el estado inicial:

```ts
initialState: ConversationState.MENU;
```

o:

```ts
initialState: ConversationState.HUMAN_HANDOFF;
```

Para modificar el comportamiento de un estado, sobrescribe su step:

```ts
[ConversationState.MENU]: {
  state: ConversationState.MENU,
  type: 'open_question',
  response: {
    reply: 'Gracias. Te atenderemos en breve.',
    nextState: ConversationState.WAITING_HUMAN,
  },
}
```

## Agregar un tenant nuevo

1. Agrega el slug en `tenant-slug.enum.ts`:

```ts
export enum TenantSlug {
  NUEVO_TENANT = 'nuevo-tenant',
}
```

2. Crea un archivo en `flows/`:

```txt
src/modules/flow/flows/nuevo-tenant.flow.ts
```

Ejemplo base:

```ts
import { ConversationState } from '../../../common/enums/conversation-state.enum';
import { createCurrentFlowConfig } from './current-flow.factory';

export const nuevoTenantFlowConfig = createCurrentFlowConfig({
  initialState: ConversationState.MENU,
  steps: {
    [ConversationState.MENU]: {
      state: ConversationState.MENU,
      type: 'open_question',
      response: {
        reply: 'Gracias. Te atenderemos en breve.',
        nextState: ConversationState.WAITING_HUMAN,
      },
    },
  },
});
```

3. Registra la config en `flows/index.ts`:

```ts
import { nuevoTenantFlowConfig } from './nuevo-tenant.flow';

export const flowConfigsByTenantSlug = {
  [TenantSlug.NUEVO_TENANT]: nuevoTenantFlowConfig,
};
```

## Ejemplo de menu configurable

```ts
[ConversationState.POST_INFO_MENU]: {
  state: ConversationState.POST_INFO_MENU,
  type: 'menu',
  options: {
    '1': {
      reply: 'Te compartimos tiempos de entrega.',
      nextState: ConversationState.SHOW_DELIVERY,
    },
    '2': {
      reply: 'Perfecto. Un asesor te atendera en breve.',
      nextState: ConversationState.WAITING_HUMAN,
    },
  },
  fallback: {
    reply: 'No entendi tu respuesta. Elige una opcion.',
    nextState: ConversationState.POST_INFO_MENU,
  },
}
```

## Reglas para cambios seguros

- No modifiques `WebhookService` para cambiar flujos.
- No modifiques schemas para cambiar flujos.
- No cambies `ConversationState` si solo quieres reordenar pasos.
- Cambia el flujo desde `flows/<tenant>.flow.ts`.
- Si necesitas un comportamiento nuevo, crea un handler general en `handlers/` y agrega su tipo a `flow-config.interface.ts`.
- No pongas logica de cliente dentro de handlers; el contenido debe vivir en la config del tenant.

## Validar cambios

Comandos recomendados:

```bash
npm.cmd run build
npm.cmd test -- flow-router.service.spec.ts tenant-flow-router.service.spec.ts conversation-flow.service.spec.ts
```
