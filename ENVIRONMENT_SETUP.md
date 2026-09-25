# NextFit environment setup

This document lists variable names only. Keep real values out of version control.

## Backend local

1. Copy `Backend/backend/library/src/main/resources/application-local.example.properties` to the ignored `application-local.properties` if it is missing.
2. Provide variables through the shell, IDE run configuration, or deployment environment. Spring Boot does not load `.env` automatically.
3. Set `SPRING_PROFILES_ACTIVE=local`.
4. Run from `Backend/backend/library` with `./mvnw spring-boot:run` on Unix-like shells or `./mvnw.cmd spring-boot:run` on Windows.

Local variables: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, optional `SPRING_JPA_HIBERNATE_DDL_AUTO`, `JWT_SECRET`, `APP_CORS_ALLOWED_ORIGINS`, `APP_BASE_URL`, optional `EXERCISEDB_API_KEY`, and optional `CLOUDINARY_*`.

## Backend test

`src/test/resources/application.properties` activates the `test` profile. It uses an in-memory H2 database and safe test-only values. Run `./mvnw test` from `Backend/backend/library`.

## Web local

Create `Frontend/AplicacionFrontend/.env` from `.env.example` and set `VITE_API_URL` and `VITE_WS_URL` to the local backend URL. The Vite development proxy defaults to `http://localhost:8080` when `VITE_API_URL` is not set. Run `npm run dev` from `Frontend/AplicacionFrontend`.

For production builds, both `VITE_API_URL` and `VITE_WS_URL` are required at build time. Configure them in Vercel; they are public browser values and must never contain secrets.

## Mobile local

Create `Frontend_App/.env` from `.env.example` and set `EXPO_PUBLIC_API_BASE_URL`. Run `npm start` from `Frontend_App`.

Set the same public variable for EAS `development`, `preview`, and `production` environments. It must be configured before a build; the app has no production URL fallback.

## IoT simulator

Create `SimuladorIoT/.env` from `.env.example`, or export `NEXTFIT_API_BASE_URL`, `NEXTFIT_SIMULATOR_USERNAME`, and `NEXTFIT_SIMULATOR_PASSWORD` in the shell before starting the simulator. `NEXTFIT_API_BASE_URL` defaults only to the local backend URL.

## Production

Use `SPRING_PROFILES_ACTIVE=prod` for provider-neutral production deployments. Configure `PORT`, `JWT_SECRET`, `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `APP_CORS_ALLOWED_ORIGINS`, `APP_BASE_URL`, `EXERCISEDB_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the hosting platform.

`application-render.properties` remains available only for compatibility with an existing Render deployment. Migrate that deployment to the `prod` profile after its required environment variables have been configured and verified.
