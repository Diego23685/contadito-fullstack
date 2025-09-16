# Contadito Fullstack (Demo Ejecutable)
Incluye:
- Backend .NET 8 Web API (EFCore InMemory por defecto; opcional MySQL)
- Frontend Expo (React Native) con login y listado basico de productos

## Backend
Requisitos: .NET 8 SDK

```
cd backend
dotnet restore
dotnet run
```
Arranca en http://localhost:5000 (CORS abierto). Swagger en /swagger (modo Development). Con InMemory ya hay:
- Usuario: owner@demo.com / pass123
- 1 producto de demo

### MySQL (opcional)
Edita `appsettings.Development.json` con tu cadena y ejecuta:
```
dotnet run --environment Development
```

## Frontend
Requisitos: Node 18+, npm

```
cd frontend
npm i
npm run start
```
- Android emulador: `http://10.0.2.2:5000`
- iOS sim / Web: `http://127.0.0.1:5000`

## Probar
1) Login con `owner@demo.com / pass123`
2) Debe navegar a Home y hacer `GET /products` mostrando `Total de productos`.
