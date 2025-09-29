# Contadito

**Contadito Fullstack** es una aplicación full‑stack para gestión contable y administrativa, pensada para pymes y emprendimientos. Digitaliza y simplifica tareas clave: productos, ventas, compras, almacenes, cuentas por cobrar, reportes y más. Además integra **IA local (Ollama)** para insights y automatizaciones.

---

## Novedades

* **HomeScreen renovado**: panel lateral anclable (dock/flotante), KPIs de hoy/mes, comparativas con **GiftedCharts**, tablero visual, actividad reciente y estado del sistema.
* **Asesor IA** (Ollama + `qwen2.5:3b-instruct`): analiza KPIs/alertas y sugiere acciones priorizadas.
* **TutorialOverlay** con pasos **anclados** a controles reales (coach marks). Persistencia con `ctd_tutorial_v1_done`.
* **Importación de Excel** desde el panel lateral ("Importar Excel") con navegación a `ImportSummary`.
* **Pantallas nuevas**:

  * `SalesForecastScreen` (simulación/pronóstico; recibe `snapshot` desde Home y usa Ollama)
  * `UnitCostScreen` (cálculo de **costo unitario** en memoria, sin BD)
  * `ReportsScreen` (atajos a reportes clave)
  * `CartScreen` y `CheckoutScreen`
  * `ReceivableCreate` (alta rápida de CxC)
  * `WarehousesForm` (CRUD almacenes)
  * Mejoras en `GlobalSearch`, `ProductDetail`, `StoreFront`.
* **Diseño**: línea **Neuro/Canva** con paleta BRAND unificada, sombras suaves y chips/botones consistentes.

