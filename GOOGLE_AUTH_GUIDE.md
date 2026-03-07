# Guía: Obtener Credenciales de Google (client_secret.json)

Para que OpenMota pueda acceder a tu Gmail, Calendario y Drive, necesitamos crear un proyecto en la consola de Google. Sigue estos pasos:

### 1. Crear Proyecto en Google Cloud
1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Arriba a la izquierda, haz clic en el selector de proyectos y luego en **"New Project"**.
3. Ponle un nombre (ej: `OpenMota-Agent`) y dale a **Create**.

### 2. Habilitar las APIs
En el buscador de arriba, busca y dale a **Enable** a las siguientes 3 APIs:
- **Gmail API**
- **Google Calendar API**
- **Google Drive API**

### 3. Configurar Pantalla de Consentimiento (OAuth Consent Screen)
1. En el menú lateral izquierdo, ve a **APIs & Services > OAuth consent screen**.
2. Elige **External** y dale a **Create**.
3. Rellena los datos obligatorios (App name, User support email, Developer contact info). Lo demás déjalo por defecto.
4. En **Scopes**, añade: `.../auth/gmail.modify`, `.../auth/calendar`, y `.../auth/drive.file`.
5. **IMPORTANTE:** En **Test users**, añade tu propio correo de Gmail. Si no te añades aquí, no podrás entrar.

### 4. Crear el archivo JSON
1. Ve a **APIs & Services > Credentials**.
2. Haz clic en **+ Create Credentials > OAuth client ID**.
3. En Application type, elige **Desktop App**.
4. Ponle un nombre y dale a **Create**.
5. Te saldrá una ventana con tus claves. Haz clic en **DOWNLOAD JSON**.
6. Cambia el nombre del archivo descargado a `client_secret.json` y súbelo a la carpeta del proyecto.

---

# Persistencia en Dokploy (Muy Importante)

Para que no tengas que loguearte cada vez que el bot se reinicie en la nube, haremos lo siguiente:

1. **Volumen Persistente**: En el panel de Dokploy, añadiremos un volumen que apunte a `/root/.config/gog`. Ahí es donde la herramienta guarda tu sesión.
2. **Setup Inicial**: Una vez subamos el `client_secret.json`, ejecutaremos un comando especial para que el bot te dé el enlace de login por Telegram una sola vez.
