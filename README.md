# Contadito

Contadito Fullstack es una aplicación fullstack diseñada para brindar soluciones de gestión contable y administrativa de manera sencilla, intuitiva y eficiente. El objetivo del proyecto es digitalizar y facilitar tareas contables, administrativas y de gestión para pequeñas y medianas empresas o emprendimientos.

## Descripción del Proyecto

Este repositorio contiene tanto el frontend como el backend del proyecto **Contadito**. El sistema está desarrollado para ser escalable y adaptable, integrando tecnologías modernas de desarrollo web y móvil para ofrecer una experiencia de usuario óptima y una arquitectura robusta.

---

## Características Principales

- Gestión de cuentas, usuarios y permisos.
- Registro y seguimiento de movimientos contables.
- Panel de administración para visualizar reportes y estadísticas.
- Interfaz amigable y responsiva.
- API RESTful para integración con otros sistemas.
- Integración de IA (mediante Ollama local) para funcionalidades avanzadas.
- Base de datos relacional MySQL, con soporte para base de datos en memoria para pruebas rápidas.

---

## Funcionalidades de la Aplicación

### Frontend (App móvil - Expo React Native)

- **SplashScreen**: Pantalla de carga inicial que verifica el estado de autenticación y redirige al usuario.
- **LoginScreen**: Inicio de sesión seguro para usuarios registrados.
- **RegisterScreen**: Registro de nuevos usuarios con validaciones.
- **HomeScreen**: Panel principal con resumen de actividad, accesos a módulos contables y tutoriales interactivos.
- **OllamaChat**: Chat conversacional con IA local (Ollama) para asistencia y automatización.
- **GlobalSearch**: Búsqueda global de productos, clientes y entidades clave.
- **TutorialOverlay**: Tutoriales visuales que guían al usuario en el uso de la app.
- **UserScreen**: Gestión y edición del perfil de usuario.
- **StoreFront**: Visualización de catálogo de productos y acceso a detalles.
- **ProductDetail**: Consulta y gestión de detalles de productos.
- **CheckoutScreen**: Proceso de compra y confirmación de pedidos.
- **ProductsList/ProductForm**: Gestión integral de productos (alta, edición, búsqueda).
- **ReceivablesList**: Consultar y gestionar cuentas por cobrar.
- **SaleCreate**: Registrar nuevas ventas.
- **PurchaseCreate**: Registrar nuevas compras.
- **WarehousesList**: Consulta de almacenes e inventarios.
- **TenantSwitch**: Cambio rápido entre empresas o unidades de negocio.
- **Otros módulos**: Integración de clientes, reportes, almacenes, tutoriales, etc.

---

## Requerimientos Técnicos

### Frontend

- [Node.js](https://nodejs.org/) >= 18.x
- [npm](https://www.npmjs.com/) >= 9.x
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (para React Native)
- Emulador Android/iOS o dispositivo físico

### Backend

- [.NET 9.0 o superior](https://dotnet.microsoft.com/en-us/download)
- Base de datos: MySQL (o modo in-memory para pruebas rápidas)
- Variables de entorno para configuración de la base de datos, llaves secretas y parámetros de IA (Ollama)
- Ollama local instalado y corriendo (para integración de IA)

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Diego23685/contadito-fullstack.git
cd contadito-fullstack
```

### 2. Instalación de dependencias

### Instalacion de la base de datos

- Ejecucion del script de base de datos .sql en el workbench de mysql o en el cli de mysql server.

#### Backend (.NET)
```bash
cd backend
dotnet restore
```

#### Frontend (React Native Expo)
```bash
cd ../frontend
npm install
```

### 3. Configuración de variables de entorno

- Para el **backend**, crea un archivo `appsettings.Development.json` o utiliza variables de entorno según la documentación de .NET, agregando la cadena de conexión a MySQL y otros datos sensibles requeridos (como configuración de Ollama).
- Para el **frontend**, crea un archivo `.env` siguiendo el ejemplo provisto (por ejemplo: `.env.example`).

### 4. Ejecución del proyecto

#### Backend (.NET)
```bash
cd backend
dotnet run
```

#### Frontend (React Native Expo)
En otra terminal:
```bash
cd frontend
npx expo start
```

---

## Manual de Uso

1. **Inicio y autenticación**
   - Al abrir la app, verás la pantalla de carga (Splash).
   - Si tienes cuenta, ingresa tus credenciales en la pantalla de Login.
   - Si no tienes cuenta, regístrate en la pantalla de Registro.

2. **Navegación principal**
   - Accede al panel principal (Home) donde verás el resumen de actividad, accesos rápidos y notificaciones importantes.
   - Utiliza la barra de navegación y el menú para moverte entre módulos: productos, ventas, compras, almacenes, cuentas por cobrar, clientes, etc.

3. **Funcionalidad de chat con IA**
   - En el módulo de OllamaChat puedes consultar dudas, pedir asistencia o automatizar tareas usando el chat con IA local.

4. **Gestión de productos y ventas**
   - Desde StoreFront consulta el catálogo, agrega productos, edita información o visualiza detalles en ProductDetail.
   - Registra ventas (SaleCreate) y compras (PurchaseCreate) fácilmente con formularios guiados.

5. **Gestión administrativa**
   - Consulta cuentas por cobrar (ReceivablesList) y almacenes (WarehousesList).
   - Cambia de empresa o unidad con TenantSwitch si tu perfil lo permite.

6. **Aprendizaje y tutorial**
   - Si eres nuevo, sigue los tutoriales interactivos (CoachmarkTutorial y TutorialOverlay) que te guían paso a paso por las funciones principales.

7. **Perfil y configuración**
   - Accede al UserScreen para ver y editar tus datos, cambiar contraseña o cerrar sesión.

---

**Desarrollado por PapuThink**