> *Ver lista completa de pantallas en* **[Módulos y pantallas](#módulos-y-pantallas)**.

---

## Descripción general

Este repositorio contiene **frontend (Expo React Native)** y **backend (.NET)**. El sistema es escalable y modular, con API RESTful, MySQL (o modo en memoria para pruebas) e integración de IA local.

---

## Requerimientos

### Frontend

* Node.js ≥ 20.x
* npm ≥ 9.x
* Expo CLI
* Emulador Android/iOS o dispositivo físico

### Backend

* .NET 9.0 o superior
* MySQL (o modo **in‑memory** para pruebas rápidas)
* Variables de entorno para cadena de conexión, secretos y configuración de IA (Ollama)
* **Ollama** instalado y corriendo localmente

---

## Instalación

### 1) Clonar

```bash
git clone https://github.com/Diego23685/contadito-fullstack.git
cd contadito-fullstack
```

### 2) Dependencias

**Backend**

```bash
cd backend
dotnet restore
```

**Frontend**

```bash
cd ../frontend
npm install
```

### 3) Base de datos

* Ejecuta el script `.sql` en MySQL Workbench o CLI para crear esquema/tablas iniciales.

### 4) Variables de entorno

**Backend** (`appsettings.Development.json` o variables de entorno)

```json
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Database=contadito;User Id=tu_usuario;Password=tu_password;"
  },
  "Jwt": {
    "Key": "<clave-secreta>",
    "Issuer": "Contadito",
    "Audience": "ContaditoUsers"
  },
  "Ollama": {
    "BaseUrl": "http://localhost:11434",
    "Model": "qwen2.5:3b-instruct"
  }
}
```

**Frontend** (`.env`)

```
EXPO_PUBLIC_API_BASE=http://10.0.2.2:5000   # Android emu
# EXPO_PUBLIC_API_BASE=http://localhost:5000 # iOS/web
EXPO_PUBLIC_OLLAMA_BASE=http://10.0.2.2:11434
EXPO_PUBLIC_OLLAMA_MODEL=qwen2.5:3b-instruct
```

> En código móvil, se usa `Platform` para elegir `http://10.0.2.2` (Android emu) vs `http://localhost` (iOS/web).

### 5) Ejecutar

**Backend**

```bash
cd backend
set ASPNETCORE_ENVIRONMENT=Development  # Windows (opcional)
# export ASPNETCORE_ENVIRONMENT=Development # macOS/Linux
 dotnet run
```

**Frontend** (en otra terminal)

```bash
cd frontend
npx expo start
```

---

## Módulos y pantallas

* **SplashScreen**: verificación inicial y routing por autenticación.
* **LoginScreen** / **RegisterScreen**: auth segura con validaciones.
* **HomeScreen**: panel principal con KPIs, comparativas, alertas, tablero visual, actividad, estado y **panel lateral** con accesos rápidos e **importación de Excel**.
* **GlobalSearch**: búsqueda global de productos/clientes/SKU.
* **OllamaChat**: chat con IA local para asistencia/automatización.
* **ReportsScreen**: entrada a reportes y estadísticas.
* **TutorialOverlay**: tutorial interactivo con *targets* anclados.
* **ProfitCompetitivenessScreen**: rentabilidad y competitividad.
* **SalesForecastScreen**: simulación y pronóstico (usa snapshot desde Home + Ollama).
* **UnitCostScreen**: cálculo de **costo unitario** de producción **en memoria** (sin BD).
* **CustomersList** / **CustomerForm**
* **ReceivablesList** / **ReceivableCreate**
* **ProductsList** / **ProductForm** / **ProductDetail**
* **StoreFront** (catálogo) / **CartScreen** / **CheckoutScreen**
* **SaleCreate** / **PurchaseCreate**
* **WarehousesList** / **WarehousesForm**
* **UserScreen**

> Nombres exactos provistos: `GlobalSearch`, `HomeScreen`, `LoginScreen`, `OllamaChat`, `RegisterScreen`, `ReportsScreen`, `SplashScreen`, `TutorialOverlay`, `ProfitCompetitivenessScreen`, `CustomerForm`, `CustomersList`, `ReceivableCreate`, `ReceivablesList`, `ProductForm`, `ProductList`, `PurchaseCreate`, `SaleCreate`, `SalesForecastScreen`, `CartScreen`, `CheckoutScreen`, `ProductDetail`, `StoreFront`, `UnitCostScreen`, `UserScreen`, `WarehousesForm`, `WarehousesList`.

---

## Flujo de trabajo clave

### 1) Importación de Excel de productos

* Desde **Home → Panel lateral → Importar Excel**.
* Usa `importExcelProducts({ api, fetchDashboard, OLLAMA_BASE, OLLAMA_MODEL })`.
* Al finalizar, navega a `ImportSummary` con un resumen `{ created, updated, skipped }`.
* Recomendado: columnas mínimas `sku`, `name`, `price`, `stock` (puedes mapear otras).

### 2) Asesor IA (Home → Alertas)

* Construye contexto JSON con KPIs, `lowStock`, `receivablesDueSoon`.
* Envía chat a Ollama (`/api/chat`, modelo `qwen2.5:3b-instruct`, `temperature: 0.2`).
* Devuelve JSON con `resumen`, `acciones[]`, `prioridadGeneral`.

### 3) Pronóstico de ventas

* Botón **“Simulación y pronóstico”** en Home.
* Navega a `SalesForecastScreen` con props: `{ snapshot, ollamaBase, ollamaModel }`.

### 4) Costo unitario de producción (en memoria)

* Desde Home o menú: **UnitCost**.
* Calcula costo unitario sin persistencia (ideal para pruebas/what‑if).

### 5) Tutorial interactivo

* **TutorialOverlay** con `steps` y `targets` (medidos vía `measureInWindow`).
* Se muestra la primera vez y se guarda `ctd_tutorial_v1_done=1`.

---

## Diseño y paleta (Neuro/Canva)

* Paleta `BRAND` unificada (primarios azules/púrpura/teal/green, `slate` para texto, superficies claras, bordes suaves).
* Componentes reutilizables: `Card`, `GradientCard`, `SmallBtn`, `Badge`, `Section`.
* Efectos: sombras sutiles, *glass/frosted* en sticky, *chips* de navegación.
* **Tipografía**: `Apoka` por defecto.

---

## Estructura (simplificada)

```
contadito-fullstack/
├─ backend/
│  ├─ Controllers/
│  ├─ Data/
│  ├─ Domain/
│  └─ Program.cs, appsettings.*.json
└─ frontend/
   ├─ src/
   │  ├─ screens/ (todas las pantallas listadas)
   │  ├─ features/import/ (ExcelImport)
   │  ├─ providers/ (AuthContext)
   │  ├─ api.ts / api/
   │  └─ components/ (TutorialOverlay, etc.)
   └─ assets/
```

---

## Ejemplos de navegación rápida

* **Productos críticos** → `ProductsList` con filtro `lowStock`.
* **Cuentas por cobrar** → `ReceivablesList`.
* **Crear venta/compra** → `SaleCreate` / `PurchaseCreate`.
* **Tienda** → `StoreFront` (con `tenantId`).

---

## API backend (vista rápida)

* `GET /dashboard` → KPIs, actividad, alertas CxC, últimos productos.
* `GET /products?page=1&pageSize=20&q=...` → listado con búsqueda/paginación.
* Endpoints adicionales: auth, clientes, ventas, compras, almacenes, CxC.

> Usa `ASPNETCORE_ENVIRONMENT=Development` para habilitar configuración local de desarrollo.

---

## Troubleshooting

* **Android emulador**: usa `http://10.0.2.2` para apuntar al host.
* **Ollama**: verifica que el modelo esté descargado y el servidor corra en `11434`.
* **CORS/HTTPS**: en desarrollo, configurar orígenes permitidos en backend si accedes desde web.
* **Conflictos Git**: evita versionar `bin/` y `obj/`. Añade reglas en `.gitignore`.


---

**Desarrollado por PapuThink**
